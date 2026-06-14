import { InventoryItem } from "../models/InventoryItem.js";
import { MealPlan } from "../models/MealPlan.js";
import { ShoppingList } from "../models/ShoppingList.js";
import { findOrCreateIngredient } from "./ingredientService.js";
import { getRecipeById } from "./recipeService.js";
import { subtractQuantities } from "../utils/unitConversion.js";

export async function generateShoppingList(user, weekStartDate) {
  const plans = await MealPlan.find({ userId: user._id, weekStartDate }).lean();
  const inventory = await InventoryItem.find({ userId: user._id }).populate("ingredientId").lean();
  const inventoryMap = new Map(inventory.map((item) => [item.ingredientId.normalizedName, item]));
  const needs = new Map();

  for (const plan of plans) {
    const recipe = await getRecipeById(plan.recipeId);
    if (!recipe) continue;
    const scale = plan.servings / recipe.servings;

    for (const ingredient of recipe.ingredients) {
      const quantity = Math.round(ingredient.quantity * scale * 100) / 100;
      const existing = needs.get(ingredient.normalizedName);
      if (existing && existing.unit === ingredient.unit) {
        existing.quantity += quantity;
      } else {
        needs.set(ingredient.normalizedName, {
          ingredientName: ingredient.ingredientName,
          normalizedName: ingredient.normalizedName,
          quantity,
          unit: ingredient.unit,
          category: ingredient.category
        });
      }
    }
  }

  const items = [...needs.values()]
    .map((need) => {
      const available = inventoryMap.get(need.normalizedName);
      return {
        ...need,
        quantity: subtractQuantities(need.quantity, need.unit, available?.quantity || 0, available?.unit || need.unit),
        checked: false
      };
    })
    .filter((item) => item.quantity > 0);

  return ShoppingList.findOneAndUpdate(
    { userId: user._id, weekStartDate },
    { userId: user._id, weekStartDate, items, isCompleted: false },
    { upsert: true, new: true }
  );
}

export async function addCheckedItemsToInventory(userId, shoppingListId) {
  const list = await ShoppingList.findOne({ _id: shoppingListId, userId });
  if (!list) {
    const error = new Error("Shopping list not found");
    error.statusCode = 404;
    throw error;
  }

  for (const item of list.items.filter((entry) => entry.checked)) {
    const ingredient = await findOrCreateIngredient({ name: item.ingredientName, category: item.category });
    await InventoryItem.findOneAndUpdate(
      { userId, ingredientId: ingredient._id, unit: item.unit },
      { $inc: { quantity: item.quantity }, $set: { expirationDate: undefined } },
      { upsert: true, new: true }
    );
  }

  list.isCompleted = list.items.every((item) => item.checked);
  await list.save();
  return list;
}
