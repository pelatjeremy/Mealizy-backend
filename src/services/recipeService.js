import { demoRecipes } from "../data/demoRecipes.js";
import { env } from "../config/env.js";
import { InventoryItem } from "../models/InventoryItem.js";
import { Recipe } from "../models/Recipe.js";
import { normalizeIngredientName } from "../utils/normalizeIngredient.js";
import { addQuantities, normalizeUnit, subtractQuantities } from "../utils/unitConversion.js";

const suggestionBuckets = ["complete", "missing1", "missing2", "missing3", "missingMore"];

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

export async function getRecipeSuggestions(user) {
  const inventoryMap = await getInventoryMap(user._id);
  const includeIngredients = [...inventoryMap.keys()].slice(0, 20).join(",");
  const apiRecipes = await searchSpoonacular(undefined, includeIngredients);
  const fallbackRecipes = apiRecipes.length ? [] : await listRecipes({});
  const userEquipments = new Set((user.availableEquipments || []).map((equipment) => String(equipment).toLowerCase()));

  return [...apiRecipes, ...fallbackRecipes]
    .map((recipe) => {
      const missingEquipments = (recipe.requiredEquipments || []).filter((equipment) => {
        return !userEquipments.has(String(equipment).toLowerCase());
      });
      return {
        ...compareRecipeWithInventory(recipe, inventoryMap, user.householdSize),
        missingEquipments,
        isCompatible: missingEquipments.length === 0
      };
    })
    .filter((recipe) => recipe.isCompatible)
    .sort((a, b) => a.missingCount - b.missingCount || a.preparationTime - b.preparationTime)
    .reduce((groups, recipe) => {
      groups[recipeBucket(recipe.missingCount)].push(recipe);
      return groups;
    }, Object.fromEntries(suggestionBuckets.map((bucket) => [bucket, []])));
}
