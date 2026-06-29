import mongoose from "mongoose";
import { ingredientUnits } from "../data/catalogUnits.js";
import { InventoryItem } from "../models/InventoryItem.js";
import { MealPlan } from "../models/MealPlan.js";
import { ShoppingList } from "../models/ShoppingList.js";
import { normalizeIngredientName } from "../utils/normalizeIngredient.js";
import { normalizeUnit } from "../utils/unitConversion.js";
import { findOrCreateIngredient } from "./ingredientService.js";
import { normalizeWeekStartDate } from "./mealPlanService.js";
import { getRecipeById } from "./recipeService.js";
import { scoreRecipeWithInventoryItems } from "./recipeScoreEngine.js";

const unitFamilies = ingredientUnits.reduce((families, unit) => {
  if (!unit.conversionFactor) return families;
  const familyKey = unit.baseUnit || unit.family;
  const current = families[familyKey] || { baseUnit: unit.baseUnit, factors: {} };
  current.factors[unit.id] = unit.conversionFactor;
  families[familyKey] = current;
  return families;
}, {});

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

function unprocessable(message) {
  const error = new Error(message);
  error.statusCode = 422;
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

function ingredientKey(ingredient) {
  return ingredient.ingredientId || ingredient.normalizedName;
}

function buildShoppingNeedKey(ingredient) {
  const family = findUnitFamily(ingredient.unit);
  const identity = ingredientKey(ingredient);
  return family?.baseUnit
    ? `${identity}:${family.baseUnit}`
    : `${identity}:${normalizeUnit(ingredient.unit)}`;
}

function sourceRecipeFor(recipe) {
  return {
    recipeId: String(recipe?._id || recipe?.id || recipe?.externalId || ""),
    title: recipe?.title || ""
  };
}

function mergeSourceRecipe(target, sourceRecipe) {
  if (!sourceRecipe.recipeId) return;
  if (target.sourceRecipes.some((recipe) => recipe.recipeId === sourceRecipe.recipeId)) return;
  target.sourceRecipes.push(sourceRecipe);
}

function serializeNeed(need, checked = false) {
  return {
    ingredientId: mongoose.Types.ObjectId.isValid(need.ingredientId) ? need.ingredientId : undefined,
    ingredientName: need.ingredientName,
    displayName: need.displayName || need.ingredientName,
    normalizedName: need.normalizedName,
    quantity: roundQuantity(need.quantity),
    unit: need.unit,
    standardQuantity: need.standardQuantity !== undefined ? roundQuantity(need.standardQuantity) : undefined,
    standardUnit: need.standardUnit || "",
    category: need.category || "autres",
    sourceRecipes: need.sourceRecipes || [],
    checked,
    isChecked: checked
  };
}

function lineFromScoreItem(item, recipe) {
  const sourceRecipe = sourceRecipeFor(recipe);
  const quantity = item.status === "partiel" && item.quantityComparable !== false
    ? Number(item.missingQuantity || 0)
    : Number(item.requiredQuantity || 0);

  return {
    ingredientId: item.ingredientId,
    ingredientName: item.ingredientName,
    displayName: item.ingredientName,
    normalizedName: item.normalizedName,
    quantity,
    unit: item.requiredUnit || item.unit || "unit",
    standardQuantity: quantity,
    standardUnit: item.requiredUnit || item.unit || "unit",
    category: item.category || "autres",
    sourceRecipes: sourceRecipe.recipeId ? [sourceRecipe] : [],
    checked: false,
    isChecked: false
  };
}

function mergeShoppingLine(lines, line) {
  const key = buildShoppingNeedKey(line);
  const existing = lines.get(key);
  const family = findUnitFamily(line.unit);

  if (!existing) {
    lines.set(key, {
      ...line,
      unit: family?.baseUnit || normalizeUnit(line.unit),
      quantity: family?.baseUnit ? toBaseQuantity(line.quantity, line.unit) : Number(line.quantity || 0),
      standardQuantity: family?.baseUnit ? toBaseQuantity(line.quantity, line.unit) : Number(line.standardQuantity ?? line.quantity ?? 0),
      standardUnit: family?.baseUnit || normalizeUnit(line.standardUnit || line.unit),
      sourceRecipes: [...(line.sourceRecipes || [])]
    });
    return;
  }

  if (family?.baseUnit) {
    existing.quantity += toBaseQuantity(line.quantity, line.unit);
    existing.standardQuantity = Number(existing.standardQuantity || 0) + toBaseQuantity(line.quantity, line.unit);
  } else if (normalizeUnit(existing.unit) === normalizeUnit(line.unit)) {
    existing.quantity += Number(line.quantity || 0);
    existing.standardQuantity = Number(existing.standardQuantity || 0) + Number(line.standardQuantity ?? line.quantity ?? 0);
  }

  for (const sourceRecipe of line.sourceRecipes || []) {
    mergeSourceRecipe(existing, sourceRecipe);
  }
}

export function buildShoppingListItemsFromScoredRecipes(scoredRecipes = []) {
  const lines = new Map();

  for (const { recipe, score } of scoredRecipes) {
    const missingLines = [...(score?.missing || []), ...(score?.partial || [])];
    for (const item of missingLines) {
      mergeShoppingLine(lines, lineFromScoreItem(item, recipe));
    }
  }

  return [...lines.values()]
    .filter((item) => roundQuantity(item.quantity) > 0)
    .map((item) => serializeNeed(item, false))
    .sort((a, b) => a.category.localeCompare(b.category) || a.ingredientName.localeCompare(b.ingredientName));
}

export function buildShoppingListFromRecipes(recipes = [], inventoryItems = [], options = {}) {
  const scoredRecipes = recipes.map((recipe) => ({
    recipe,
    score: scoreRecipeWithInventoryItems(recipe, inventoryItems)
  }));
  const items = buildShoppingListItemsFromScoredRecipes(scoredRecipes);
  const sourceRecipes = recipes.map(sourceRecipeFor).filter((recipe) => recipe.recipeId);

  return {
    title: options.title || (sourceRecipes.length === 1 ? `Courses - ${sourceRecipes[0].title}` : "Courses depuis recettes"),
    status: "active",
    sourceRecipes,
    items,
    generatedAt: new Date(),
    isCompleted: false
  };
}

function toInventoryUnit(unit) {
  return normalizeUnit(unit);
}

async function mergeItemIntoInventory(userId, item) {
  const ingredient = await findOrCreateIngredient({ name: item.ingredientName, category: item.category });

  await InventoryItem.findOneAndUpdate(
    { userId, ingredientId: ingredient._id, unit: toInventoryUnit(item.unit) },
    {
      $inc: { quantity: item.quantity },
      $set: { normalizedName: ingredient.normalizedName }
    },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  );
}

async function removeItemFromInventory(userId, item) {
  const ingredient = await findOrCreateIngredient({ name: item.ingredientName, category: item.category });
  const inventoryItem = await InventoryItem.findOne({
    userId,
    ingredientId: ingredient._id,
    unit: toInventoryUnit(item.unit)
  });

  if (!inventoryItem) return;

  inventoryItem.quantity = roundQuantity(Number(inventoryItem.quantity || 0) - Number(item.quantity || 0));
  if (inventoryItem.quantity <= 0) {
    await inventoryItem.deleteOne();
    return;
  }

  await inventoryItem.save();
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
  let resolvedRecipeCount = 0;

  for (const plan of plans) {
    const recipe = plan.recipeSnapshot || await getRecipeById(plan.recipeId, plan.recipeSource);
    if (!recipe) continue;
    resolvedRecipeCount += 1;

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

  return { needs, planCount: plans.length, resolvedRecipeCount };
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
  const { needs, planCount, resolvedRecipeCount } = await getPlannedNeeds(user, weekStartDate);

  if (!planCount) throw badRequest("Aucun repas planifie pour cette semaine");
  if (!resolvedRecipeCount || !needs.size) {
    throw unprocessable("Aucun ingredient trouve pour les recettes planifiees");
  }

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
      title: "Liste de courses hebdomadaire",
      items,
      generatedAt: new Date(),
      isCompleted: items.length > 0 && items.every((item) => item.checked)
    },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  );
}

