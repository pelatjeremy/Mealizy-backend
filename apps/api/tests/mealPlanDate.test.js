import test from "node:test";
import assert from "node:assert/strict";
import { MealPlan } from "../src/models/MealPlan.js";
import { Recipe } from "../src/models/Recipe.js";
import {
  createOrReplaceMealPlan,
  listMealPlansForDateRange
} from "../src/services/mealPlanService.js";

const user = { _id: "user-id", householdSize: 2 };

function recipe() {
  return {
    _id: "recipe-id",
    externalId: "recipe-id",
    source: "api",
    title: "Pasta",
    image: "pasta.jpg",
    preparationTime: 20,
    servings: 2,
    nutrition: { calories: 450 },
    ingredients: []
  };
}

function stubRecipeLookup() {
  const originalFindOne = Recipe.findOne;
  Recipe.findOne = () => ({ lean: async () => recipe() });
  return () => {
    Recipe.findOne = originalFindOne;
  };
}

function stubMealPlanWrite() {
  const originalFindOneAndUpdate = MealPlan.findOneAndUpdate;
  const calls = [];

  MealPlan.findOneAndUpdate = async (query, update) => {
    calls.push({ query, update });
    return {
      _id: `plan-${calls.length}`,
      toObject() {
        return {
          _id: this._id,
          ...update
        };
      }
    };
  };

  return {
    calls,
    restore() {
      MealPlan.findOneAndUpdate = originalFindOneAndUpdate;
    }
  };
}

function stubMealPlanFind(plans = []) {
  const originalFind = MealPlan.find;
  const calls = [];

  MealPlan.find = (query) => {
    calls.push(query);
    return { lean: async () => plans };
  };

  return {
    calls,
    restore() {
      MealPlan.find = originalFind;
    }
  };
}

async function createPlan(payload) {
  return createOrReplaceMealPlan(user, {
    date: "2026-06-28",
    mealType: "lunch",
    recipeId: "recipe-id",
    recipeSource: "api",
    ...payload
  });
}

test("creates a meal plan on the selected date", async () => {
  const restoreRecipe = stubRecipeLookup();
  const mealPlan = stubMealPlanWrite();

  try {
    const result = await createPlan({ date: "2026-06-28" });

    assert.equal(result.date, "2026-06-28");
    assert.equal(result.day, "sunday");
    assert.equal(mealPlan.calls[0].query.$or[0].mealDate.toISOString().slice(0, 10), "2026-06-28");
    assert.equal(mealPlan.calls[0].query.day, undefined);
    assert.equal(mealPlan.calls[0].update.weekStartDate.toISOString().slice(0, 10), "2026-06-22");
  } finally {
    mealPlan.restore();
    restoreRecipe();
  }
});

test("creates a meal plan on a future date", async () => {
  const restoreRecipe = stubRecipeLookup();
  const mealPlan = stubMealPlanWrite();

  try {
    const result = await createPlan({ date: "2026-07-02" });

    assert.equal(result.date, "2026-07-02");
    assert.equal(result.day, "thursday");
    assert.equal(mealPlan.calls[0].update.mealDate.toISOString().slice(0, 10), "2026-07-02");
  } finally {
    mealPlan.restore();
    restoreRecipe();
  }
});

test("creates a meal plan on a past date", async () => {
  const restoreRecipe = stubRecipeLookup();
  const mealPlan = stubMealPlanWrite();

  try {
    const result = await createPlan({ date: "2026-06-01" });

    assert.equal(result.date, "2026-06-01");
    assert.equal(result.day, "monday");
  } finally {
    mealPlan.restore();
    restoreRecipe();
  }
});

test("same recipe can be planned on two different dates", async () => {
  const restoreRecipe = stubRecipeLookup();
  const mealPlan = stubMealPlanWrite();

  try {
    await createPlan({ date: "2026-06-28" });
    await createPlan({ date: "2026-06-29" });

    assert.equal(mealPlan.calls.length, 2);
    assert.equal(mealPlan.calls[0].query.$or[0].mealDate.toISOString().slice(0, 10), "2026-06-28");
    assert.equal(mealPlan.calls[1].query.$or[0].mealDate.toISOString().slice(0, 10), "2026-06-29");
  } finally {
    mealPlan.restore();
    restoreRecipe();
  }
});

test("selected date wins over an inconsistent day field", async () => {
  const restoreRecipe = stubRecipeLookup();
  const mealPlan = stubMealPlanWrite();

  try {
    const result = await createPlan({ date: "2026-06-28", day: "monday" });

    assert.equal(result.date, "2026-06-28");
    assert.equal(result.day, "sunday");
    assert.equal(mealPlan.calls[0].update.day, "sunday");
  } finally {
    mealPlan.restore();
    restoreRecipe();
  }
});

test("legacy weekStartDate and day payload is still accepted", async () => {
  const restoreRecipe = stubRecipeLookup();
  const mealPlan = stubMealPlanWrite();

  try {
    const result = await createOrReplaceMealPlan(user, {
      weekStartDate: "2026-06-22",
      day: "sunday",
      mealType: "dinner",
      recipeId: "recipe-id",
      recipeSource: "api"
    });

    assert.equal(result.date, "2026-06-28");
    assert.equal(result.day, "sunday");
  } finally {
    mealPlan.restore();
    restoreRecipe();
  }
});

test("lists meal plans by date range", async () => {
  const restoreRecipe = stubRecipeLookup();
  const mealPlan = stubMealPlanFind([
    {
      _id: "plan-1",
      userId: "user-id",
      mealDate: new Date("2026-06-28T00:00:00.000Z"),
      weekStartDate: new Date("2026-06-22T00:00:00.000Z"),
      day: "sunday",
      mealType: "lunch",
      recipeId: "recipe-id",
      recipeSource: "api",
      servings: 2,
      recipeSnapshot: recipe()
    }
  ]);

  try {
    const result = await listMealPlansForDateRange(user, "2026-06-28", "2026-06-30");

    assert.equal(result.length, 1);
    assert.equal(result[0].date, "2026-06-28");
    assert.equal(mealPlan.calls[0].$or[0].mealDate.$gte.toISOString().slice(0, 10), "2026-06-28");
    assert.equal(mealPlan.calls[0].$or[0].mealDate.$lt.toISOString().slice(0, 10), "2026-07-01");
  } finally {
    mealPlan.restore();
    restoreRecipe();
  }
});
