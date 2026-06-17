import asyncHandler from "express-async-handler";
import mongoose from "mongoose";
import { MealPlan } from "../models/MealPlan.js";
import { Recipe } from "../models/Recipe.js";
import { listRecipes, getRecipeById, getRecipeSuggestions, listUserRecipes } from "../services/recipeService.js";
import { normalizeIngredientName } from "../utils/normalizeIngredient.js";
import { normalizeUnit } from "../utils/unitConversion.js";

export const searchRecipes = asyncHandler(async (req, res) => {
  res.json(await listRecipes({ q: req.query.q, userId: req.user?._id }));
});

export const myRecipes = asyncHandler(async (req, res) => {
  res.json(await listUserRecipes(req.user));
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

function notFound(message) {
  const error = new Error(message);
  error.statusCode = 404;
  return error;
}

function conflict(message) {
  const error = new Error(message);
  error.statusCode = 409;
  return error;
}

function buildRecipePayload(body) {
  const ingredients = (body.ingredients || []).map((ingredient) => ({
    ingredientName: ingredient.ingredientName,
    normalizedName: ingredient.normalizedName || normalizeIngredientName(ingredient.ingredientName),
    quantity: Number(ingredient.quantity || 0),
    unit: normalizeUnit(ingredient.unit || "unit"),
    category: ingredient.category || "autres"
  }));

  return {
    title: body.title,
    image: body.image || "",
    ingredients,
    instructions: body.instructions || [],
    preparationTime: Number(body.preparationTime || 20),
    servings: Number(body.servings || 2),
    nutrition: body.nutrition || {},
    requiredEquipments: body.requiredEquipments || []
  };
}

export const createCustomRecipe = asyncHandler(async (req, res) => {
  const recipe = await Recipe.create({
    ...buildRecipePayload(req.body),
    source: "user",
    userId: req.user._id
  });
  res.status(201).json(recipe);
});

export const updateCustomRecipe = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw notFound("Recipe not found");

  const recipe = await Recipe.findOne({ _id: req.params.id, userId: req.user._id, source: "user" });
  if (!recipe) throw notFound("Recipe not found");

  Object.assign(recipe, buildRecipePayload(req.body));
  await recipe.save();
  res.json(recipe);
});

export const deleteCustomRecipe = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw notFound("Recipe not found");

  const recipe = await Recipe.findOne({ _id: req.params.id, userId: req.user._id, source: "user" });
  if (!recipe) throw notFound("Recipe not found");

  const plannedCount = await MealPlan.countDocuments({
    userId: req.user._id,
    recipeSource: "user",
    recipeId: String(recipe._id)
  });

  if (plannedCount > 0) {
    throw conflict("Cette recette est utilisée dans un planning. Retirez-la du planning avant de la supprimer.");
  }

  await Recipe.deleteOne({ _id: recipe._id, userId: req.user._id });
  res.status(204).send();
});