export async function createShoppingListFromRecipes(user, recipes = [], options = {}) {
  if (!recipes.length) throw badRequest("Aucune recette fournie");

  const inventoryItems = await InventoryItem.find({ userId: user._id }).populate("ingredientId").lean();
  const payload = buildShoppingListFromRecipes(recipes, inventoryItems, options);

  return ShoppingList.create({
    ...payload,
    userId: user._id
  });
}

export async function createShoppingListFromRecipe(user, recipe, options = {}) {
  return createShoppingListFromRecipes(user, [recipe], options);
}

export async function createShoppingListFromRecipeIds(user, recipeIds = [], options = {}) {
  if (!Array.isArray(recipeIds) || !recipeIds.length) throw badRequest("recipeIds must contain at least one recipe");

  const recipes = [];
  for (const recipeId of recipeIds) {
    const recipe = await getRecipeById(recipeId, options.source);
    if (!recipe) throw notFound(`Recipe not found: ${recipeId}`);
    recipes.push(recipe);
  }

  return createShoppingListFromRecipes(user, recipes, options);
}

export async function listRecipeShoppingLists(userId) {
  return ShoppingList.find({ userId }).sort({ createdAt: -1 });
}

export async function getShoppingListById(userId, shoppingListId) {
  const list = await ShoppingList.findOne({ _id: shoppingListId, userId });
  if (!list) throw notFound("Shopping list not found");
  return list;
}

