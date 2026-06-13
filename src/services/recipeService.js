import { demoRecipes } from "../data/demoRecipes.js";
import { env } from "../config/env.js";
import { InventoryItem } from "../models/InventoryItem.js";
import { Recipe } from "../models/Recipe.js";
import { normalizeIngredientName } from "../utils/normalizeIngredient.js";
import { subtractQuantities } from "../utils/unitConversion.js";

function mapSpoonacularRecipe(recipe) {
  const nutrients = recipe.nutrition?.nutrients || [];
  const nutrientValue = (name) => nutrients.find((item) => item.name === name)?.amount || 0;
  const instructions = recipe.analyzedInstructions || [];

  return {
    source: "api",
    externalId: String(recipe.id),
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
      calories: Math.round(nutrientValue("Calories")),
      protein: Math.round(nutrientValue("Protein")),
      carbs: Math.round(nutrientValue("Carbohydrates")),
      fat: Math.round(nutrientValue("Fat")),
      vitamins: {}
    },
    ingredients: (recipe.extendedIngredients || []).map((ingredient) => {
      const ingredientName = ingredient.nameClean || ingredient.name;
      return {
        ingredientName,
        normalizedName: normalizeIngredientName(ingredientName),
        quantity: ingredient.measures?.metric?.amount || ingredient.amount || 1,
        unit: ingredient.measures?.metric?.unitShort || ingredient.unit || "unité",
        category: "autres"
      };
    })
  };
}

async function searchSpoonacular(q) {
  if (!env.spoonacularApiKey) return [];

  const params = new URLSearchParams({
    apiKey: env.spoonacularApiKey,
    addRecipeInformation: "true",
    fillIngredients: "true",
    addRecipeNutrition: "true",
    number: "12"
  });
  if (q) params.set("query", q);

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
    map.set(item.ingredientId.normalizedName, item);
    return map;
  }, new Map());
}

export async function getRecipeSuggestions(user) {
  const inventoryMap = await getInventoryMap(user._id);
  const recipes = await listRecipes({});
  const userEquipments = new Set((user.availableEquipments || []).map((equipment) => String(equipment).toLowerCase()));

  return recipes
    .map((recipe) => {
      const scale = user.householdSize / recipe.servings;
      const missingEquipments = (recipe.requiredEquipments || []).filter((equipment) => {
        return !userEquipments.has(String(equipment).toLowerCase());
      });
      const missingIngredients = recipe.ingredients
        .map((ingredient) => {
          const requiredQuantity = Math.round(ingredient.quantity * scale * 100) / 100;
          const inventoryItem = inventoryMap.get(ingredient.normalizedName);
          const availableQuantity = inventoryItem?.quantity || 0;
          const availableUnit = inventoryItem?.unit || ingredient.unit;
          const missingQuantity = subtractQuantities(requiredQuantity, ingredient.unit, availableQuantity, availableUnit);

          return {
            ingredientName: ingredient.ingredientName,
            normalizedName: ingredient.normalizedName,
            quantity: missingQuantity,
            unit: ingredient.unit,
            category: ingredient.category
          };
        })
        .filter((ingredient) => ingredient.quantity > 0);

      return {
        ...recipe,
        missingCount: missingIngredients.length,
        missingEquipments,
        isCompatible: missingEquipments.length === 0,
        missingIngredients,
        suggestionLevel: missingIngredients.length === 0 ? "complete" : `missing-${Math.min(missingIngredients.length, 4)}`
      };
    })
    .filter((recipe) => recipe.isCompatible)
    .sort((a, b) => a.missingCount - b.missingCount || a.preparationTime - b.preparationTime);
}
