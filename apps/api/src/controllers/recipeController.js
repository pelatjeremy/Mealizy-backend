import asyncHandler from "express-async-handler";
import { Recipe } from "../models/Recipe.js";
import { listRecipes, getRecipeById, getRecipeSuggestions } from "../services/recipeService.js";

export const searchRecipes = asyncHandler(async (req, res) => {
  res.json(await listRecipes({ q: req.query.q }));
});

export const suggestions = asyncHandler(async (req, res) => {
  res.json(await getRecipeSuggestions(req.user));
});

export const recipeDetail = asyncHandler(async (req, res) => {
  const recipe = await getRecipeById(req.params.id, req.query.source);
  if (!recipe) {
    res.status(404).json({ message: "Recipe not found" });
    return;
  }

  res.json(recipe);
});

export const createCustomRecipe = asyncHandler(async (req, res) => {
  const recipe = await Recipe.create({ ...req.body, source: "user", userId: req.user._id });
  res.status(201).json(recipe);
});
