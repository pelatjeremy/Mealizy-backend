import asyncHandler from "express-async-handler";
import { Recipe } from "../models/Recipe.js";
import { listRecipes, getRecipeSuggestions } from "../services/recipeService.js";

export const searchRecipes = asyncHandler(async (req, res) => {
  res.json(await listRecipes({ q: req.query.q }));
});

export const suggestions = asyncHandler(async (req, res) => {
  res.json(await getRecipeSuggestions(req.user));
});

export const createCustomRecipe = asyncHandler(async (req, res) => {
  const recipe = await Recipe.create({ ...req.body, source: "user", userId: req.user._id });
  res.status(201).json(recipe);
});
