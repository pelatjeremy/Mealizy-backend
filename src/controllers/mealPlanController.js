import asyncHandler from "express-async-handler";
import { MealPlan } from "../models/MealPlan.js";

export const listMealPlans = asyncHandler(async (req, res) => {
  const filter = { userId: req.user._id };
  if (req.query.weekStartDate) filter.weekStartDate = req.query.weekStartDate;
  const plans = await MealPlan.find(filter).sort({ day: 1, mealType: 1 });
  res.json(plans);
});

export const upsertMealPlan = asyncHandler(async (req, res) => {
  const plan = await MealPlan.findOneAndUpdate(
    {
      userId: req.user._id,
      weekStartDate: req.body.weekStartDate,
      day: req.body.day,
      mealType: req.body.mealType
    },
    { ...req.body, userId: req.user._id },
    { upsert: true, new: true }
  );
  res.status(201).json(plan);
});

export const deleteMealPlan = asyncHandler(async (req, res) => {
  await MealPlan.deleteOne({ _id: req.params.id, userId: req.user._id });
  res.status(204).send();
});
