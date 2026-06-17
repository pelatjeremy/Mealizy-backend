import { env } from "../config/env.js";
import { demoRecipes } from "../data/demoRecipes.js";
import { InventoryItem } from "../models/InventoryItem.js";
import { Recipe } from "../models/Recipe.js";
import { normalizeIngredientName } from "../utils/normalizeIngredient.js";
import { addQuantities, normalizeUnit, subtractQuantities } from "../utils/unitConversion.js";

const suggestionBuckets = ["complete", "missing1", "missing2", "missing3", "missingMore"];

export async function listRecipes({ q, userId } = {}) {
  const normalizedQuery = q ? normalizeIngredientName(q) : "";
  const userFilter = userId ? { $or: [{ userId }, { source: { $ne: "user" } }] } : { source: { $ne: "user" } };
  const savedRecipes = await Recipe.find(userFilter).sort({ updatedAt: -1 }).limit(normalizedQuery ? 100 : 30).lean();
  const matchesQuery = (recipe) => {
    if (!normalizedQuery) return true;
    const searchableText = [
      recipe.title,
      recipe.name,
      ...(recipe.ingredients || []).map((ingredient) => ingredient.ingredientName)
    ].filter(Boolean).join(" ");
    return normalizeIngredientName(searchableText).includes(normalizedQuery);
  };
  const demo = demoRecipes.filter(matchesQuery);
  return [...savedRecipes.filter(matchesQuery).slice(0, 30), ...demo];
}

export async function listUserRecipes(user) {
  return Recipe.find({ userId: user._id, source: "user" }).sort({ updatedAt: -1 }).lean();
}

async function fetchSpoonacularRecipeById(recipeId) {
  if (!env.spoonacularApiKey) return null;

  const url = new URL(`https://api.spoonacular.com/recipes/${recipeId}/information`);
  url.searchParams.set("apiKey", env.spoonacularApiKey);
  url.searchParams.set("includeNutrition", "true");

  const response = await fetch(url);
  if (!response.ok) return null;

  return mapSpoonacularRecipe(await response.json());
}

export async function getRecipeById(recipeId, source) {
  if (source === "api") return fetchSpoonacularRecipeById(recipeId);
  if (source === "demo" || String(recipeId).startsWith("demo-")) {
    return demoRecipes.find((recipe) => recipe.externalId === recipeId);
  }
  return Recipe.findById(recipeId).lean();
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

function readNutrient(nutrients = [], names) {
  const nutrient = nutrients.find((item) => names.includes(String(item.name).toLowerCase()));
  return nutrient ? Math.round(Number(nutrient.amount || 0)) : 0;
}

function mapSpoonacularRecipe(recipe) {
  const ingredients = (recipe.extendedIngredients || []).map((ingredient) => ({
    ingredientName: ingredient.nameClean || ingredient.name || ingredient.originalName,
    normalizedName: normalizeIngredientName(ingredient.nameClean || ingredient.name || ingredient.originalName),
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
    name: recipe.title,
    title: recipe.title,
    image: recipe.image,
    ingredients,
    preparationTime: recipe.readyInMinutes || 20,
    servings: recipe.servings || 1,
    instructions,
    nutrition: {
      calories: readNutrient(nutrients, ["calories"]),
      protein: readNutrient(nutrients, ["protein"]),
      carbs: readNutrient(nutrients, ["carbohydrates"]),
      fat: readNutrient(nutrients, ["fat"])
    }
  };
}

async function fetchSpoonacularRecipes(inventoryMap) {
  if (!env.spoonacularApiKey) return [];

  const includeIngredients = [...inventoryMap.keys()].slice(0, 20).join(",");
  const url = new URL("https://api.spoonacular.com/recipes/complexSearch");
  url.searchParams.set("apiKey", env.spoonacularApiKey);
  url.searchParams.set("number", "20");
  url.searchParams.set("addRecipeInformation", "true");
  url.searchParams.set("addRecipeNutrition", "true");
  url.searchParams.set("fillIngredients", "true");
  if (includeIngredients) url.searchParams.set("includeIngredients", includeIngredients);

  const response = await fetch(url);
  if (!response.ok) {
    const error = new Error("Spoonacular request failed");
    error.statusCode = 502;
    throw error;
  }

  const payload = await response.json();
  return (payload.results || []).map(mapSpoonacularRecipe);
}

function recipeBucket(missingCount) {
  if (missingCount === 0) return "complete";
  if (missingCount === 1) return "missing1";
  if (missingCount === 2) return "missing2";
  if (missingCount === 3) return "missing3";
  return "missingMore";
}

function compareRecipeWithInventory(recipe, inventoryMap, householdSize = 1) {
  const scale = Math.max(Number(householdSize || 1), 1) / Math.max(Number(recipe.servings || 1), 1);
  const comparedIngredients = (recipe.ingredients || [])
    .map((ingredient) => {
      const normalizedName = ingredient.normalizedName || normalizeIngredientName(ingredient.ingredientName);
      const requiredQuantity = Math.round(Number(ingredient.quantity || 0) * scale * 100) / 100;
      const inventoryItem = inventoryMap.get(normalizedName);
      const availableQuantity = inventoryItem?.quantity || 0;
      const availableUnit = inventoryItem?.unit || ingredient.unit;
      const missingQuantity = subtractQuantities(
        requiredQuantity,
        ingredient.unit,
        availableQuantity,
        availableUnit
      );

      return {
        ingredientName: ingredient.ingredientName,
        normalizedName,
        requiredQuantity,
        availableQuantity,
        isAvailable: missingQuantity <= 0,
        quantity: missingQuantity,
        unit: normalizeUnit(ingredient.unit),
        category: ingredient.category || "autres"
      };
    });

  const missingIngredients = comparedIngredients.filter((ingredient) => ingredient.quantity > 0);
  const availableIngredients = comparedIngredients.filter((ingredient) => ingredient.isAvailable);

  return {
    ...recipe,
    name: recipe.name || recipe.title,
    missingCount: missingIngredients.length,
    missingIngredients,
    availableIngredients
  };
}

export async function getRecipeSuggestions(user) {
  const inventoryMap = await getInventoryMap(user._id);
  const apiRecipes = await fetchSpoonacularRecipes(inventoryMap);
  const fallbackRecipes = apiRecipes.length ? [] : await listRecipes({});
  const recipes = [...apiRecipes, ...fallbackRecipes];

  return recipes
    .map((recipe) => compareRecipeWithInventory(recipe, inventoryMap, user.householdSize))
    .sort((a, b) => a.missingCount - b.missingCount || a.preparationTime - b.preparationTime)
    .reduce((groups, recipe) => {
      groups[recipeBucket(recipe.missingCount)].push(recipe);
      return groups;
    }, Object.fromEntries(suggestionBuckets.map((bucket) => [bucket, []])));
}
