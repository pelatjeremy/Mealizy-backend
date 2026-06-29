import test from "node:test";
import assert from "node:assert/strict";
import { cleanupBetaData } from "../src/services/betaDataCleanupService.js";
import { Ingredient } from "../src/models/Ingredient.js";
import { Recipe } from "../src/models/Recipe.js";
import { User } from "../src/models/User.js";

function stubCleanupModels() {
  const originals = {
    userFindOne: User.findOne,
    recipeCountDocuments: Recipe.countDocuments,
    recipeFind: Recipe.find,
    recipeDeleteMany: Recipe.deleteMany,
    ingredientCountDocuments: Ingredient.countDocuments,
    ingredientFind: Ingredient.find,
    ingredientDeleteMany: Ingredient.deleteMany
  };
  const calls = { recipeDeleteMany: 0, ingredientDeleteMany: 0, recipeQuery: null };

  User.findOne = () => ({ select: () => ({ lean: async () => ({ _id: "demo-user-id", email: "demo@mealizy.app" }) }) });
  Recipe.countDocuments = async (query) => {
    calls.recipeQuery = query;
    return 2;
  };
  Recipe.find = () => ({ limit: () => ({ lean: async () => [{ title: "Dashboard Pates 1781544751176", source: "user" }] }) });
  Recipe.deleteMany = async () => {
    calls.recipeDeleteMany += 1;
    return { deletedCount: 2 };
  };
  Ingredient.countDocuments = async () => 1;
  Ingredient.find = () => ({ limit: () => ({ lean: async () => [{ name: "test ingredient", source: "test" }] }) });
  Ingredient.deleteMany = async () => {
    calls.ingredientDeleteMany += 1;
    return { deletedCount: 1 };
  };

  return {
    calls,
    restore() {
      User.findOne = originals.userFindOne;
      Recipe.countDocuments = originals.recipeCountDocuments;
      Recipe.find = originals.recipeFind;
      Recipe.deleteMany = originals.recipeDeleteMany;
      Ingredient.countDocuments = originals.ingredientCountDocuments;
      Ingredient.find = originals.ingredientFind;
      Ingredient.deleteMany = originals.ingredientDeleteMany;
    }
  };
}

test("beta cleanup dry-run reports matches without deleting data", async () => {
  const stub = stubCleanupModels();

  try {
    const report = await cleanupBetaData();

    assert.equal(report.mode, "dry-run");
    assert.equal(report.recipes.count, 2);
    assert.equal(report.ingredients.count, 1);
    assert.equal(report.deleted.recipes, 0);
    assert.equal(stub.calls.recipeDeleteMany, 0);
    assert.equal(stub.calls.ingredientDeleteMany, 0);
    assert.deepEqual(stub.calls.recipeQuery.$or.at(-1), { userId: "demo-user-id" });
  } finally {
    stub.restore();
  }
});

test("beta cleanup execute deletes only matched demo and test data", async () => {
  const stub = stubCleanupModels();

  try {
    const report = await cleanupBetaData({ execute: true });

    assert.equal(report.mode, "execute");
    assert.equal(report.deleted.recipes, 2);
    assert.equal(report.deleted.ingredients, 1);
    assert.equal(report.usersDeleted, 0);
    assert.equal(stub.calls.recipeDeleteMany, 1);
    assert.equal(stub.calls.ingredientDeleteMany, 1);
  } finally {
    stub.restore();
  }
});
