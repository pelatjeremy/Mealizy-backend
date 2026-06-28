import test from "node:test";
import assert from "node:assert/strict";
import { Recipe } from "../src/models/Recipe.js";
import { searchRecipeLibrary } from "../src/services/recipeService.js";

function stubRecipeList() {
  const originalFind = Recipe.find;
  const originalCountDocuments = Recipe.countDocuments;
  const calls = { findQuery: null, countQuery: null };

  Recipe.find = (query) => {
    calls.findQuery = query;
    return {
      sort: () => ({
        skip: () => ({
          limit: () => ({
            lean: async () => [
              {
                _id: "recipe-id",
                title: "Synced pasta",
                source: "api",
                sourceProvider: "spoonacular",
                externalId: "42"
              }
            ]
          })
        })
      })
    };
  };
  Recipe.countDocuments = async (query) => {
    calls.countQuery = query;
    return 1;
  };

  return {
    calls,
    restore() {
      Recipe.find = originalFind;
      Recipe.countDocuments = originalCountDocuments;
    }
  };
}

test("recipe library API source searches synced MongoDB recipes only", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error("Spoonacular must not be called by user search");
  };
  const stub = stubRecipeList();

  try {
    const result = await searchRecipeLibrary({ q: "pasta", source: "api", page: 1, limit: 12 });

    assert.equal(result.total, 1);
    assert.equal(result.items[0].title, "Synced pasta");
    assert.equal(result.items[0].isImported, true);
    assert.equal(stub.calls.findQuery.sourceProvider, "spoonacular");
    assert.equal(stub.calls.countQuery.sourceProvider, "spoonacular");
  } finally {
    stub.restore();
    globalThis.fetch = originalFetch;
  }
});

