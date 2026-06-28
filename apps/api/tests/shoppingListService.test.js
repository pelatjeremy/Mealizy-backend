import test from "node:test";
import assert from "node:assert/strict";
import { buildShoppingListFromRecipes } from "../src/services/shoppingListService.js";

function recipe(id, ingredients) {
  return {
    _id: id,
    title: `Recipe ${id}`,
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

function itemByName(list, normalizedName) {
  return list.items.find((item) => item.normalizedName === normalizedName);
}

test("generates a shopping list from one recipe with missing ingredients only", () => {
  const list = buildShoppingListFromRecipes(
    [
      recipe("recipe-one", [
        ingredient({ ingredientId: "pasta-id", ingredientName: "Pates", normalizedName: "pate", category: "feculents" }),
        ingredient({ ingredientId: "tomato-id", ingredientName: "Tomate", normalizedName: "tomate", category: "fruits-legumes" })
      ])
    ],
    [inventoryItem({ ingredientId: "pasta-id", normalizedName: "pate", quantity: 100 })]
  );

  assert.equal(list.items.length, 1);
  assert.equal(list.items[0].ingredientName, "Tomate");
  assert.equal(list.items[0].sourceRecipes[0].recipeId, "recipe-one");
});

test("generates a shopping list from several recipes", () => {
  const list = buildShoppingListFromRecipes(
    [
      recipe("recipe-one", [ingredient({ ingredientId: "tomato-id", ingredientName: "Tomate", normalizedName: "tomate" })]),
      recipe("recipe-two", [ingredient({ ingredientId: "rice-id", ingredientName: "Riz", normalizedName: "riz" })])
    ],
    []
  );

  assert.equal(list.sourceRecipes.length, 2);
  assert.equal(list.items.length, 2);
});

test("merges identical ingredients and keeps source recipes", () => {
  const list = buildShoppingListFromRecipes(
    [
      recipe("recipe-one", [ingredient({ ingredientId: "tomato-id", ingredientName: "Tomate", normalizedName: "tomate", quantity: 100 })]),
      recipe("recipe-two", [ingredient({ ingredientId: "tomato-id", ingredientName: "Tomate", normalizedName: "tomate", quantity: 50 })])
    ],
    []
  );
  const tomato = itemByName(list, "tomate");

  assert.equal(list.items.length, 1);
  assert.equal(tomato.quantity, 150);
  assert.deepEqual(tomato.sourceRecipes.map((source) => source.recipeId), ["recipe-one", "recipe-two"]);
});

test("adds compatible quantities using the base unit", () => {
  const list = buildShoppingListFromRecipes(
    [
      recipe("recipe-one", [ingredient({ ingredientId: "flour-id", ingredientName: "Farine", normalizedName: "farine", quantity: 500, unit: "g" })]),
      recipe("recipe-two", [ingredient({ ingredientId: "flour-id", ingredientName: "Farine", normalizedName: "farine", quantity: 1, unit: "kg" })])
    ],
    []
  );
  const flour = itemByName(list, "farine");

  assert.equal(list.items.length, 1);
  assert.equal(flour.quantity, 1500);
  assert.equal(flour.unit, "g");
});

test("keeps incompatible units as separate lines", () => {
  const list = buildShoppingListFromRecipes(
    [
      recipe("recipe-one", [ingredient({ ingredientId: "tomato-id", ingredientName: "Tomate", normalizedName: "tomate", quantity: 200, unit: "g" })]),
      recipe("recipe-two", [ingredient({ ingredientId: "tomato-id", ingredientName: "Tomate", normalizedName: "tomate", quantity: 2, unit: "unit" })])
    ],
    []
  );

  assert.equal(list.items.length, 2);
  assert.deepEqual(list.items.map((item) => item.unit).sort(), ["g", "unit"]);
});

test("adds partial ingredients with only the missing quantity", () => {
  const list = buildShoppingListFromRecipes(
    [
      recipe("recipe-one", [ingredient({ ingredientId: "rice-id", ingredientName: "Riz", normalizedName: "riz", quantity: 300, unit: "g" })])
    ],
    [inventoryItem({ ingredientId: "rice-id", normalizedName: "riz", quantity: 100, unit: "g" })]
  );
  const rice = itemByName(list, "riz");

  assert.equal(list.items.length, 1);
  assert.equal(rice.quantity, 200);
});

test("ignores already available ingredients", () => {
  const list = buildShoppingListFromRecipes(
    [
      recipe("recipe-one", [ingredient({ ingredientId: "egg-id", ingredientName: "Oeuf", normalizedName: "oeuf", quantity: 2, unit: "unit" })])
    ],
    [inventoryItem({ ingredientId: "egg-id", normalizedName: "oeuf", quantity: 2, unit: "unit" })]
  );

  assert.equal(list.items.length, 0);
});

test("shopping list items start unchecked and can be represented as checked", () => {
  const list = buildShoppingListFromRecipes(
    [recipe("recipe-one", [ingredient({ ingredientId: "milk-id", ingredientName: "Lait", normalizedName: "lait", quantity: 1, unit: "l" })])],
    []
  );

  assert.equal(list.items[0].checked, false);
  assert.equal(list.items[0].isChecked, false);
});
