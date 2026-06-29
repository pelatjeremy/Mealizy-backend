import test from "node:test";
import assert from "node:assert/strict";
import { env } from "../src/config/env.js";
import { Ingredient } from "../src/models/Ingredient.js";
import { Recipe } from "../src/models/Recipe.js";
import { syncSpoonacularCatalog } from "../src/services/spoonacularSyncService.js";

function withSpoonacularKey(value = "test-key") {
  const previousKey = env.spoonacularApiKey;
  env.spoonacularApiKey = value;
  return () => {
    env.spoonacularApiKey = previousKey;
  };
}

function stubIngredientMatcher() {
  const originalFindOne = Ingredient.findOne;
  const originalFind = Ingredient.find;
  const originalFindOneAndUpdate = Ingredient.findOneAndUpdate;

  Ingredient.findOne = async () => null;
  Ingredient.find = () => ({ limit: async () => [] });
  Ingredient.findOneAndUpdate = async (query, update) => ({
    _id: `ingredient-${query.normalizedName}`,
    ...query,
    ...update.$setOnInsert
  });

  return () => {
    Ingredient.findOne = originalFindOne;
    Ingredient.find = originalFind;
    Ingredient.findOneAndUpdate = originalFindOneAndUpdate;
  };
}

function stubRecipeWrites({ existing = null } = {}) {
  const originalFindOne = Recipe.findOne;
  const originalFindOneAndUpdate = Recipe.findOneAndUpdate;
  const calls = { findOneAndUpdate: [] };

  Recipe.findOne = () => ({ lean: async () => existing });
  Recipe.findOneAndUpdate = async (query, update) => {
    calls.findOneAndUpdate.push({ query, update });
    return {
      _id: existing?._id || "recipe-id",
      ...update.$setOnInsert,
      ...update.$set
    };
  };

  return {
    calls,
    restore() {
      Recipe.findOne = originalFindOne;
      Recipe.findOneAndUpdate = originalFindOneAndUpdate;
    }
  };
}

function withFetch(handler) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = handler;
  return () => {
    globalThis.fetch = originalFetch;
  };
}

test("spoonacular sync creates synced recipes and enriches ingredients", async () => {
  const restoreKey = withSpoonacularKey();
  const restoreIngredients = stubIngredientMatcher();
  const recipeStub = stubRecipeWrites();
  const restoreFetch = withFetch(async (url) => {
    const value = String(url);
    if (value.includes("complexSearch")) {
      return new Response(JSON.stringify({ totalResults: 1, results: [{ id: 42, title: "Pasta" }] }), {
        status: 200,
        headers: { "x-api-quota-left": "149" }
      });
    }

    assert.match(value, /informationBulk/);
    return new Response(JSON.stringify([
      {
        id: 42,
        title: "Pasta",
        readyInMinutes: 20,
        servings: 2,
        extendedIngredients: [{ id: 1, name: "tomatoes", amount: 2, unit: "" }],
        nutrition: { nutrients: [{ name: "Calories", amount: 450 }] }
      }
    ]), { status: 200 });
  });

  try {
    const report = await syncSpoonacularCatalog({ q: "pasta", limit: 1, logger: { warn() {}, error() {} } });

    assert.equal(report.analyzedRecipes, 1);
    assert.equal(report.newRecipes, 1);
    assert.equal(report.updatedRecipes, 0);
    assert.equal(report.ingredientsAnalyzed, 1);
    assert.equal(report.quotaRemaining, 149);
    assert.equal(recipeStub.calls.findOneAndUpdate.length, 1);
    assert.equal(recipeStub.calls.findOneAndUpdate[0].query.externalId, "42");
    assert.equal(recipeStub.calls.findOneAndUpdate[0].update.$set.sourceProvider, "spoonacular");
    assert.equal(recipeStub.calls.findOneAndUpdate[0].update.$set.ingredients[0].ingredientId, "ingredient-tomate");
  } finally {
    restoreFetch();
    recipeStub.restore();
    restoreIngredients();
    restoreKey();
  }
});

test("spoonacular sync reports invalid API key without throwing technical errors", async () => {
  const restoreKey = withSpoonacularKey();
  const restoreFetch = withFetch(async () =>
    new Response(JSON.stringify({ message: "You are not authorized. Invalid API key." }), { status: 401 })
  );

  try {
    const report = await syncSpoonacularCatalog({ q: "pasta", limit: 1, logger: { warn() {}, error() {} } });

    assert.equal(report.analyzedRecipes, 0);
    assert.equal(report.errors.length, 1);
    assert.equal(report.errors[0].reason, "invalid_key");
  } finally {
    restoreFetch();
    restoreKey();
  }
});

test("spoonacular sync ignores duplicate recipe ids from one batch", async () => {
  const restoreKey = withSpoonacularKey();
  const restoreIngredients = stubIngredientMatcher();
  const recipeStub = stubRecipeWrites();
  const restoreFetch = withFetch(async (url) => {
    const value = String(url);
    if (value.includes("complexSearch")) {
      return new Response(JSON.stringify({ totalResults: 2, results: [{ id: 42, title: "Pasta" }, { id: 42, title: "Pasta duplicate" }] }), {
        status: 200
      });
    }

    return new Response(JSON.stringify([
      {
        id: 42,
        title: "Pasta",
        readyInMinutes: 20,
        servings: 2,
        extendedIngredients: [{ id: 1, name: "tomatoes", amount: 2, unit: "" }],
        nutrition: { nutrients: [] }
      },
      {
        id: 42,
        title: "Pasta duplicate",
        readyInMinutes: 20,
        servings: 2,
        extendedIngredients: [],
        nutrition: { nutrients: [] }
      }
    ]), { status: 200 });
  });

  try {
    const report = await syncSpoonacularCatalog({ q: "pasta", limit: 2, logger: { warn() {}, error() {} } });

    assert.equal(report.analyzedRecipes, 1);
    assert.equal(report.duplicatesIgnored, 1);
    assert.equal(recipeStub.calls.findOneAndUpdate.length, 1);
  } finally {
    restoreFetch();
    recipeStub.restore();
    restoreIngredients();
    restoreKey();
  }
});

