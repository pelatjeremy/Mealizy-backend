import test from "node:test";
import assert from "node:assert/strict";
import { MealPlan } from "../src/models/MealPlan.js";
import { Recipe } from "../src/models/Recipe.js";
import { InventoryItem } from "../src/models/InventoryItem.js";
import { ShoppingList } from "../src/models/ShoppingList.js";
import {
  addMealToWeeklyPlan,
  createOrReplaceMealPlan,
  createWeeklyMealPlan,
  generateShoppingListFromWeeklyMealPlan,
  listMealPlansForDateRange,
  moveWeeklyMeal,
  removeWeeklyMeal
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
    ingredients: [
      {
        ingredientId: "tomato-id",
        ingredientName: "Tomate",
        normalizedName: "tomate",
        quantity: 100,
        unit: "g",
        category: "fruits-legumes"
      }
    ]
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

function stubMealPlanDelete() {
  const originalDeleteOne = MealPlan.deleteOne;
  const calls = [];

  MealPlan.deleteOne = async (query) => {
    calls.push(query);
    return { deletedCount: 1 };
  };

  return {
    calls,
    restore() {
      MealPlan.deleteOne = originalDeleteOne;
    }
  };
}

function stubMealPlanFindOne(plan) {
  const originalFindOne = MealPlan.findOne;
  const calls = [];

  MealPlan.findOne = async (query) => {
    calls.push(query);
    return plan;
  };

  return {
    calls,
    restore() {
      MealPlan.findOne = originalFindOne;
    }
  };
}

function writablePlan(overrides = {}) {
  const plan = {
    _id: "plan-id",
    userId: "user-id",
    mealDate: new Date("2026-06-28T00:00:00.000Z"),
    weekStartDate: new Date("2026-06-22T00:00:00.000Z"),
    day: "sunday",
    mealType: "lunch",
    recipeId: "recipe-id",
    recipeSource: "api",
    recipeSnapshot: recipe(),
    servings: 2,
    async save() {
      return this;
    },
    toObject() {
      return { ...this };
    },
    ...overrides
  };
  return plan;
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

test("creates a weekly meal plan envelope", async () => {
  const restoreRecipe = stubRecipeLookup();
  const mealPlan = stubMealPlanFind([]);

  try {
    const result = await createWeeklyMealPlan(user, { start: "2026-06-22" });

    assert.equal(result.weekStartDate, "2026-06-22");
    assert.equal(result.status, "empty");
    assert.equal(result.meals.length, 0);
    assert.equal(mealPlan.calls[0].userId, "user-id");
  } finally {
    mealPlan.restore();
    restoreRecipe();
  }
});

test("adds a recipe to a weekly meal plan", async () => {
  const restoreRecipe = stubRecipeLookup();
  const mealPlan = stubMealPlanWrite();

  try {
    const result = await addMealToWeeklyPlan(user, "2026-06-22", {
      day: "tuesday",
      mealType: "dinner",
      recipeId: "recipe-id",
      recipeSource: "api"
    });

    assert.equal(result.date, "2026-06-23");
    assert.equal(result.mealType, "dinner");
    assert.equal(mealPlan.calls[0].query.userId, "user-id");
  } finally {
    mealPlan.restore();
    restoreRecipe();
  }
});

test("adds a recipe to any selected date in the displayed week", async () => {
  const restoreRecipe = stubRecipeLookup();
  const mealPlan = stubMealPlanWrite();

  try {
    const result = await addMealToWeeklyPlan(user, "2026-06-22", {
      date: "2026-06-26",
      mealType: "lunch",
      recipeId: "recipe-id",
      recipeSource: "api"
    });

    assert.equal(result.date, "2026-06-26");
    assert.equal(result.day, "friday");
    assert.equal(mealPlan.calls[0].update.mealDate.toISOString().slice(0, 10), "2026-06-26");
  } finally {
    mealPlan.restore();
    restoreRecipe();
  }
});

test("removes a meal from a weekly meal plan with user isolation", async () => {
  const mealPlan = stubMealPlanDelete();

  try {
    await removeWeeklyMeal(user, "2026-06-22", "plan-id");

    assert.deepEqual(mealPlan.calls[0], { _id: "plan-id", userId: "user-id" });
  } finally {
    mealPlan.restore();
  }
});

test("moves a planned meal to another day and meal type", async () => {
  const restoreRecipe = stubRecipeLookup();
  const plan = writablePlan();
  const mealPlan = stubMealPlanFindOne(plan);

  try {
    const result = await moveWeeklyMeal(user, "2026-06-22", "plan-id", { day: "monday", mealType: "dinner" });

    assert.equal(result.date, "2026-06-22");
    assert.equal(result.day, "monday");
    assert.equal(result.mealType, "dinner");
    assert.equal(mealPlan.calls[0].userId, "user-id");
  } finally {
    mealPlan.restore();
    restoreRecipe();
  }
});

test("generates a shopping list from a weekly meal plan", async () => {
  const originalInventoryFind = InventoryItem.find;
  const originalShoppingCreate = ShoppingList.create;
  const restoreRecipe = stubRecipeLookup();
  const mealPlan = stubMealPlanFind([
    {
      _id: "plan-id",
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

  InventoryItem.find = () => ({ populate: () => ({ lean: async () => [] }) });
  ShoppingList.create = async (payload) => ({ _id: "shopping-list-id", ...payload });

  try {
    const result = await generateShoppingListFromWeeklyMealPlan(user, "2026-06-22");

    assert.equal(result.title, "Courses semaine 2026-06-22");
    assert.equal(result.items.length, 1);
    assert.equal(result.items[0].sourceRecipes[0].recipeId, "recipe-id");
  } finally {
    mealPlan.restore();
    restoreRecipe();
    InventoryItem.find = originalInventoryFind;
    ShoppingList.create = originalShoppingCreate;
  }
});
