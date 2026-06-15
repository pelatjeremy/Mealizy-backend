import { MealPlan, mealPlanDays, mealTypes, recipeSources } from "../models/MealPlan.js";
import { getRecipeById } from "./recipeService.js";

function badRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function notFound(message) {
  const error = new Error(message);
  error.statusCode = 404;
  return error;
}

export function normalizeWeekStartDate(value) {
  if (!value) throw badRequest("weekStartDate is required");

  const date = new Date(`${String(value).slice(0, 10)}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) throw badRequest("weekStartDate must be a valid YYYY-MM-DD date");

  return date;
}

function validateSlot({ day, mealType }) {
  if (!mealPlanDays.includes(day)) throw badRequest("day is invalid");
  if (!mealTypes.includes(mealType)) throw badRequest("mealType is invalid");
}

function validateRecipeSource(recipeSource) {
  if (!recipeSources.includes(recipeSource)) throw badRequest("recipeSource is invalid");
}

async function readRecipe(recipeId, recipeSource) {
  if (!recipeId) throw badRequest("recipeId is required");
  validateRecipeSource(recipeSource);

  const recipe = await getRecipeById(recipeId, recipeSource);
  if (!recipe) throw notFound("Recipe not found");

  return recipe;
}

function resolveServings(requestedServings, user, recipe) {
  const explicitServings = Number(requestedServings);
  if (Number.isFinite(explicitServings) && explicitServings >= 1) return Math.round(explicitServings);

  const householdSize = Number(user.householdSize);
  if (Number.isFinite(householdSize) && householdSize >= 1) return Math.round(householdSize);

  const recipeServings = Number(recipe.servings);
  return Number.isFinite(recipeServings) && recipeServings >= 1 ? Math.round(recipeServings) : 1;
}

function serializeRecipeForPlanning(recipe) {
  return {
    id: recipe.externalId || String(recipe._id),
    source: recipe.source,
    title: recipe.title || recipe.name,
    image: recipe.image,
    preparationTime: recipe.preparationTime || 0,
    calories: recipe.nutrition?.calories || 0,
    servings: recipe.servings || 1,
    ingredients: (recipe.ingredients || []).map((ingredient) => ({ ...ingredient })),
    instructions: [...(recipe.instructions || [])],
    nutrition: { ...(recipe.nutrition || {}) }
  };
}

function serializeMealPlan(plan, recipe) {
  const obj = plan.toObject ? plan.toObject() : plan;
  return recipe
    ? {
        ...obj,
        recipe: serializeRecipeForPlanning(recipe)
      }
    : obj;
}

export async function listMealPlansForWeek(user, week) {
  const weekStartDate = normalizeWeekStartDate(week);
  const plans = await MealPlan.find({ userId: user._id, weekStartDate }).lean();

  const serializedPlans = await Promise.all(
    plans.map(async (plan) => {
      const recipe = await getRecipeById(plan.recipeId, plan.recipeSource);
      return serializeMealPlan(plan, recipe);
    })
  );

  return serializedPlans.sort(
    (a, b) => mealPlanDays.indexOf(a.day) - mealPlanDays.indexOf(b.day) || mealTypes.indexOf(a.mealType) - mealTypes.indexOf(b.mealType)
  );
}

export async function createOrReplaceMealPlan(user, payload) {
  validateSlot(payload);
  const weekStartDate = normalizeWeekStartDate(payload.weekStartDate);
  const recipe = await readRecipe(payload.recipeId, payload.recipeSource);
  const servings = resolveServings(payload.servings, user, recipe);

  const plan = await MealPlan.findOneAndUpdate(
    {
      userId: user._id,
      weekStartDate,
      day: payload.day,
      mealType: payload.mealType
    },
    {
      userId: user._id,
      weekStartDate,
      day: payload.day,
      mealType: payload.mealType,
      recipeId: payload.recipeId,
      recipeSource: payload.recipeSource,
      servings
    },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  );

  return serializeMealPlan(plan, recipe);
}

export async function updateMealPlan(user, id, payload) {
  const existing = await MealPlan.findOne({ _id: id, userId: user._id });
  if (!existing) throw notFound("Meal plan not found");

  let recipe = await getRecipeById(existing.recipeId, existing.recipeSource);
  if (payload.recipeId || payload.recipeSource) {
    const recipeId = payload.recipeId || existing.recipeId;
    const recipeSource = payload.recipeSource || existing.recipeSource;
    recipe = await readRecipe(recipeId, recipeSource);
    existing.recipeId = recipeId;
    existing.recipeSource = recipeSource;
  }

  if (payload.servings !== undefined) {
    existing.servings = resolveServings(payload.servings, user, recipe || {});
  }

  await existing.save();
  return serializeMealPlan(existing, recipe);
}

export async function deleteMealPlan(user, id) {
  const result = await MealPlan.deleteOne({ _id: id, userId: user._id });
  if (!result.deletedCount) throw notFound("Meal plan not found");
}
