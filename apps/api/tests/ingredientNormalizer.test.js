import test from "node:test";
import assert from "node:assert/strict";
import { Ingredient } from "../src/models/Ingredient.js";
import { normalizeComparableIngredientName, buildIngredientComparableValues } from "../src/services/ingredientNormalizer.js";
import { matchOrCreateIngredient, normalizeRecipeIngredient } from "../src/services/ingredientMatcher.js";
import { normalizeUnit } from "../src/utils/unitConversion.js";

test("normalizer removes accents and simple French plurals", () => {
  assert.equal(normalizeComparableIngredientName("Tomates fraiches"), "tomate");
});

test("normalizer handles English plurals and descriptors", () => {
  assert.equal(normalizeComparableIngredientName("Fresh Tomatoes"), "tomate");
});

test("normalizer translates common ingredient phrases", () => {
  assert.equal(normalizeComparableIngredientName("Olive oil"), "huile olive");
  assert.equal(normalizeComparableIngredientName("Ground beef"), "boeuf hache");
  assert.equal(normalizeComparableIngredientName("Milk"), "lait");
});

test("catalog comparable values include aliases and translations", () => {
  const values = buildIngredientComparableValues({
    name: "Tomate",
    normalizedName: "tomate",
    slug: "tomate",
    synonyms: ["fresh tomatoes"],
    translations: { en: ["tomatoes"], fr: ["tomates"] },
    alternativeSpellings: [],
    plurals: ["tomates"]
  });

  assert.ok(values.includes("tomate"));
});

test("matcher creates an unknown ingredient with normalized canonical fields", async () => {
  const originalFindOne = Ingredient.findOne;
  const originalFind = Ingredient.find;
  const originalFindOneAndUpdate = Ingredient.findOneAndUpdate;

  Ingredient.findOne = async () => null;
  Ingredient.find = () => ({ limit: async () => [] });
  Ingredient.findOneAndUpdate = async (query, update) => ({
    _id: "ingredient-id",
    ...query,
    ...update.$setOnInsert
  });

  try {
    const ingredient = await matchOrCreateIngredient("Fresh tomatoes", { spoonacularId: 123 });
    assert.equal(ingredient.name, "tomate");
    assert.equal(ingredient.normalizedName, "tomate");
    assert.equal(ingredient.category, "autres");
    assert.equal(ingredient.source, "external");
  } finally {
    Ingredient.findOne = originalFindOne;
    Ingredient.find = originalFind;
    Ingredient.findOneAndUpdate = originalFindOneAndUpdate;
  }
});

test("recipe ingredient normalization preserves original values and standardizes simple units", async () => {
  const originalFindOne = Ingredient.findOne;
  const originalFind = Ingredient.find;
  const originalFindOneAndUpdate = Ingredient.findOneAndUpdate;

  Ingredient.findOne = async () => null;
  Ingredient.find = () => ({ limit: async () => [] });
  Ingredient.findOneAndUpdate = async (query, update) => ({
    _id: "ingredient-id",
    ...query,
    ...update.$setOnInsert
  });

  try {
    const ingredient = await normalizeRecipeIngredient({
      name: "milk",
      original: "2 cups milk",
      amount: 1,
      unit: "kg",
      aisle: "Milk, Eggs, Other Dairy"
    });

    assert.equal(ingredient.originalName, "2 cups milk");
    assert.equal(ingredient.normalizedName, "lait");
    assert.equal(ingredient.unit, "kg");
    assert.equal(ingredient.standardAmount, 1000);
    assert.equal(ingredient.standardUnit, "g");
  } finally {
    Ingredient.findOne = originalFindOne;
    Ingredient.find = originalFind;
    Ingredient.findOneAndUpdate = originalFindOneAndUpdate;
  }
});

test("unit normalization recognizes simple aliases", () => {
  assert.equal(normalizeUnit("tablespoon"), "tbsp");
  assert.equal(normalizeUnit("cl"), "cl");
});

