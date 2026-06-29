import test from "node:test";
import assert from "node:assert/strict";
import {
  classifyIngredientImportance,
  scoreRecipeWithInventoryItems
} from "../src/services/recipeScoreEngine.js";

function recipe(id, ingredients) {
  return {
    _id: id,
    title: "Test recipe",
    ingredients
  };
}

function ingredient(overrides) {
  return {
    ingredientId: "ingredient-id",
    ingredientName: "Ingredient",
    normalizedName: "ingredient",
    quantity: 100,
    unit: "g",
    category: "autres",
    ...overrides
  };
}

function inventoryItem(overrides) {
  return {
    ingredientId: "ingredient-id",
    normalizedName: "ingredient",
    quantity: 100,
    unit: "g",
    ...overrides
  };
}

test("classifies explicit, optional and essential ingredients", () => {
  assert.equal(classifyIngredientImportance(ingredient({ importance: "optional" })), "optional");
  assert.equal(classifyIngredientImportance(ingredient({ ingredientName: "Sel", normalizedName: "sel", quantity: 2 })), "optional");
  assert.equal(classifyIngredientImportance(ingredient({ category: "viandes", ingredientName: "Poulet" })), "essential");
});

test("recipe immediately cookable receives a cook_now recommendation", () => {
  const result = scoreRecipeWithInventoryItems(
    recipe("recipe-ready", [
      ingredient({ ingredientId: "chicken-id", ingredientName: "Poulet", normalizedName: "poulet", category: "viandes", quantity: 200 }),
      ingredient({ ingredientId: "rice-id", ingredientName: "Riz", normalizedName: "riz", category: "feculents", quantity: 100 })
    ]),
    [
      inventoryItem({ ingredientId: "chicken-id", normalizedName: "poulet", quantity: 250 }),
      inventoryItem({ ingredientId: "rice-id", normalizedName: "riz", quantity: 100 })
    ]
  );

  assert.equal(result.compatibilityScore, 100);
  assert.equal(result.availabilityScore, 100);
  assert.equal(result.quantityScore, 100);
  assert.equal(result.essentialScore, 100);
  assert.equal(result.recommendation, "cook_now");
  assert.deepEqual(result.missingCriticalIngredients, []);
});

test("recipe with a missing critical ingredient is penalized strongly", () => {
  const result = scoreRecipeWithInventoryItems(
    recipe("recipe-critical", [
      ingredient({ ingredientId: "salt-id", ingredientName: "Sel", normalizedName: "sel", quantity: 2, unit: "g" }),
      ingredient({ ingredientId: "chicken-id", ingredientName: "Poulet", normalizedName: "poulet", category: "viandes", quantity: 200 })
    ]),
    [inventoryItem({ ingredientId: "salt-id", normalizedName: "sel", quantity: 10 })]
  );

  assert.ok(result.compatibilityScore < 70);
  assert.equal(result.recommendation, "shopping_needed");
  assert.deepEqual(result.missingCriticalIngredients, ["Poulet"]);
  assert.deepEqual(result.missingOptionalIngredients, []);
});

test("recipe missing only secondary ingredients remains almost ready", () => {
  const result = scoreRecipeWithInventoryItems(
    recipe("recipe-optional", [
      ingredient({ ingredientId: "pasta-id", ingredientName: "Pates", normalizedName: "pate", category: "feculents", quantity: 120 }),
      ingredient({ ingredientId: "parsley-id", ingredientName: "Persil", normalizedName: "persil", quantity: 3, unit: "g" })
    ]),
    [inventoryItem({ ingredientId: "pasta-id", normalizedName: "pate", quantity: 160 })]
  );

  assert.ok(result.compatibilityScore >= 72);
  assert.equal(result.recommendation, "almost_ready");
  assert.deepEqual(result.missingCriticalIngredients, []);
  assert.deepEqual(result.missingOptionalIngredients, ["Persil"]);
});

test("multiple recipe scoring keeps recipe order and differentiates recommendations", () => {
  const readyRecipe = recipe("ready", [
    ingredient({ ingredientId: "rice-id", ingredientName: "Riz", normalizedName: "riz", category: "feculents", quantity: 100 })
  ]);
  const blockedRecipe = recipe("blocked", [
    ingredient({ ingredientId: "beef-id", ingredientName: "Boeuf", normalizedName: "boeuf", category: "viandes", quantity: 200 })
  ]);
  const results = [readyRecipe, blockedRecipe].map((item) =>
    scoreRecipeWithInventoryItems(item, [inventoryItem({ ingredientId: "rice-id", normalizedName: "riz", quantity: 100 })])
  );

  assert.deepEqual(results.map((item) => item.recipeId), ["ready", "blocked"]);
  assert.equal(results[0].recommendation, "cook_now");
  assert.equal(results[1].recommendation, "not_recommended");
});

test("scoring is stable for the same recipe and inventory", () => {
  const currentRecipe = recipe("stable", [
    ingredient({ ingredientId: "egg-id", ingredientName: "Oeuf", normalizedName: "oeuf", category: "oeufs", quantity: 2, unit: "unit" }),
    ingredient({ ingredientId: "pepper-id", ingredientName: "Poivre", normalizedName: "poivre", quantity: 1, unit: "g" })
  ]);
  const inventory = [inventoryItem({ ingredientId: "egg-id", normalizedName: "oeuf", quantity: 1, unit: "unit" })];

  assert.deepEqual(scoreRecipeWithInventoryItems(currentRecipe, inventory), scoreRecipeWithInventoryItems(currentRecipe, inventory));
});
