import mongoose from "mongoose";
import { demoRecipes } from "../data/demoRecipes.js";
import { InventoryItem } from "../models/InventoryItem.js";
import { Recipe } from "../models/Recipe.js";
import { User } from "../models/User.js";
import {
  fetchSpoonacularRecipeById,
  SpoonacularApiError
} from "./spoonacularService.js";
import { normalizeRecipeIngredient } from "./ingredientMatcher.js";
import { normalizeIngredientName } from "../utils/normalizeIngredient.js";
import { addQuantities, normalizeUnit, subtractQuantities } from "../utils/unitConversion.js";

const demoEmail = "demo@mealizy.app";
const coverageFilters = { 90: 90, 75: 75, 50: 50, 25: 25 };

export { SpoonacularApiError };

function clampPage(value) {
  const page = Number(value || 1);
  return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
}

function clampLimit(value) {
  const limit = Number(value || 12);
  return Math.min(Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 12, 48);
}

function textFilter(q) {
  return q ? { title: { $regex: String(q).trim(), $options: "i" } } : {};
}

function parseNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function splitFilter(value) {
  if (!value) return [];
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function applyMongoFilters(query, filters = {}) {
  const categories = splitFilter(filters.category);
  if (categories.length) {
    query.$or = [
      ...(query.$or || []),
      { categories: { $in: categories } },
      { diets: { $in: categories } },
      { "ingredients.category": { $in: categories } }
    ];
  }

  const maxCalories = parseNumber(filters.maxCalories);
  if (maxCalories !== null) query["nutrition.calories"] = { $lte: maxCalories };

  const minProtein = parseNumber(filters.minProtein);
  if (minProtein !== null) query["nutrition.protein"] = { $gte: minProtein };

  const maxCarbs = parseNumber(filters.maxCarbs);
  if (maxCarbs !== null) query["nutrition.carbs"] = { $lte: maxCarbs };

  const maxFat = parseNumber(filters.maxFat);
  if (maxFat !== null) query["nutrition.fat"] = { $lte: maxFat };

  const maxTime = parseNumber(filters.maxTime);
  if (maxTime !== null) query.preparationTime = { $lte: maxTime };

  const maxIngredients = parseNumber(filters.maxIngredients);
  if (maxIngredients !== null) query.$expr = { $lte: [{ $size: "$ingredients" }, maxIngredients] };

  return query;
}

async function getDemoUser() {
  return User.findOne({ email: demoEmail }).lean();
}

function recipeIdQuery(recipeId) {
  if (mongoose.Types.ObjectId.isValid(recipeId)) return { _id: recipeId };
  return { externalId: recipeId };
}

export async function listRecipes({ q, page, limit, source = "all", user, filters = {} }) {
  const currentPage = clampPage(page);
  const currentLimit = clampLimit(limit);
  const skip = (currentPage - 1) * currentLimit;
  const query = applyMongoFilters(textFilter(q), filters);

  if (source === "mine") {
    if (!user?._id) return { items: [], total: 0, page: currentPage, limit: currentLimit, source };
    query.userId = user._id;
    query.source = "user";
  }

  if (source === "mealizy") {
    const demoUser = await getDemoUser();
    if (!demoUser) return { items: [], total: 0, page: currentPage, limit: currentLimit, source };
    query.userId = demoUser._id;
    query.source = "user";
  }

  if (source === "api") {
    query.sourceProvider = "spoonacular";
  }

  if (source === "user") query.source = "user";

  const [items, total] = await Promise.all([
    Recipe.find(query).sort({ createdAt: -1, title: 1 }).skip(skip).limit(currentLimit).lean(),
    Recipe.countDocuments(query)
  ]);

  return { items, total, page: currentPage, limit: currentLimit, source };
}

export async function searchRecipesLegacy({ q }) {
  const catalog = await listRecipes({ q, limit: 30, source: "all" });
  return catalog.items;
}

function importedRecipeQuery(externalId) {
  return { sourceProvider: "spoonacular", externalId: String(externalId) };
}

function withImportStatus(recipe, importedByExternalId) {
  const externalId = recipe.externalId ? String(recipe.externalId) : "";
  const imported = externalId ? importedByExternalId.get(externalId) : null;

  if (imported) {
    return {
      ...recipe,
      isImported: true,
      importedRecipeId: String(imported._id),
      mealizyRecipeId: String(imported._id)
    };
  }

  return {
    ...recipe,
    isImported: Boolean(recipe._id),
    importedRecipeId: recipe._id ? String(recipe._id) : undefined,
    mealizyRecipeId: recipe._id ? String(recipe._id) : undefined
  };
}

async function readImportedSpoonacularMap(recipes) {
  const externalIds = [...new Set(recipes.map((recipe) => recipe.externalId).filter(Boolean).map(String))];
  if (!externalIds.length) return new Map();

  const importedRecipes = await Recipe.find({ sourceProvider: "spoonacular", externalId: { $in: externalIds } }).lean();
  return importedRecipes.reduce((map, recipe) => map.set(String(recipe.externalId), recipe), new Map());
}

export async function searchRecipeLibrary({ q, page, limit, source = "all", user, filters = {} }) {
  const currentPage = clampPage(page);
  const currentLimit = clampLimit(limit);
  const storedCatalog = await listRecipes({ q, page: currentPage, limit: currentLimit, source, user, filters });
  return {
    ...storedCatalog,
    items: storedCatalog.items.map((recipe) => withImportStatus(recipe, new Map()))
  };
}

export async function importSpoonacularRecipe(recipeId, user) {
  const externalId = String(recipeId || "").trim();
  if (!externalId) {
    const error = new Error("Recipe id is required");
    error.statusCode = 400;
    throw error;
  }

  const importedRecipe = await fetchSpoonacularRecipeById(externalId);
  if (!importedRecipe) {
    const error = new Error("Recipe not found on Spoonacular");
    error.statusCode = 404;
    throw error;
  }

  const normalizedIngredients = await Promise.all(
    (importedRecipe.ingredients || []).map((ingredient) => normalizeRecipeIngredient(ingredient))
  );

  const recipe = await Recipe.findOneAndUpdate(
    importedRecipeQuery(externalId),
    {
      $set: {
        ...importedRecipe,
        source: "api",
        sourceProvider: "spoonacular",
        externalId,
        ingredients: normalizedIngredients,
        importedBy: user?._id,
        updatedAt: new Date()
      },
      $setOnInsert: {
        importedAt: new Date()
      }
    },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  ).lean();

  return withImportStatus(recipe, new Map([[externalId, recipe]]));
}

export async function getRecipeById(recipeId, source) {
  if (source === "api") {
    return Recipe.findOne({ ...recipeIdQuery(recipeId), sourceProvider: "spoonacular" }).lean();
  }

  const storedRecipe = await Recipe.findOne(recipeIdQuery(recipeId)).lean();
  if (storedRecipe) return storedRecipe;

  if (source === "demo" || String(recipeId).startsWith("demo-")) {
    return demoRecipes.find((recipe) => recipe.externalId === recipeId);
  }

  return null;
}

async function getInventoryMap(userId) {
  const inventory = await InventoryItem.find({ userId }).populate("ingredientId").lean();

  return inventory.reduce((map, item) => {
    const normalizedName = item.normalizedName || item.ingredientId?.normalizedName;
    if (!normalizedName) return map;

    const existing = map.get(normalizedName);
    if (!existing) {
      map.set(normalizedName, {
        quantity: item.quantity,
        unit: normalizeUnit(item.unit),
        normalizedName
      });
      return map;
    }

    existing.quantity = addQuantities(existing.quantity, existing.unit, item.quantity, item.unit);
    return map;
  }, new Map());
}

function equipmentScore(recipe, user) {
  const required = recipe.requiredEquipments || [];
  if (!required.length) return 8;
  const available = new Set(user.availableEquipments || []);
  const matches = required.filter((equipment) => available.has(equipment)).length;
  return Math.round((matches / required.length) * 8);
}

function preferenceScore(recipe, user) {
  const preferences = new Set(user.dietaryPreferences || []);
  const allergies = (user.allergies || []).map(normalizeIngredientName);
  const recipeLabels = new Set([...(recipe.categories || []), ...(recipe.diets || [])]);
  const blocked = allergies.some((allergy) => (recipe.ingredients || []).some((ingredient) => ingredient.normalizedName === allergy));
  if (blocked) return -50;
  if (!preferences.size) return 5;
  return [...preferences].some((preference) => recipeLabels.has(preference)) ? 10 : 0;
}

function nutritionScore(recipe) {
  const calories = Number(recipe.nutrition?.calories || 0);
  const protein = Number(recipe.nutrition?.protein || 0);
  let score = 0;
  if (calories > 0 && calories <= 750) score += 4;
  if (protein >= 15) score += 4;
  return score;
}

function compareRecipeWithInventory(recipe, inventoryMap, user) {
  const ingredients = recipe.ingredients || [];
  const scale = Math.max(Number(user.householdSize || 1), 1) / Math.max(Number(recipe.servings || 1), 1);
  const missingIngredients = [];
  let availableCount = 0;

  for (const ingredient of ingredients) {
    const normalizedName = ingredient.normalizedName || normalizeIngredientName(ingredient.ingredientName);
    const requiredQuantity = Math.round(Number(ingredient.quantity || 0) * scale * 100) / 100;
    const inventoryItem = inventoryMap.get(normalizedName);
    const availableQuantity = inventoryItem?.quantity || 0;
    const availableUnit = inventoryItem?.unit || ingredient.unit;
    const missingQuantity = subtractQuantities(requiredQuantity, ingredient.unit, availableQuantity, availableUnit);

    if (missingQuantity > 0) {
      missingIngredients.push({
        ingredientName: ingredient.ingredientName,
        normalizedName,
        quantity: missingQuantity,
        unit: normalizeUnit(ingredient.unit),
        category: ingredient.category || "autres"
      });
    } else {
      availableCount += 1;
    }
  }

  const ingredientCount = ingredients.length || 1;
  const coverage = Math.round((availableCount / ingredientCount) * 100);
  const score = Math.max(
    0,
    Math.round(coverage * 0.78 + nutritionScore(recipe) + preferenceScore(recipe, user) + equipmentScore(recipe, user))
  );

  return {
    ...recipe,
    name: recipe.name || recipe.title,
    score,
    coverage,
    availableIngredientCount: availableCount,
    missingCount: missingIngredients.length,
    missingIngredients
  };
}

function filterScoredRecipe(recipe, filters = {}) {
  const minCoverage = coverageFilters[Number(filters.coverage)] || 0;
  if (minCoverage && Number(recipe.coverage || 0) < minCoverage) return false;

  const maxIngredients = parseNumber(filters.maxIngredients);
  if (maxIngredients !== null && (recipe.ingredients || []).length > maxIngredients) return false;

  return true;
}

export async function getRecipeSuggestions(user, filters = {}) {
  const inventoryMap = await getInventoryMap(user._id);
  const [syncedCatalog, mealizyCatalog, userCatalog] = await Promise.all([
    listRecipes({ q: filters.q, source: "api", limit: 24, filters }),
    listRecipes({ source: "mealizy", limit: 24, filters }),
    listRecipes({ source: "mine", user, limit: 24, filters })
  ]);
  const recipes = [...userCatalog.items, ...mealizyCatalog.items, ...syncedCatalog.items];

  return recipes
    .map((recipe) => compareRecipeWithInventory(recipe, inventoryMap, user))
    .filter((recipe) => filterScoredRecipe(recipe, filters))
    .sort((a, b) => b.score - a.score || b.coverage - a.coverage || a.preparationTime - b.preparationTime);
}
