import { InventoryItem } from "../models/InventoryItem.js";
import { MealPlan } from "../models/MealPlan.js";
import { ShoppingList } from "../models/ShoppingList.js";
import { normalizeIngredientName } from "../utils/normalizeIngredient.js";
import { normalizeUnit } from "../utils/unitConversion.js";
import { findOrCreateIngredient } from "./ingredientService.js";
import { normalizeWeekStartDate } from "./mealPlanService.js";
import { getRecipeById } from "./recipeService.js";

const unitFamilies = {
  weight: { baseUnit: "g", factors: { g: 1, kg: 1000 } },
  volume: { baseUnit: "ml", factors: { ml: 1, l: 1000, tbsp: 14.7868, tsp: 4.92892 } },
  count: { baseUnit: null, factors: { unit: 1, slice: 1, can: 1, jar: 1 } }
};

function notFound(message) {
  const error = new Error(message);
  error.statusCode = 404;
  return error;
}

function badRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function findUnitFamily(unit) {
  const normalizedUnit = normalizeUnit(unit);
  const family = Object.values(unitFamilies).find((candidate) => candidate.factors[normalizedUnit]);
  return family ? { ...family, normalizedUnit } : null;
}

function toBaseQuantity(quantity, unit) {
  const family = findUnitFamily(unit);
  if (!family) return null;
  return Number(quantity || 0) * family.factors[family.normalizedUnit];
}

function roundQuantity(quantity) {
  return Math.round(Number(quantity || 0) * 100) / 100;
}

function mergeQuantity(target, quantity, unit) {
  const family = findUnitFamily(unit);
  const normalizedUnit = normalizeUnit(unit);
  const numericQuantity = Number(quantity || 0);

  if (family?.baseUnit) {
    const baseQuantity = toBaseQuantity(numericQuantity, unit);
    target.quantity += baseQuantity;
    target.unit = family.baseUnit;
    target.quantityUnit = family.baseUnit;
    return;
  }

  if (!target.quantityUnit) target.quantityUnit = normalizedUnit;
  if (target.quantityUnit === normalizedUnit) {
    target.quantity += numericQuantity;
  }
}

function buildNeedKey(normalizedName, unit) {
  const family = findUnitFamily(unit);
  return family?.baseUnit
    ? `${normalizedName}:${family.baseUnit}`
    : `${normalizedName}:${normalizeUnit(unit)}`;
}

function serializeNeed(need, checked = false) {
  return {
    ingredientName: need.ingredientName,
    normalizedName: need.normalizedName,
    quantity: roundQuantity(need.quantity),
    unit: need.unit,
    category: need.category || "autres",
    checked
  };
}

function toInventoryUnit(unit) {
  return normalizeUnit(unit);
}

function previousCheckedMap(existingList) {
  return new Map(
    (existingList?.items || [])
      .filter((item) => item.checked)
      .map((item) => [buildNeedKey(item.normalizedName, item.unit), true])
  );
}

async function getPlannedNeeds(user, weekStartDate) {
  const plans = await MealPlan.find({ userId: user._id, weekStartDate }).lean();
  const needs = new Map();

  for (const plan of plans) {
    const recipe = await getRecipeById(plan.recipeId, plan.recipeSource);
    if (!recipe) continue;

    const recipeServings = Math.max(Number(recipe.servings || 1), 1);
    const plannedServings = Math.max(Number(plan.servings || recipeServings), 1);
    const scale = plannedServings / recipeServings;

    for (const ingredient of recipe.ingredients || []) {
      const ingredientName = ingredient.ingredientName || ingredient.name;
      if (!ingredientName) continue;

      const normalizedName = normalizeIngredientName(ingredientName);
      const unit = ingredient.unit || "unit";
      const key = buildNeedKey(normalizedName, unit);
      const existing = needs.get(key);

      if (!existing) {
        needs.set(key, {
          ingredientName,
          normalizedName,
          quantity: 0,
          unit,
          quantityUnit: null,
          category: ingredient.category || "autres"
        });
      }

      mergeQuantity(needs.get(key), Number(ingredient.quantity || 0) * scale, unit);
    }
  }

  return needs;
}

