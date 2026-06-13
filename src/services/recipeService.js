import { demoRecipes } from "../data/demoRecipes.js";
import { env } from "../config/env.js";
import { InventoryItem } from "../models/InventoryItem.js";
import { Recipe } from "../models/Recipe.js";
import { normalizeIngredientName } from "../utils/normalizeIngredient.js";
import { addQuantities, normalizeUnit, subtractQuantities } from "../utils/unitConversion.js";

const suggestionBuckets = ["complete", "missing1", "missing2", "missing3", "missingMore"];

const spoonacularIngredientNames = new Map([
  ["tomate", "tomato"],
  ["pate", "pasta"],
  ["viande hachee", "ground beef"],
  ["lait", "milk"],
  ["oeuf", "egg"]
]);

function debugSuggestions(message, payload) {
  if (process.env.NODE_ENV === "production") return;
  console.debug(`[suggestions] ${message}`, payload);
}

function readNutrient(nutrients = [], names) {
  const nutrient = nutrients.find((item) => names.includes(String(item.name).toLowerCase()));
  return nutrient ? Math.round(Number(nutrient.amount || 0)) : 0;
}

function mapSpoonacularRecipe(recipe) {
  const nutrients = recipe.nutrition?.nutrients || [];
  const instructions = recipe.analyzedInstructions || [];

  return {
    source: "api",
    externalId: String(recipe.id),
    name: recipe.title,
    title: recipe.title,
    image: recipe.image,
    preparationTime: recipe.readyInMinutes || 30,
    servings: recipe.servings || 2,
    instructions: instructions.flatMap((instruction) => instruction.steps?.map((step) => step.step) || []),
    requiredEquipments: [
      ...new Set(instructions.flatMap((instruction) => {
        return instruction.steps?.flatMap((step) => step.equipment?.map((equipment) => equipment.name) || []) || [];
      }))
    ],
    nutrition: {
      calories: readNutrient(nutrients, ["calories"]),
      protein: readNutrient(nutrients, ["protein"]),
      carbs: readNutrient(nutrients, ["carbohydrates"]),
      fat: readNutrient(nutrients, ["fat"]),
      vitamins: {}
    },
    ingredients: (recipe.extendedIngredients || []).map((ingredient) => {
      const ingredientName = ingredient.nameClean || ingredient.name || ingredient.originalName;
      return {
        ingredientName,
        normalizedName: normalizeIngredientName(ingredientName),
        quantity: Number(ingredient.measures?.metric?.amount || ingredient.amount || 1),
        unit: normalizeUnit(ingredient.measures?.metric?.unitShort || ingredient.unit || "unit"),
        category: "autres"
      };
    })
  };
}

async function fetchSpoonacularJson(url) {
  const response = await fetch(url);
  if (!response.ok) return null;
  return response.json();
}

async function searchSpoonacular(q, includeIngredients = "") {
  if (!env.spoonacularApiKey) return [];

  const params = new URLSearchParams({
    apiKey: env.spoonacularApiKey,
    addRecipeInformation: "true",
    fillIngredients: "true",
    addRecipeNutrition: "true",
    number: "20"
  });
  if (q) params.set("query", q);
  if (includeIngredients) params.set("includeIngredients", includeIngredients);

  try {
    const response = await fetch(`https://api.spoonacular.com/recipes/complexSearch?${params.toString()}`);
    if (!response.ok) return [];
    const payload = await response.json();
    return (payload.results || []).map(mapSpoonacularRecipe);
  } catch {
    return [];
  }
}

async function findSpoonacularByIngredients(includeIngredients = "") {
  if (!env.spoonacularApiKey || !includeIngredients) return [];

  const params = new URLSearchParams({
    apiKey: env.spoonacularApiKey,
    ingredients: includeIngredients,
    number: "20",
    ranking: "2",
    ignorePantry: "true"
  });

  try {
    const matches = await fetchSpoonacularJson(`https://api.spoonacular.com/recipes/findByIngredients?${params.toString()}`);
    if (!Array.isArray(matches) || matches.length === 0) return [];

    const detailedRecipes = await Promise.all(matches.map(async (match) => {
      const detailParams = new URLSearchParams({
        apiKey: env.spoonacularApiKey,
        includeNutrition: "true"
      });
      return fetchSpoonacularJson(`https://api.spoonacular.com/recipes/${match.id}/information?${detailParams.toString()}`);
    }));

    return detailedRecipes.filter(Boolean).map(mapSpoonacularRecipe);
  } catch {
    return [];
  }
}

async function getSpoonacularRecipeById(recipeId) {
  if (!env.spoonacularApiKey || !/^\d+$/.test(String(recipeId))) return null;

  const params = new URLSearchParams({
    apiKey: env.spoonacularApiKey,
    includeNutrition: "true"
  });

  try {
    const response = await fetch(`https://api.spoonacular.com/recipes/${recipeId}/information?${params.toString()}`);
    if (!response.ok) return null;
    return mapSpoonacularRecipe(await response.json());
  } catch {
    return null;
  }
}

