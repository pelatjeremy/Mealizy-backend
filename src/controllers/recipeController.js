import asyncHandler from "express-async-handler";
import { Recipe } from "../models/Recipe.js";
import { listRecipes, getRecipeSuggestions, listUserRecipes } from "../services/recipeService.js";
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

export const createCustomRecipe = asyncHandler(async (req, res) => {
  const ingredients = (req.body.ingredients || []).map((ingredient) => ({
    ingredientName: ingredient.ingredientName,
    normalizedName: ingredient.normalizedName || normalizeIngredientName(ingredient.ingredientName),
    quantity: Number(ingredient.quantity || 0),
    unit: normalizeUnit(ingredient.unit || "unit"),
    category: ingredient.category || "autres"
  }));

  const recipe = await Recipe.create({
    title: req.body.title,
    image: req.body.image || "",
    ingredients,
    instructions: req.body.instructions || [],
    preparationTime: Number(req.body.preparationTime || 20),
    servings: Number(req.body.servings || 2),
    nutrition: req.body.nutrition || {},
    requiredEquipments: req.body.requiredEquipments || [],
    source: "user",
    userId: req.user._id
  });
  res.status(201).json(recipe);
});
