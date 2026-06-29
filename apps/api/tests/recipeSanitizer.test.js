import test from "node:test";
import assert from "node:assert/strict";
import { hasTechnicalRecipeData, sanitizeRecipeData, sanitizeRecipeForApi } from "../src/utils/recipeSanitizer.js";

test("recipe sanitizer removes demo placeholders and technical ingredient labels", () => {
  const cleaned = sanitizeRecipeData({
    title: "Dashboard Pates 1781544751176",
    image: "https://mealizy.local/placeholder.png",
    summary: "seed fixture generated for dashboard tests",
    tags: ["test", "pasta"],
    ingredients: [
      {
        displayName: "prod_index_tomate_42",
        originalName: "tomate",
        quantity: "2",
        unit: "grams",
        category: "prod_category"
      }
    ]
  });

  assert.equal(cleaned.title, "");
  assert.equal(cleaned.image, "");
  assert.equal(cleaned.summary, "");
  assert.deepEqual(cleaned.tags, ["pasta"]);
  assert.equal(cleaned.ingredients[0].displayName, "tomate");
  assert.equal(cleaned.ingredients[0].unit, "g");
  assert.equal(cleaned.ingredients[0].category, "autres");
});

test("recipe sanitizer keeps real recipe fields visible through API output", () => {
  const recipe = sanitizeRecipeForApi({
    title: "Pasta al pomodoro",
    image: "https://example.com/pasta.jpg",
    ingredients: [{ displayName: "tomate", quantity: 2, unit: "unit", category: "legumes" }],
    instructions: ["Cuire les pates"]
  });

  assert.equal(hasTechnicalRecipeData(recipe), false);
  assert.equal(recipe.title, "Pasta al pomodoro");
  assert.equal(recipe.ingredients[0].displayName, "tomate");
  assert.deepEqual(recipe.instructions, ["Cuire les pates"]);
});
