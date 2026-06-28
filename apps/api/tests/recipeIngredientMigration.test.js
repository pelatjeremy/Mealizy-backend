import test from "node:test";
import assert from "node:assert/strict";
import { Ingredient } from "../src/models/Ingredient.js";
import {
  isRecipeIngredientsMigrated,
  migrateRecipeIngredients
} from "../src/services/recipeIngredientMigrationService.js";

function stubIngredientModel({ existingIngredient = null } = {}) {
  const originalFindOne = Ingredient.findOne;
  const originalFind = Ingredient.find;
  const originalFindOneAndUpdate = Ingredient.findOneAndUpdate;
  const calls = { findOneAndUpdate: 0 };

  Ingredient.findOne = async () => existingIngredient;
  Ingredient.find = () => ({ limit: async () => [] });
  Ingredient.findOneAndUpdate = async (query, update) => {
    calls.findOneAndUpdate += 1;
    return {
      _id: "created-ingredient-id",
      ...query,
      ...update.$setOnInsert
    };
  };

  return {
    calls,
    restore() {
      Ingredient.findOne = originalFindOne;
      Ingredient.find = originalFind;
      Ingredient.findOneAndUpdate = originalFindOneAndUpdate;
    }
  };
}

function legacyRecipe(overrides = {}) {
  return {
    _id: "recipe-id",
    title: "Legacy pasta",
    ingredients: [{ ingredientName: "Tomates", quantity: 2, unit: "unit", category: "fruits-legumes" }],
    saved: false,
    async save() {
      this.saved = true;
      return this;
    },
    ...overrides
  };
}

test("legacy recipe ingredients are migrated and original values are backed up", async () => {
  const model = stubIngredientModel({
    existingIngredient: {
      _id: "tomato-id",
      name: "Tomate",
      normalizedName: "tomate",
      category: "fruits-legumes",
      image: "tomato.png"
    }
  });
  const recipe = legacyRecipe();

  try {
    const result = await migrateRecipeIngredients(recipe, { dryRun: false, now: new Date("2026-06-27T00:00:00Z") });

    assert.equal(result.migrated, true);
    assert.equal(recipe.saved, true);
    assert.equal(recipe.ingredients[0].ingredientId, "tomato-id");
    assert.equal(recipe.ingredients[0].originalName, "Tomates");
    assert.equal(recipe.ingredients[0].displayName, "Tomates");
    assert.equal(recipe.ingredients[0].normalizedName, "tomate");
    assert.equal(recipe.ingredients[0].amount, 2);
    assert.equal(recipe.ingredients[0].originalUnit, "unit");
    assert.equal(recipe.ingredients[0].standardAmount, 2);
    assert.equal(recipe.ingredients[0].standardUnit, "unit");
    assert.equal(recipe.ingredients[0].sourceMetadata.migratedBy, "recipeIngredientMigration");
    assert.deepEqual(recipe.migrationMetadata.originalIngredientsBackup, [
      { ingredientName: "Tomates", quantity: 2, unit: "unit", category: "fruits-legumes" }
    ]);
  } finally {
    model.restore();
  }
});

test("already enriched recipe is skipped", async () => {
  const model = stubIngredientModel();
  const recipe = legacyRecipe({
    ingredients: [
      {
        ingredientId: "tomato-id",
        ingredientName: "Tomate",
        originalName: "Tomates",
        displayName: "Tomates",
        normalizedName: "tomate",
        quantity: 2,
        amount: 2,
        unit: "unit",
        originalUnit: "unit",
        standardAmount: 2,
        standardUnit: "unit",
        aisle: "",
        image: "",
        sourceMetadata: {}
      }
    ]
  });

  try {
    const result = await migrateRecipeIngredients(recipe, { dryRun: false });

    assert.equal(isRecipeIngredientsMigrated(recipe), true);
    assert.equal(result.skipped, true);
    assert.equal(recipe.saved, false);
    assert.equal(model.calls.findOneAndUpdate, 0);
  } finally {
    model.restore();
  }
});

test("unknown ingredient is created in write mode", async () => {
  const model = stubIngredientModel();
  const recipe = legacyRecipe({
    ingredients: [{ ingredientName: "Mystery leaf", quantity: 1, unit: "g", category: "autres" }]
  });

  try {
    const result = await migrateRecipeIngredients(recipe, { dryRun: false });

    assert.equal(result.ingredientsCreated, 1);
    assert.equal(model.calls.findOneAndUpdate, 1);
    assert.equal(recipe.ingredients[0].ingredientId, "created-ingredient-id");
    assert.equal(recipe.saved, true);
  } finally {
    model.restore();
  }
});

test("dry-run reports unknown ingredient creation without writing", async () => {
  const model = stubIngredientModel();
  const recipe = legacyRecipe({
    ingredients: [{ ingredientName: "Mystery leaf", quantity: 1, unit: "g", category: "autres" }]
  });

  try {
    const result = await migrateRecipeIngredients(recipe, { dryRun: true });

    assert.equal(result.ingredientsCreated, 1);
    assert.equal(model.calls.findOneAndUpdate, 0);
    assert.equal(recipe.saved, false);
    assert.equal(recipe.ingredients[0].ingredientName, "Mystery leaf");
  } finally {
    model.restore();
  }
});

test("rerunning migration on enriched recipe does not create duplicates", async () => {
  const model = stubIngredientModel();
  const recipe = legacyRecipe({
    ingredients: [
      {
        ingredientId: "created-ingredient-id",
        ingredientName: "Mystery leaf",
        originalName: "Mystery leaf",
        displayName: "Mystery leaf",
        normalizedName: "mystery leaf",
        quantity: 1,
        amount: 1,
        unit: "g",
        originalUnit: "g",
        standardAmount: 1,
        standardUnit: "g",
        aisle: "",
        image: "",
        sourceMetadata: { migratedBy: "recipeIngredientMigration" }
      }
    ]
  });

  try {
    const result = await migrateRecipeIngredients(recipe, { dryRun: false });

    assert.equal(result.skipped, true);
    assert.equal(model.calls.findOneAndUpdate, 0);
    assert.equal(recipe.saved, false);
  } finally {
    model.restore();
  }
});
