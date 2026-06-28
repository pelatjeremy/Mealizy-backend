import test from "node:test";
import assert from "node:assert/strict";
import { env } from "../src/config/env.js";
import {
  fetchSpoonacularRecipeById,
  searchSpoonacularRecipes,
  SpoonacularApiError
} from "../src/services/spoonacularService.js";

function withSpoonacularKey(value = "test-key") {
  const previousKey = env.spoonacularApiKey;
  env.spoonacularApiKey = value;
  return () => {
    env.spoonacularApiKey = previousKey;
  };
}

function withFetch(handler) {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = handler;
  return () => {
    globalThis.fetch = previousFetch;
  };
}

test("fetchSpoonacularRecipeById maps Spoonacular details into a Mealizy recipe", async () => {
  const restoreKey = withSpoonacularKey();
  const restoreFetch = withFetch(async (url) => {
    assert.match(String(url), /includeNutrition=true/);
    return new Response(JSON.stringify({
      id: 42,
      title: "Tomato pasta",
      image: "pasta.jpg",
      readyInMinutes: 25,
      servings: 2,
      extendedIngredients: [
        { id: 1, name: "tomatoes", original: "2 tomatoes", amount: 2, unit: "" }
      ],
      nutrition: {
        nutrients: [
          { name: "Calories", amount: 450 },
          { name: "Protein", amount: 18 },
          { name: "Carbohydrates", amount: 60 },
          { name: "Fat", amount: 12 }
        ]
      },
      analyzedInstructions: [{ steps: [{ step: "Cook pasta.", equipment: [{ name: "pan" }] }] }]
    }), { status: 200 });
  });

  try {
    const recipe = await fetchSpoonacularRecipeById("42");

    assert.equal(recipe.externalId, "42");
    assert.equal(recipe.sourceProvider, "spoonacular");
    assert.equal(recipe.ingredients[0].normalizedName, "tomatoe");
    assert.equal(recipe.ingredients[0].unit, "unit");
    assert.equal(recipe.nutrition.calories, 450);
    assert.deepEqual(recipe.requiredEquipments, ["pan"]);
  } finally {
    restoreFetch();
    restoreKey();
  }
});

test("searchSpoonacularRecipes returns an empty catalog when no API key is configured", async () => {
  const restoreKey = withSpoonacularKey("");

  try {
    const result = await searchSpoonacularRecipes({ q: "pasta" });

    assert.deepEqual(result, { items: [], total: 0, page: 1, limit: 12, source: "api" });
  } finally {
    restoreKey();
  }
});

test("Spoonacular client classifies quota failures", async () => {
  const restoreKey = withSpoonacularKey();
  const restoreFetch = withFetch(async () =>
    new Response(JSON.stringify({ message: "quota exceeded" }), { status: 429 })
  );

  try {
    await assert.rejects(
      () => searchSpoonacularRecipes({ q: "pasta" }),
      (error) => {
        assert.ok(error instanceof SpoonacularApiError);
        assert.equal(error.reason, "quota_exceeded");
        assert.equal(error.spoonacularStatus, 429);
        return true;
      }
    );
  } finally {
    restoreFetch();
    restoreKey();
  }
});