export async function deleteShoppingList(userId, shoppingListId) {
  const list = await ShoppingList.findOneAndDelete({ _id: shoppingListId, userId });
  if (!list) throw notFound("Shopping list not found");
  return list;
}

export async function setRecipeShoppingListItemChecked(userId, shoppingListId, itemId, checked) {
  if (typeof checked !== "boolean") throw badRequest("checked must be a boolean");

  const list = await ShoppingList.findOne({ _id: shoppingListId, userId, "items._id": itemId });
  if (!list) throw notFound("Shopping list item not found");

  const item = list.items.id(itemId);
  item.checked = checked;
  item.isChecked = checked;
  list.isCompleted = list.items.length > 0 && list.items.every((entry) => entry.checked || entry.isChecked);
  list.status = list.isCompleted ? "completed" : "active";
  await list.save();
  return list;
}

export async function setShoppingListItemChecked(userId, itemId, checked) {
  if (typeof checked !== "boolean") throw badRequest("checked must be a boolean");

  const list = await ShoppingList.findOne({ userId, "items._id": itemId });
  if (!list) throw notFound("Shopping list item not found");

  const item = list.items.id(itemId);
  if (item.checked === checked) return list;

  if (checked) {
    await mergeItemIntoInventory(userId, item);
  } else {
    await removeItemFromInventory(userId, item);
  }

  item.checked = checked;
  item.isChecked = checked;
  list.isCompleted = list.items.length > 0 && list.items.every((entry) => entry.checked);
  await list.save();
  return list;
}

export async function addShoppingListItemToInventory(userId, itemId) {
  const list = await ShoppingList.findOne({ userId, "items._id": itemId });
  if (!list) throw notFound("Shopping list item not found");

  const item = list.items.id(itemId);
  if (!item.checked) {
    await mergeItemIntoInventory(userId, item);
  }

  item.checked = true;
  item.isChecked = true;
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

export async function completeCheckedItems(userId, week) {
  const weekStartDate = normalizeWeekStartDate(week);
  const list = await ShoppingList.findOne({ userId, weekStartDate });
  if (!list) throw notFound("Shopping list not found");

  list.items = list.items.filter((item) => !item.checked);
  list.isCompleted = list.items.length > 0 && list.items.every((entry) => entry.checked);
  await list.save();
  return list;
}
