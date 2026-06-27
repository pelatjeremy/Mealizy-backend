import mongoose from "mongoose";
import { env } from "../config/env.js";
import { demoRecipes } from "../data/demoRecipes.js";
import { InventoryItem } from "../models/InventoryItem.js";
import { Recipe } from "../models/Recipe.js";
import { User } from "../models/User.js";
import { normalizeIngredientName } from "../utils/normalizeIngredient.js";
import { addQuantities, normalizeUnit, subtractQuantities } from "../utils/unitConversion.js";

const demoEmail = "demo@mealizy.app";
const coverageFilters = { 90: 90, 75: 75, 50: 50, 25: 25 };

export class SpoonacularApiError extends Error {
  constructor(message, { statusCode = 502, spoonacularStatus = null, reason = "unknown", responseMessage = "" } = {}) {
    super(message);
    this.name = "SpoonacularApiError";
    this.statusCode = statusCode;
    this.spoonacularStatus = spoonacularStatus;
    this.reason = reason;
    this.responseMessage = responseMessage;
  }
}

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

function readNutrient(nutrients = [], names) {
  const nutrient = nutrients.find((item) => names.includes(String(item.name).toLowerCase()));
  return nutrient ? Math.round(Number(nutrient.amount || 0)) : 0;
}

async function readSpoonacularPayload(response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function classifySpoonacularError(status, payload) {
  const message = typeof payload === "string" ? payload : payload?.message || payload?.error || "";
  const lowerMessage = String(message).toLowerCase();

  if (status === 401 || status === 403 || lowerMessage.includes("api key")) return "invalid_key";
  if (status === 402 || status === 429 || lowerMessage.includes("quota") || lowerMessage.includes("limit")) return "quota_exceeded";
  if (status >= 400 && status < 500) return "bad_request";
  if (status >= 500) return "spoonacular_unavailable";
  return "unknown";
}

function assertSpoonacularShape(payload, expectedShape) {
  if (payload === false) {
    throw new SpoonacularApiError("Spoonacular returned false", {
      reason: "unexpected_format",
      responseMessage: "false"
    });
  }

  if (expectedShape === "catalog" && (!payload || !Array.isArray(payload.results))) {
    throw new SpoonacularApiError("Spoonacular returned an unexpected catalog format", {
      reason: "unexpected_format",
      responseMessage: typeof payload
    });
  }

  if (expectedShape === "bulk" && !Array.isArray(payload)) {
    throw new SpoonacularApiError("Spoonacular returned an unexpected bulk format", {
      reason: "unexpected_format",
      responseMessage: typeof payload
    });
  }

  if (expectedShape === "detail" && (!payload || typeof payload !== "object" || !payload.id)) {
    throw new SpoonacularApiError("Spoonacular returned an unexpected recipe format", {
      reason: "unexpected_format",
      responseMessage: typeof payload
    });
  }
}

async function fetchSpoonacularJson(url, expectedShape) {
  let response;

  try {
    response = await fetch(url);
  } catch (error) {
    throw new SpoonacularApiError("Spoonacular network error", {
      reason: "network_error",
      responseMessage: error instanceof Error ? error.message : ""
    });
  }

  const payload = await readSpoonacularPayload(response);
  if (!response.ok) {
    const reason = classifySpoonacularError(response.status, payload);
    const message = typeof payload === "string" ? payload : payload?.message || payload?.error || response.statusText;
    throw new SpoonacularApiError("Spoonacular request failed", {
      spoonacularStatus: response.status,
      reason,
      responseMessage: String(message || "")
    });
  }

  assertSpoonacularShape(payload, expectedShape);
  return payload;
}

function mapSpoonacularRecipe(recipe) {
  const ingredients = (recipe.extendedIngredients || recipe.missedIngredients || recipe.usedIngredients || []).map((ingredient) => ({
    ingredientName: ingredient.nameClean || ingredient.name || ingredient.originalName || ingredient.original,
    normalizedName: normalizeIngredientName(ingredient.nameClean || ingredient.name || ingredient.originalName || ingredient.original),
    quantity: Number(ingredient.amount || 0),
    unit: normalizeUnit(ingredient.unit || ""),
    category: "autres"
  }));

  const nutrients = recipe.nutrition?.nutrients || [];
  const analyzedInstructions = recipe.analyzedInstructions?.flatMap((block) => block.steps || []) || [];
  const instructions = analyzedInstructions.map((step) => step.step).filter(Boolean);

  return {
    source: "api",
    externalId: String(recipe.id),
    id: String(recipe.id),
    title: recipe.title,
    image: recipe.image,
    ingredients,
    preparationTime: recipe.readyInMinutes || 20,
    servings: recipe.servings || 1,
    instructions,
    categories: recipe.dishTypes || [],
    diets: recipe.diets || [],
    requiredEquipments: [],
    nutrition: {
      calories: readNutrient(nutrients, ["calories"]),
      protein: readNutrient(nutrients, ["protein"]),
      carbs: readNutrient(nutrients, ["carbohydrates"]),
      fat: readNutrient(nutrients, ["fat"])
    }
  };
}

function applySpoonacularFilters(url, filters = {}) {
  if (filters.q) url.searchParams.set("query", filters.q);
  if (filters.maxCalories) url.searchParams.set("maxCalories", filters.maxCalories);
  if (filters.minProtein) url.searchParams.set("minProtein", filters.minProtein);
  if (filters.maxCarbs) url.searchParams.set("maxCarbs", filters.maxCarbs);
  if (filters.maxFat) url.searchParams.set("maxFat", filters.maxFat);
  if (filters.maxTime) url.searchParams.set("maxReadyTime", filters.maxTime);

  const categories = splitFilter(filters.category);
  if (categories.length) url.searchParams.set("type", categories[0]);
}

export async function fetchSpoonacularRecipeById(recipeId) {
  if (!env.spoonacularApiKey) return null;

  const url = new URL(`https://api.spoonacular.com/recipes/${recipeId}/information`);
  url.searchParams.set("apiKey", env.spoonacularApiKey);
  url.searchParams.set("includeNutrition", "true");

  try {
    return mapSpoonacularRecipe(await fetchSpoonacularJson(url, "detail"));
  } catch {
    return null;
  }
}

async function fetchSpoonacularRecipesByIds(recipeIds) {
  if (!env.spoonacularApiKey || !recipeIds.length) return [];

  const url = new URL("https://api.spoonacular.com/recipes/informationBulk");
  url.searchParams.set("apiKey", env.spoonacularApiKey);
  url.searchParams.set("ids", recipeIds.join(","));
  url.searchParams.set("includeNutrition", "true");

  try {
    return (await fetchSpoonacularJson(url, "bulk")).map(mapSpoonacularRecipe);
  } catch {
    return [];
  }
}

export async function searchSpoonacularRecipes({ q, page, limit, filters = {}, inventoryMap } = {}) {
  if (!env.spoonacularApiKey) return { items: [], total: 0, page: clampPage(page), limit: clampLimit(limit), source: "api" };

  const currentPage = clampPage(page);
  const currentLimit = clampLimit(limit);
  const url = new URL("https://api.spoonacular.com/recipes/complexSearch");
  url.searchParams.set("apiKey", env.spoonacularApiKey);
  url.searchParams.set("number", String(currentLimit));
  url.searchParams.set("offset", String((currentPage - 1) * currentLimit));
  url.searchParams.set("addRecipeInformation", "true");
  url.searchParams.set("addRecipeNutrition", "true");
  url.searchParams.set("fillIngredients", "true");
  applySpoonacularFilters(url, { ...filters, q });

  const includeIngredients = inventoryMap ? [...inventoryMap.keys()].slice(0, 20).join(",") : "";
  if (includeIngredients) url.searchParams.set("includeIngredients", includeIngredients);

  const payload = await fetchSpoonacularJson(url, "catalog");
  const summaryItems = payload.results || [];
  const enrichedItems = await fetchSpoonacularRecipesByIds(summaryItems.map((recipe) => recipe.id).filter(Boolean));
  const items = enrichedItems.length === summaryItems.length ? enrichedItems : summaryItems.map(mapSpoonacularRecipe);

  if (items.length) {
    const operations = items
      .filter((recipe) => recipe.externalId && recipe.title && recipe.image)
      .map((recipe) => ({
        updateOne: {
          filter: { source: "api", externalId: recipe.externalId },
          update: { $set: recipe },
          upsert: true
        }
      }));

    if (operations.length) await Recipe.bulkWrite(operations);
  }

  return {
    items,
    total: payload.totalResults || 0,
    page: currentPage,
    limit: currentLimit,
    source: "api"
  };
}

export async function getRecipeById(recipeId, source) {
  if (source === "api") {
    const cachedRecipe = await Recipe.findOne({ ...recipeIdQuery(recipeId), source: "api" }).lean();
    return cachedRecipe || fetchSpoonacularRecipeById(recipeId);
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
  const [apiCatalog, mealizyCatalog, userCatalog] = await Promise.all([
    searchSpoonacularRecipes({ q: filters.q, page: 1, limit: 24, filters, inventoryMap }).catch(() => ({
      items: [],
      total: 0,
      page: 1,
      limit: 24,
      source: "api"
    })),
    listRecipes({ source: "mealizy", limit: 24, filters }),
    listRecipes({ source: "mine", user, limit: 24, filters })
  ]);
  const recipes = [...userCatalog.items, ...mealizyCatalog.items, ...apiCatalog.items];

  return recipes
    .map((recipe) => compareRecipeWithInventory(recipe, inventoryMap, user))
    .filter((recipe) => filterScoredRecipe(recipe, filters))
    .sort((a, b) => b.score - a.score || b.coverage - a.coverage || a.preparationTime - b.preparationTime);
}
