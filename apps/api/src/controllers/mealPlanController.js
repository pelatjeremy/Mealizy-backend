import asyncHandler from "express-async-handler";
import {
  addMealToWeeklyPlan,
  createWeeklyMealPlan,
  createOrReplaceMealPlan,
  deleteMealPlan,
  generateShoppingListFromWeeklyMealPlan,
  getWeeklyMealPlan,
  listMealPlansForDateRange,
  listMealPlansForWeek,
  moveWeeklyMeal,
  removeWeeklyMeal,
  updateMealPlan
} from "../services/mealPlanService.js";

export const listMealPlans = asyncHandler(async (req, res) => {
  if (req.query.start || req.query.end) {
    res.json(await listMealPlansForDateRange(req.user, req.query.start, req.query.end));
    return;
  }

  res.json(await listMealPlansForWeek(req.user, req.query.week));
});

export const upsertMealPlan = asyncHandler(async (req, res) => {
  res.status(201).json(await createOrReplaceMealPlan(req.user, req.body));
});

export const editMealPlan = asyncHandler(async (req, res) => {
  res.json(await updateMealPlan(req.user, req.params.id, req.body));
});

export const removeMealPlan = asyncHandler(async (req, res) => {
  await deleteMealPlan(req.user, req.params.id);
  res.status(204).send();
});

export const weeklyMealPlan = asyncHandler(async (req, res) => {
  res.json(await getWeeklyMealPlan(req.user, req.query.start || req.query.week));
});

export const createWeek = asyncHandler(async (req, res) => {
  res.status(201).json(await createWeeklyMealPlan(req.user, req.body));
});

export const addWeekMeal = asyncHandler(async (req, res) => {
  res.status(201).json(await addMealToWeeklyPlan(req.user, req.params.id, req.body));
});

export const moveWeekMeal = asyncHandler(async (req, res) => {
  res.json(await moveWeeklyMeal(req.user, req.params.id, req.params.mealId, req.body));
});

export const removeWeekMeal = asyncHandler(async (req, res) => {
  await removeWeeklyMeal(req.user, req.params.id, req.params.mealId);
  res.status(204).send();
});

export const generateWeekShoppingList = asyncHandler(async (req, res) => {
  res.status(201).json(await generateShoppingListFromWeeklyMealPlan(req.user, req.params.id));
});
