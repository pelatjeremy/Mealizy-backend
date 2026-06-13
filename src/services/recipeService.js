import { demoRecipes } from "../data/demoRecipes.js";
import { InventoryItem } from "../models/InventoryItem.js";
import { Recipe } from "../models/Recipe.js";
import { subtractQuantities } from "../utils/unitConversion.js";

export async function listRecipes({ q }) {
  const query = q ? { title: { $regex: q, $options: "i" } } : {};
  const savedRecipes = await Recipe.find(query).limit(30).lean();
  const demo = demoRecipes.filter((recipe) => !q || recipe.title.toLowerCase().includes(q.toLowerCase()));
  return [...savedRecipes, ...demo];
}

export async function getRecipeById(recipeId) {
  if (String(recipeId).startsWith("demo-")) {
    return demoRecipes.find((recipe) => recipe.externalId === recipeId);
  }
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

  return recipes
    .map((recipe) => {
      const scale = user.householdSize / recipe.servings;
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
        missingIngredients,
        suggestionLevel: missingIngredients.length === 0 ? "complete" : `missing-${Math.min(missingIngredients.length, 4)}`
      };
    })
    .sort((a, b) => a.missingCount - b.missingCount || a.preparationTime - b.preparationTime);
}