export async function listRecipes({ q } = {}) {
  const query = q ? { title: { $regex: q, $options: "i" } } : {};
  const [savedRecipes, apiRecipes] = await Promise.all([
    Recipe.find(query).limit(30).lean(),
    searchSpoonacular(q)
  ]);
  const demo = demoRecipes
    .filter((recipe) => !q || recipe.title.toLowerCase().includes(q.toLowerCase()))
    .map((recipe) => ({ ...recipe, isDemo: true }));

  return [...savedRecipes, ...apiRecipes, ...(apiRecipes.length ? [] : demo)];
}

export async function getRecipeById(recipeId) {
  if (String(recipeId).startsWith("demo-")) {
    return demoRecipes.find((recipe) => recipe.externalId === recipeId);
  }
  const spoonacularRecipe = await getSpoonacularRecipeById(recipeId);
  if (spoonacularRecipe) return spoonacularRecipe;
  return Recipe.findById(recipeId).lean();
}

async function getInventoryMap(userId) {
  const inventory = await InventoryItem.find({ userId }).populate("ingredientId").lean();

  const map = inventory.reduce((map, item) => {
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

  return { inventoryMap: map, inventoryItemCount: inventory.length };
}

async function getSavedSuggestionRecipes(userId) {
  return Recipe.find({
    $or: [
      { userId },
      { userId: { $exists: false } },
      { userId: null }
    ]
  }).limit(50).lean();
}

function getSpoonacularIncludeIngredients(inventoryMap) {
  return [...inventoryMap.keys()]
    .slice(0, 20)
    .map((name) => spoonacularIngredientNames.get(name) || name)
    .join(",");
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
  const missingIngredients = recipe.ingredients
    .map((ingredient) => {
      const normalizedName = ingredient.normalizedName || normalizeIngredientName(ingredient.ingredientName);
      const requiredQuantity = Math.round(Number(ingredient.quantity || 0) * scale * 100) / 100;
      const inventoryItem = inventoryMap.get(normalizedName);
      const availableQuantity = inventoryItem?.quantity || 0;
      const availableUnit = inventoryItem?.unit || ingredient.unit;
      const missingQuantity = subtractQuantities(requiredQuantity, ingredient.unit, availableQuantity, availableUnit);

      return {
        ingredientName: ingredient.ingredientName,
        normalizedName,
        quantity: missingQuantity,
        unit: normalizeUnit(ingredient.unit),
        category: ingredient.category || "autres"
      };
    })
    .filter((ingredient) => ingredient.quantity > 0);

  return {
    ...recipe,
    name: recipe.name || recipe.title,
    missingCount: missingIngredients.length,
    missingIngredients,
    suggestionLevel: recipeBucket(missingIngredients.length)
  };
}

function emptySuggestionGroups() {
  return Object.fromEntries(suggestionBuckets.map((bucket) => [bucket, []]));
}

function dedupeRecipes(recipes) {
  const seen = new Set();
  return recipes.filter((recipe) => {
    const key = `${recipe.source || "recipe"}:${recipe.externalId || recipe._id || recipe.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function getRecipeSuggestions(user) {
  const { inventoryMap, inventoryItemCount } = await getInventoryMap(user._id);
  const includeIngredients = getSpoonacularIncludeIngredients(inventoryMap);
  const [savedRecipes, apiRecipes] = await Promise.all([
    getSavedSuggestionRecipes(user._id),
    findSpoonacularByIngredients(includeIngredients)
  ]);
  const shouldIncludeDemoRecipes = process.env.NODE_ENV !== "production" || (savedRecipes.length === 0 && apiRecipes.length === 0);
  const demoSuggestionRecipes = shouldIncludeDemoRecipes ? demoRecipes.map((recipe) => ({ ...recipe, isDemo: true })) : [];
  const sourceRecipes = dedupeRecipes([...savedRecipes, ...apiRecipes, ...demoSuggestionRecipes]);

  const groups = sourceRecipes
    .map((recipe) => compareRecipeWithInventory(recipe, inventoryMap, user.householdSize))
    .sort((a, b) => a.missingCount - b.missingCount || a.preparationTime - b.preparationTime)
    .reduce((groups, recipe) => {
      groups[recipeBucket(recipe.missingCount)].push(recipe);
      return groups;
    }, emptySuggestionGroups());

  groups.missingMore = groups.missingMore
    .sort((a, b) => a.missingCount - b.missingCount || a.preparationTime - b.preparationTime)
    .slice(0, 6);

  debugSuggestions("summary", {
    inventoryItems: inventoryItemCount,
    uniqueIngredients: inventoryMap.size,
    recipesFetched: sourceRecipes.length,
    sources: {
      saved: savedRecipes.length,
      spoonacular: apiRecipes.length,
      demo: demoSuggestionRecipes.length
    },
    buckets: Object.fromEntries(suggestionBuckets.map((bucket) => [bucket, groups[bucket].length]))
  });

  return groups;
}
