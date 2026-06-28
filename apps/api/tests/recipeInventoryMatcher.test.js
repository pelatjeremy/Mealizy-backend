import test from "node:test";
import assert from "node:assert/strict";
import { compareRecipeWithInventoryItems } from "../src/services/recipeInventoryMatcher.js";

function recipe(ingredients) {
  return {
    _id: "recipe-id",
    title: "Test recipe",
    ingredients
  };
}

function ingredient(overrides) {
  return {
    ingredientName: "Tomate",
    normalizedName: "tomate",
    quantity: 100,
    unit: "g",
    category: "legumes",
    ...overrides
  };
}

function inventoryItem(overrides) {
  return {
    ingredientId: "ingredient-id",
    normalizedName: "tomate",
    quantity: 100,
    unit: "g",
    ...overrides
  };
}

test("recipe with all ingredients available scores 100 percent", () => {
  const result = compareRecipeWithInventoryItems(
    recipe([
      ingredient({ ingredientId: "tomato-id", normalizedName: "tomate", quantity: 200, unit: "g" }),
      ingredient({ ingredientId: "pasta-id", ingredientName: "Pates", normalizedName: "pate", quantity: 1, unit: "unit" })
    ]),
    [
      inventoryItem({ ingredientId: "tomato-id", normalizedName: "tomate", quantity: 300, unit: "g" }),
      inventoryItem({ ingredientId: "pasta-id", normalizedName: "pate", quantity: 1, unit: "unit" })
    ]
  );

  assert.equal(result.compatibilityScore, 100);
  assert.equal(result.availableIngredients, 2);
  assert.equal(result.missingIngredients, 0);
  assert.equal(result.partialIngredients, 0);
  assert.equal(result.matched.length, 2);
});

test("recipe with missing ingredient reports missing list", () => {
  const result = compareRecipeWithInventoryItems(
    recipe([
      ingredient({ ingredientId: "tomato-id", normalizedName: "tomate" }),
      ingredient({ ingredientId: "basil-id", ingredientName: "Basilic", normalizedName: "basilic" })
    ]),
    [inventoryItem({ ingredientId: "tomato-id", normalizedName: "tomate" })]
  );

  assert.equal(result.compatibilityScore, 50);
  assert.equal(result.availableIngredients, 1);
  assert.equal(result.missingIngredients, 1);
  assert.equal(result.missing[0].normalizedName, "basilic");
});

test("recipe with partially available ingredient reports missing quantity", () => {
  const result = compareRecipeWithInventoryItems(
    recipe([ingredient({ ingredientId: "tomato-id", quantity: 500, unit: "g" })]),
    [inventoryItem({ ingredientId: "tomato-id", quantity: 300, unit: "g" })]
  );

  assert.equal(result.compatibilityScore, 50);
  assert.equal(result.availableIngredients, 0);
  assert.equal(result.partialIngredients, 1);
  assert.equal(result.partial[0].missingQuantity, 200);
  assert.equal(result.partial[0].availableQuantity, 300);
});

test("comparison prioritizes ingredientId over normalizedName", () => {
  const result = compareRecipeWithInventoryItems(
    recipe([ingredient({ ingredientId: "tomato-id", normalizedName: "tomate", quantity: 100, unit: "g" })]),
    [
      inventoryItem({ ingredientId: "other-id", normalizedName: "tomate", quantity: 0, unit: "g" }),
      inventoryItem({ ingredientId: "tomato-id", normalizedName: "wrong-name", quantity: 100, unit: "g" })
    ]
  );

  assert.equal(result.compatibilityScore, 100);
  assert.equal(result.matched[0].matchType, "ingredientId");
});

test("comparison falls back to normalizedName when ingredientId is absent", () => {
  const result = compareRecipeWithInventoryItems(
    recipe([ingredient({ ingredientId: undefined, normalizedName: "tomate", quantity: 100, unit: "g" })]),
    [inventoryItem({ ingredientId: "tomato-id", normalizedName: "tomate", quantity: 100, unit: "g" })]
  );

  assert.equal(result.compatibilityScore, 100);
  assert.equal(result.matched[0].matchType, "normalizedName");
});

test("non comparable units do not block compatibility calculation", () => {
  const result = compareRecipeWithInventoryItems(
    recipe([ingredient({ ingredientId: "tomato-id", quantity: 1, unit: "pinch" })]),
    [inventoryItem({ ingredientId: "tomato-id", quantity: 500, unit: "g" })]
  );

  assert.equal(result.compatibilityScore, 100);
  assert.equal(result.availableIngredients, 1);
  assert.equal(result.matched[0].quantityComparable, false);
});