async function subtractInventory(userId, needs) {
  const inventory = await InventoryItem.find({ userId }).populate("ingredientId").lean();

  for (const item of inventory) {
    const normalizedName = item.normalizedName || item.ingredientId?.normalizedName;
    if (!normalizedName) continue;

    for (const need of needs.values()) {
      if (need.normalizedName !== normalizedName || need.quantity <= 0) continue;

      const needFamily = findUnitFamily(need.unit);
      const itemFamily = findUnitFamily(item.unit);
      const sameBaseFamily = needFamily?.baseUnit && itemFamily?.baseUnit && needFamily.baseUnit === itemFamily.baseUnit;
      const sameUnit = normalizeUnit(need.unit) === normalizeUnit(item.unit);

      if (sameBaseFamily) {
        need.quantity = Math.max(need.quantity - toBaseQuantity(item.quantity, item.unit), 0);
      } else if (sameUnit) {
        need.quantity = Math.max(need.quantity - Number(item.quantity || 0), 0);
      }
    }
  }
}

export async function getShoppingListForWeek(user, week) {
  const weekStartDate = normalizeWeekStartDate(week);
  return ShoppingList.findOne({ userId: user._id, weekStartDate });
}

export async function generateShoppingList(user, week) {
  const weekStartDate = normalizeWeekStartDate(week);
  const existingList = await ShoppingList.findOne({ userId: user._id, weekStartDate });
  const checkedMap = previousCheckedMap(existingList);
  const needs = await getPlannedNeeds(user, weekStartDate);

  await subtractInventory(user._id, needs);

  const items = [...needs.values()]
    .filter((need) => roundQuantity(need.quantity) > 0)
    .map((need) => serializeNeed(need, checkedMap.get(buildNeedKey(need.normalizedName, need.unit)) || false))
    .sort((a, b) => a.category.localeCompare(b.category) || a.ingredientName.localeCompare(b.ingredientName));

  return ShoppingList.findOneAndUpdate(
    { userId: user._id, weekStartDate },
    {
      userId: user._id,
      weekStartDate,
      items,
      generatedAt: new Date(),
      isCompleted: items.length > 0 && items.every((item) => item.checked)
    },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  );
}

export async function setShoppingListItemChecked(userId, itemId, checked) {
  if (typeof checked !== "boolean") throw badRequest("checked must be a boolean");

  const list = await ShoppingList.findOne({ userId, "items._id": itemId });
  if (!list) throw notFound("Shopping list item not found");

  const item = list.items.id(itemId);
  item.checked = checked;
  list.isCompleted = list.items.length > 0 && list.items.every((entry) => entry.checked);
  await list.save();
  return list;
}

export async function addShoppingListItemToInventory(userId, itemId) {
  const list = await ShoppingList.findOne({ userId, "items._id": itemId });
  if (!list) throw notFound("Shopping list item not found");

  const item = list.items.id(itemId);
  const ingredient = await findOrCreateIngredient({ name: item.ingredientName, category: item.category });

  await InventoryItem.findOneAndUpdate(
    { userId, ingredientId: ingredient._id, unit: toInventoryUnit(item.unit) },
    {
      $inc: { quantity: item.quantity },
      $set: { normalizedName: ingredient.normalizedName }
    },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  );

  item.checked = true;
  list.isCompleted = list.items.length > 0 && list.items.every((entry) => entry.checked);
  await list.save();
  return list;
}

export async function addCheckedItemsToInventory(userId, shoppingListId) {
  const list = await ShoppingList.findOne({ _id: shoppingListId, userId });
  if (!list) throw notFound("Shopping list not found");

  for (const item of list.items.filter((entry) => entry.checked)) {
    await addShoppingListItemToInventory(userId, item._id);
  }

  return ShoppingList.findOne({ _id: shoppingListId, userId });
}
