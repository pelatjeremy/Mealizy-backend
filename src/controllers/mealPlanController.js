import asyncHandler from "express-async-handler";
import {
  createOrReplaceMealPlan,
  deleteMealPlan,
  listMealPlansForWeek,
  updateMealPlan
} from "../services/mealPlanService.js";

export const listMealPlans = asyncHandler(async (req, res) => {
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
