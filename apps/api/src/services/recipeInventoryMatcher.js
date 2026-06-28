import { InventoryItem } from "../models/InventoryItem.js";
import { normalizeIngredientName } from "../utils/normalizeIngredient.js";
import { normalizeUnit } from "../utils/unitConversion.js";

const unitFamilies = {
  mass: { baseUnit: "g", factors: { mg: 0.001, g: 1, kg: 1000 } },
  volume: { baseUnit: "ml", factors: { ml: 1, cl: 10, l: 1000, cup: 240, tbsp: 14.7868, tsp: 4.92892 } },
  count: { baseUnit: "unit", factors: { unit: 1, slice: 1, can: 1, jar: 1 } }
};

function toComparableId(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value._id) return String(value._id);
  return String(value);
}

function roundQuantity(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function ingredientName(ingredient) {
  return ingredient.displayName || ingredient.ingredientName || ingredient.name || ingredient.originalName || "Ingredient";
}

function normalizedName(ingredient) {
  return ingredient.normalizedName || normalizeIngredientName(ingredientName(ingredient));
}

function quantityOf(ingredient) {
  return Number(ingredient.standardAmount ?? ingredient.amount ?? ingredient.quantity ?? 0);
}

function unitOf(ingredient) {
  return normalizeUnit(ingredient.standardUnit || ingredient.unit || "unit");
}

function unitFamily(unit) {
  const normalizedUnit = normalizeUnit(unit);
  const family = Object.values(unitFamilies).find((candidate) => candidate.factors[normalizedUnit]);
  return family ? { ...family, unit: normalizedUnit } : null;
}

function toBaseQuantity(quantity, unit) {
  const family = unitFamily(unit);
  if (!family) return null;
  return Number(quantity || 0) * family.factors[family.unit];
}

function compareQuantities(requiredQuantity, requiredUnit, availableQuantity, availableUnit) {
  const normalizedRequiredUnit = normalizeUnit(requiredUnit);
  const normalizedAvailableUnit = normalizeUnit(availableUnit);
  const requiredFamily = unitFamily(normalizedRequiredUnit);
  const availableFamily = unitFamily(normalizedAvailableUnit);

  if (requiredFamily && availableFamily && requiredFamily.baseUnit === availableFamily.baseUnit) {
    const requiredBase = toBaseQuantity(requiredQuantity, normalizedRequiredUnit);
    const availableBase = toBaseQuantity(availableQuantity, normalizedAvailableUnit);
    const missingBase = Math.max(requiredBase - availableBase, 0);

    return {
      comparable: true,
      missingQuantity: roundQuantity(missingBase / requiredFamily.factors[requiredFamily.unit]),
      availableQuantity: roundQuantity(availableBase / requiredFamily.factors[requiredFamily.unit]),
      unit: normalizedRequiredUnit
    };
  }

  if (normalizedRequiredUnit === normalizedAvailableUnit) {
    return {
      comparable: true,
      missingQuantity: roundQuantity(Math.max(Number(requiredQuantity || 0) - Number(availableQuantity || 0), 0)),
      availableQuantity: roundQuantity(availableQuantity),
      unit: normalizedRequiredUnit
    };
  }

  return {
    comparable: false,
    missingQuantity: 0,
    availableQuantity: roundQuantity(availableQuantity),
    unit: normalizedRequiredUnit
  };
}

function buildInventoryIndexes(inventoryItems = []) {
  const byIngredientId = new Map();
  const byNormalizedName = new Map();

  for (const item of inventoryItems) {
    const ingredientId = toComparableId(item.ingredientId);
    const name = item.normalizedName || item.ingredientId?.normalizedName || normalizeIngredientName(item.name || item.ingredientId?.name || "");
    const entry = {
      ingredientId,
      normalizedName: name,
      quantity: Number(item.quantity || 0),
      unit: normalizeUnit(item.unit || "unit"),
      raw: item
    };

    if (ingredientId) {
      const values = byIngredientId.get(ingredientId) || [];
      values.push(entry);
      byIngredientId.set(ingredientId, values);
    }

    if (name) {
      const values = byNormalizedName.get(name) || [];
      values.push(entry);
      byNormalizedName.set(name, values);
    }
  }

  return { byIngredientId, byNormalizedName };
}

function findInventoryMatches(ingredient, indexes) {
  const ingredientId = toComparableId(ingredient.ingredientId);
  if (ingredientId && indexes.byIngredientId.has(ingredientId)) {
    return { matchType: "ingredientId", items: indexes.byIngredientId.get(ingredientId) };
  }

  const name = normalizedName(ingredient);
  if (name && indexes.byNormalizedName.has(name)) {
    return { matchType: "normalizedName", items: indexes.byNormalizedName.get(name) };
  }

  return { matchType: null, items: [] };
}

function summarizeAvailableQuantity(matches, requiredUnit) {
  let comparable = true;
  let availableQuantity = 0;
  let sawComparable = false;

  for (const item of matches) {
    const comparison = compareQuantities(0, requiredUnit, item.quantity, item.unit);
    if (!comparison.comparable) {
      comparable = false;
      continue;
    }
    sawComparable = true;
    availableQuantity += comparison.availableQuantity;
  }

  return {
    comparable: comparable && sawComparable,
    availableQuantity: roundQuantity(availableQuantity)
  };
}

function ingredientResult(ingredient, status, extra = {}) {
  const requiredQuantity = roundQuantity(quantityOf(ingredient));
  const requiredUnit = unitOf(ingredient);

  return {
    ingredientId: toComparableId(ingredient.ingredientId) || undefined,
    ingredientName: ingredientName(ingredient),
    normalizedName: normalizedName(ingredient),
    requiredQuantity,
    requiredUnit,
    unit: requiredUnit,
    status,
    ...extra
  };
}

export function compareRecipeWithInventoryItems(recipe, inventoryItems = []) {
  const ingredients = recipe?.ingredients || [];
  const indexes = buildInventoryIndexes(inventoryItems);
  const matched = [];
  const missing = [];
  const partial = [];

  for (const ingredient of ingredients) {
    const requiredQuantity = quantityOf(ingredient);
    const requiredUnit = unitOf(ingredient);
    const inventoryMatch = findInventoryMatches(ingredient, indexes);

    if (!inventoryMatch.items.length) {
      missing.push(ingredientResult(ingredient, "manquant", { matchType: null }));
      continue;
    }

    const available = summarizeAvailableQuantity(inventoryMatch.items, requiredUnit);
    if (!available.comparable) {
      matched.push(
        ingredientResult(ingredient, "disponible", {
          matchType: inventoryMatch.matchType,
          quantityComparable: false,
          availableQuantity: available.availableQuantity
        })
      );
      continue;
    }

    const comparison = compareQuantities(requiredQuantity, requiredUnit, available.availableQuantity, requiredUnit);
    if (comparison.missingQuantity <= 0) {
      matched.push(
        ingredientResult(ingredient, "disponible", {
          matchType: inventoryMatch.matchType,
          quantityComparable: true,
          availableQuantity: comparison.availableQuantity
        })
      );
      continue;
    }

    partial.push(
      ingredientResult(ingredient, "partiel", {
        matchType: inventoryMatch.matchType,
        quantityComparable: true,
        availableQuantity: comparison.availableQuantity,
        missingQuantity: comparison.missingQuantity
      })
    );
  }

  const totalIngredients = ingredients.length;
  const weightedAvailable = matched.length + partial.length * 0.5;
  const compatibilityScore = totalIngredients ? Math.round((weightedAvailable / totalIngredients) * 100) : 0;

  return {
    recipeId: String(recipe?._id || recipe?.id || recipe?.externalId || ""),
    totalIngredients,
    availableIngredients: matched.length,
    missingIngredients: missing.length,
    partialIngredients: partial.length,
    compatibilityScore,
    matched,
    missing,
    partial
  };
}

export async function getRecipeCompatibilityForUser(userId, recipe) {
  const inventoryItems = await InventoryItem.find({ userId }).populate("ingredientId").lean();
  return compareRecipeWithInventoryItems(recipe, inventoryItems);
}

export async function getRecipesCompatibilityForUser(userId, recipes = []) {
  const inventoryItems = await InventoryItem.find({ userId }).populate("ingredientId").lean();
  return recipes.map((recipe) => compareRecipeWithInventoryItems(recipe, inventoryItems));
}
