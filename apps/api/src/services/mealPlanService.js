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
  return normalizeDateOnly(value, "weekStartDate");
}

export function normalizeDateOnly(value, fieldName = "date") {
  if (!value) throw badRequest(`${fieldName} is required`);

  const date = new Date(`${String(value).slice(0, 10)}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) throw badRequest(`${fieldName} must be a valid YYYY-MM-DD date`);

  return date;
}

function formatDateOnly(date) {
  return date.toISOString().slice(0, 10);
}

function weekStartFromDate(date) {
  const weekStart = new Date(date);
  const day = weekStart.getUTCDay() || 7;
  weekStart.setUTCDate(weekStart.getUTCDate() - day + 1);
  weekStart.setUTCHours(0, 0, 0, 0);
  return weekStart;
}

function dayFromDate(date) {
  return mealPlanDays[(date.getUTCDay() || 7) - 1];
}

function dateFromLegacySlot(weekStartDate, day) {
  if (!mealPlanDays.includes(day)) throw badRequest("day is invalid");
  const date = new Date(weekStartDate);
  date.setUTCDate(date.getUTCDate() + mealPlanDays.indexOf(day));
  return date;
}

function readMealDate(payload) {
  if (payload.date || payload.mealDate) return normalizeDateOnly(payload.date || payload.mealDate, "date");
  const weekStartDate = normalizeWeekStartDate(payload.weekStartDate);
  return dateFromLegacySlot(weekStartDate, payload.day);
}

function validateSlot({ mealType }) {
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

function buildRecipeSnapshot(recipe) {
  return {
    id: recipe.externalId || String(recipe._id || recipe.id),
    source: recipe.source,
    title: recipe.title || recipe.name,
    image: recipe.image,
    preparationTime: recipe.preparationTime || 0,
    servings: recipe.servings || 1,
    nutrition: recipe.nutrition || {},
    ingredients: recipe.ingredients || []
  };
}

function serializeMealPlan(plan, recipe) {
  const obj = plan.toObject ? plan.toObject() : plan;
  const mealDate = obj.mealDate || dateFromLegacySlot(obj.weekStartDate, obj.day);
  const serializedDate = formatDateOnly(mealDate);
  const resolvedRecipe = recipe || obj.recipeSnapshot;
  const serializedPlan = {
    ...obj,
    mealDate,
    date: serializedDate,
    day: dayFromDate(mealDate)
  };

  return resolvedRecipe
    ? {
        ...serializedPlan,
        recipe: {
          id: resolvedRecipe.externalId || resolvedRecipe.id || String(resolvedRecipe._id),
          source: resolvedRecipe.source || obj.recipeSource,
          title: resolvedRecipe.title || resolvedRecipe.name,
          image: resolvedRecipe.image,
          preparationTime: resolvedRecipe.preparationTime || 0,
          calories: resolvedRecipe.nutrition?.calories || 0,
          servings: resolvedRecipe.servings || 1
        }
      }
    : serializedPlan;
}

export async function listMealPlansForWeek(user, week) {
  const weekStartDate = normalizeWeekStartDate(week);
  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setUTCDate(weekEndDate.getUTCDate() + 7);
  return listMealPlansBetweenDates(user, weekStartDate, weekEndDate, { includeLegacyWeekStartDate: weekStartDate });
}

async function listMealPlansBetweenDates(user, startDate, exclusiveEndDate, options = {}) {
  const plans = await MealPlan.find({
    userId: user._id,
    $or: [
      { mealDate: { $gte: startDate, $lt: exclusiveEndDate } },
      ...(options.includeLegacyWeekStartDate ? [{ mealDate: { $exists: false }, weekStartDate: options.includeLegacyWeekStartDate }] : [])
    ]
  }).lean();

  const serializedPlans = await Promise.all(
    plans.map(async (plan) => {
      const recipe = plan.recipeSnapshot || await getRecipeById(plan.recipeId, plan.recipeSource);
      return serializeMealPlan(plan, recipe);
    })
  );

  return serializedPlans.sort(
    (a, b) => String(a.date).localeCompare(String(b.date)) || mealTypes.indexOf(a.mealType) - mealTypes.indexOf(b.mealType)
  );
}

export async function listMealPlansForDateRange(user, start, end) {
  const startDate = normalizeDateOnly(start, "start");
  const endDate = normalizeDateOnly(end, "end");
  const exclusiveEndDate = new Date(endDate);
  exclusiveEndDate.setUTCDate(exclusiveEndDate.getUTCDate() + 1);

  if (exclusiveEndDate.getTime() <= startDate.getTime()) {
    throw badRequest("end must be greater than or equal to start");
  }

  return listMealPlansBetweenDates(user, startDate, exclusiveEndDate);
}

export async function createOrReplaceMealPlan(user, payload) {
  validateSlot(payload);
  const mealDate = readMealDate(payload);
  const weekStartDate = weekStartFromDate(mealDate);
  const day = dayFromDate(mealDate);
  const recipe = await readRecipe(payload.recipeId, payload.recipeSource);
  const servings = resolveServings(payload.servings, user, recipe);

  const plan = await MealPlan.findOneAndUpdate(
    {
      userId: user._id,
      mealType: payload.mealType,
      $or: [
        { mealDate },
        { mealDate: { $exists: false }, weekStartDate, day }
      ]
    },
    {
      userId: user._id,
      mealDate,
      weekStartDate,
      day,
      mealType: payload.mealType,
      recipeId: payload.recipeId,
      recipeSource: payload.recipeSource,
      recipeSnapshot: buildRecipeSnapshot(recipe),
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
    existing.recipeSnapshot = buildRecipeSnapshot(recipe);
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
