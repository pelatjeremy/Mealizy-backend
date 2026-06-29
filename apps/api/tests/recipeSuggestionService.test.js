import test from "node:test";
import assert from "node:assert/strict";
import { buildRecipeSuggestions } from "../src/services/recipeSuggestionService.js";

function recipe(id, title, ingredients, overrides = {}) {
  return {
    _id: id,
    title,
    image: "",
    preparationTime: 20,
    servings: 2,
    nutrition: { calories: 450, protein: 20, carbs: 40, fat: 12 },
    ingredients,
    ...overrides
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

const recipes = [
  recipe("ready", "Ready pasta", [
    ingredient({ ingredientId: "pasta-id", ingredientName: "Pates", normalizedName: "pate", category: "feculents" })
  ]),
  recipe("almost", "Almost pasta", [
    ingredient({ ingredientId: "rice-id", ingredientName: "Riz", normalizedName: "riz", category: "feculents" }),
    ingredient({ ingredientId: "parsley-id", ingredientName: "Persil", normalizedName: "persil", quantity: 3 })
  ]),
  recipe("few", "Missing chicken", [
    ingredient({ ingredientId: "salt-id", ingredientName: "Sel", normalizedName: "sel", quantity: 2 }),
    ingredient({ ingredientId: "chicken-id", ingredientName: "Poulet", normalizedName: "poulet", category: "viandes", quantity: 200 })
  ]),
  recipe("low", "No match beef", [
    ingredient({ ingredientId: "beef-id", ingredientName: "Boeuf", normalizedName: "boeuf", category: "viandes", quantity: 200 })
  ])
];

const inventory = [
  inventoryItem({ ingredientId: "pasta-id", normalizedName: "pate", quantity: 100 }),
  inventoryItem({ ingredientId: "rice-id", normalizedName: "riz", quantity: 150 }),
  inventoryItem({ ingredientId: "salt-id", normalizedName: "sel", quantity: 10 })
];

test("suggestions are sorted by intelligent score", () => {
  const result = buildRecipeSuggestions(recipes, inventory);

  assert.equal(result.suggestions[0].recipe.id, "ready");
  assert.ok(result.suggestions[0].score >= result.suggestions[1].score);
});

test("suggestions are grouped by recommendation level", () => {
  const result = buildRecipeSuggestions(recipes, inventory);

  assert.equal(result.summary.readyToCook, 1);
  assert.equal(result.summary.highlyRecommended, 1);
  assert.equal(result.summary.missingFewIngredients, 1);
  assert.equal(result.summary.lowCompatibility, 1);
  assert.equal(result.groups.readyToCook[0].recommendation, "cook_now");
});

test("readyOnly keeps only immediately cookable recipes", () => {
  const result = buildRecipeSuggestions(recipes, inventory, { readyOnly: "true" });

  assert.equal(result.suggestions.length, 1);
  assert.equal(result.suggestions[0].recipe.id, "ready");
});

test("missingMax filters recipes by missing and partial ingredient count", () => {
  const result = buildRecipeSuggestions(recipes, inventory, { missingMax: "0" });

  assert.deepEqual(result.suggestions.map((suggestion) => suggestion.recipe.id), ["ready"]);
});

test("limit caps the number of returned suggestions", () => {
  const result = buildRecipeSuggestions(recipes, inventory, { limit: "2" });

  assert.equal(result.summary.totalRecipesAnalyzed, 4);
  assert.equal(result.suggestions.length, 2);
});

test("empty inventory returns low compatibility suggestions without crashing", () => {
  const result = buildRecipeSuggestions(recipes, [], { limit: "4" });

  assert.equal(result.summary.totalRecipesAnalyzed, 4);
  assert.ok(result.summary.lowCompatibility >= 1);
  assert.ok(result.suggestions.every((suggestion) => suggestion.availableIngredients.length === 0));
});
