import { env } from "../config/env.js";
import { normalizeIngredientName } from "../utils/normalizeIngredient.js";
import { normalizeUnit } from "../utils/unitConversion.js";

export class SpoonacularApiError extends Error {
  constructor(message, { statusCode = 502, spoonacularStatus = null, reason = "unknown", responseMessage = "", quota = null } = {}) {
    super(message);
    this.name = "SpoonacularApiError";
    this.statusCode = statusCode;
    this.spoonacularStatus = spoonacularStatus;
    this.reason = reason;
    this.responseMessage = responseMessage;
    this.quota = quota;
  }
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

function readQuotaHeaders(headers) {
  const readNumber = (...names) => {
    for (const name of names) {
      const value = headers.get(name);
      if (value === null) continue;
      const number = Number(value);
      if (Number.isFinite(number)) return number;
    }
    return null;
  };

  return {
    remaining: readNumber("x-api-quota-left", "x-ratelimit-remaining", "x-api-quota-remaining"),
    used: readNumber("x-api-quota-used", "x-ratelimit-used"),
    requestCost: readNumber("x-api-quota-request")
  };
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

  const quota = readQuotaHeaders(response.headers);
  const payload = await readSpoonacularPayload(response);
  if (!response.ok) {
    const reason = classifySpoonacularError(response.status, payload);
    const message = typeof payload === "string" ? payload : payload?.message || payload?.error || response.statusText;
    throw new SpoonacularApiError("Spoonacular request failed", {
      spoonacularStatus: response.status,
      reason,
      responseMessage: String(message || ""),
      quota
    });
  }

  assertSpoonacularShape(payload, expectedShape);
  return { payload, quota };
}

function compactStringList(values = []) {
  return [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];
}

export function mapSpoonacularRecipe(recipe) {
  const ingredients = (recipe.extendedIngredients || recipe.missedIngredients || recipe.usedIngredients || []).map((ingredient) => {
    const ingredientName = ingredient.nameClean || ingredient.name || ingredient.originalName || ingredient.original || "";
    const originalUnit = ingredient.unit || ingredient.measures?.metric?.unitShort || "";
    const amount = Number(ingredient.amount || ingredient.measures?.metric?.amount || 0);
    return {
      ingredientName,
      originalName: ingredient.originalName || ingredient.original || ingredientName,
      displayName: ingredientName,
      normalizedName: normalizeIngredientName(ingredientName),
      quantity: amount,
      amount,
      unit: normalizeUnit(originalUnit),
      originalUnit,
      standardAmount: amount,
      standardUnit: normalizeUnit(originalUnit),
      category: ingredient.aisle ? String(ingredient.aisle).toLowerCase() : "autres",
      aisle: ingredient.aisle || "",
      image: ingredient.image || "",
      sourceMetadata: {
        provider: "spoonacular",
        spoonacularId: ingredient.id || null,
        consistency: ingredient.consistency || "",
        original: ingredient.original || ""
      }
    };
  }).filter((ingredient) => ingredient.ingredientName);

  const nutrients = recipe.nutrition?.nutrients || [];
  const analyzedSteps = recipe.analyzedInstructions?.flatMap((block) => block.steps || []) || [];
  const instructions = analyzedSteps.map((step) => step.step).filter(Boolean);
  const requiredEquipments = compactStringList(analyzedSteps.flatMap((step) => (step.equipment || []).map((equipment) => equipment.name)));
  const readyInMinutes = Number(recipe.readyInMinutes || recipe.preparationMinutes || 20);
  const cookingTime = Number(recipe.cookingMinutes || Math.max(readyInMinutes - Number(recipe.preparationMinutes || 0), 0));
  const categories = compactStringList([...(recipe.dishTypes || []), ...(recipe.occasions || [])]);
  const tags = compactStringList([
    ...(recipe.veryPopular ? ["popular"] : []),
    ...(recipe.cheap ? ["budget"] : []),
    ...(recipe.sustainable ? ["sustainable"] : []),
    ...(recipe.healthScore ? [`health-score-${recipe.healthScore}`] : [])
  ]);

  return {
    source: "api",
    sourceProvider: "spoonacular",
    externalId: String(recipe.id),
    id: String(recipe.id),
    title: recipe.title,
    image: recipe.image || "https://images.unsplash.com/photo-1547592180-85f173990554",
    summary: recipe.summary || "",
    description: recipe.summary || recipe.instructions || "",
    ingredients,
    preparationTime: Number(recipe.preparationMinutes || readyInMinutes || 20),
    cookingTime,
    readyInMinutes,
    servings: Number(recipe.servings || 1),
    instructions: instructions.length ? instructions : String(recipe.instructions || "").split(".").map((step) => step.trim()).filter(Boolean),
    categories,
    diets: compactStringList(recipe.diets || []),
    cuisines: compactStringList(recipe.cuisines || []),
    tags,
    requiredEquipments,
    nutrition: {
      calories: readNutrient(nutrients, ["calories"]),
      protein: readNutrient(nutrients, ["protein"]),
      carbs: readNutrient(nutrients, ["carbohydrates"]),
      fat: readNutrient(nutrients, ["fat"]),
      fiber: readNutrient(nutrients, ["fiber"]),
      sugar: readNutrient(nutrients, ["sugar"]),
      sodium: readNutrient(nutrients, ["sodium"]),
      nutrients
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

  const categories = String(filters.category || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  if (categories.length) url.searchParams.set("type", categories[0]);
}

export async function fetchSpoonacularRecipeById(recipeId) {
  if (!env.spoonacularApiKey) return null;

  const url = new URL(`https://api.spoonacular.com/recipes/${recipeId}/information`);
  url.searchParams.set("apiKey", env.spoonacularApiKey);
  url.searchParams.set("includeNutrition", "true");

  const { payload } = await fetchSpoonacularJson(url, "detail");
  return mapSpoonacularRecipe(payload);
}

async function fetchSpoonacularRecipesByIds(recipeIds) {
  if (!env.spoonacularApiKey || !recipeIds.length) return [];

  const url = new URL("https://api.spoonacular.com/recipes/informationBulk");
  url.searchParams.set("apiKey", env.spoonacularApiKey);
  url.searchParams.set("ids", recipeIds.join(","));
  url.searchParams.set("includeNutrition", "true");

  const { payload } = await fetchSpoonacularJson(url, "bulk");
  return payload.map(mapSpoonacularRecipe);
}

export async function searchSpoonacularRecipes({ q, page = 1, limit = 12, filters = {}, inventoryMap } = {}) {
  if (!env.spoonacularApiKey) return { items: [], total: 0, page, limit, source: "api" };

  const currentPage = Number(page || 1);
  const currentLimit = Math.min(Number(limit || 12), 48);
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

  const { payload, quota } = await fetchSpoonacularJson(url, "catalog");
  const summaryItems = payload.results || [];
  const enrichedItems = await fetchSpoonacularRecipesByIds(summaryItems.map((recipe) => recipe.id).filter(Boolean));
  const items = enrichedItems.length === summaryItems.length ? enrichedItems : summaryItems.map(mapSpoonacularRecipe);

  const result = {
    items,
    total: payload.totalResults || 0,
    page: currentPage,
    limit: currentLimit,
    source: "api"
  };
  if (quota.remaining !== null || quota.used !== null || quota.requestCost !== null) result.quota = quota;
  return result;
}
