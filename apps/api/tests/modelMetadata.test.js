import test from "node:test";
import assert from "node:assert/strict";
import { Ingredient } from "../src/models/Ingredient.js";
import { InventoryItem } from "../src/models/InventoryItem.js";
import { Recipe } from "../src/models/Recipe.js";
import { User } from "../src/models/User.js";

function hasIndex(model, fields) {
  return model.schema.indexes().some(([indexFields]) =>
    Object.entries(fields).every(([key, value]) => indexFields[key] === value)
  );
}

test("core models expose the expected lookup indexes", () => {
  assert.equal(hasIndex(Recipe, { sourceProvider: 1, externalId: 1 }), true);
  assert.equal(hasIndex(Recipe, { title: "text", summary: "text", description: "text" }), true);
  assert.equal(hasIndex(Ingredient, { normalizedName: 1, active: 1 }), true);
  assert.equal(hasIndex(Ingredient, { category: 1, subcategory: 1, active: 1 }), true);
  assert.equal(hasIndex(InventoryItem, { userId: 1, ingredientId: 1 }), true);
  assert.equal(hasIndex(InventoryItem, { userId: 1, normalizedName: 1 }), true);
  assert.equal(User.schema.path("email").options.unique, true);
});

test("recipe ingredient schema applies stable defaults", () => {
  const recipe = new Recipe({
    title: "Simple recipe",
    image: "recipe.jpg",
    ingredients: [{ ingredientName: "Tomates", quantity: 2, unit: "unit", normalizedName: "tomate" }]
  });

  assert.equal(recipe.source, "user");
  assert.equal(recipe.sourceProvider, "user");
  assert.equal(recipe.ingredients[0].category, "autres");
  assert.deepEqual(recipe.instructions, []);
});

