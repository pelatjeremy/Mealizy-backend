import test from "node:test";
import assert from "node:assert/strict";
import { Ingredient } from "../src/models/Ingredient.js";
import { createIngredient, listIngredients } from "../src/services/ingredientService.js";

test("ingredient search escapes regex characters from user input", async () => {
  const originalFind = Ingredient.find;
  const originalCountDocuments = Ingredient.countDocuments;
  let capturedQuery = null;

  Ingredient.find = (query) => {
    capturedQuery = query;
    return {
      sort: () => ({
        skip: () => ({
          limit: () => ({
            lean: async () => []
          })
        })
      })
    };
  };
  Ingredient.countDocuments = async () => 0;

  try {
    await listIngredients({ q: "tomato [" });

    assert.equal(capturedQuery.$or[0].normalizedName.$regex, "tomato");
    assert.equal(capturedQuery.$or[1].name.$regex, "tomato \\[");
    assert.doesNotThrow(() => new RegExp(capturedQuery.$or[1].name.$regex));
  } finally {
    Ingredient.find = originalFind;
    Ingredient.countDocuments = originalCountDocuments;
  }
});

test("ingredient creation validates required catalog category", async () => {
  await assert.rejects(
    () => createIngredient({ name: "Tomate", category: "unknown-category" }),
    /Ingredient category is invalid/
  );
});

