import asyncHandler from "express-async-handler";
import { Recipe } from "../models/Recipe.js";
import { normalizeIngredientName } from "../utils/normalizeIngredient.js";
import { normalizeUnit } from "../utils/unitConversion.js";
import {
  getRecipeById,
  getRecipeSuggestions,
  importSpoonacularRecipe,
  searchRecipeLibrary,
  searchRecipesLegacy
} from "../services/recipeService.js";
import { getRecipeCompatibilityForUser } from "../services/recipeInventoryMatcher.js";

function badRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function forbidden(message) {
  const error = new Error(message);
  error.statusCode = 403;
  return error;
}

function notFound(message) {
  const error = new Error(message);
  error.statusCode = 404;
  return error;
}

function normalizeRecipePayload(body) {
  const ingredients = Array.isArray(body.ingredients)
    ? body.ingredients
        .map((ingredient) => ({
          ingredientName: String(ingredient.ingredientName || ingredient.name || "").trim(),
          normalizedName: normalizeIngredientName(ingredient.ingredientName || ingredient.name),
          quantity: Number(ingredient.quantity || 0),
          unit: normalizeUnit(ingredient.unit),
          category: String(ingredient.category || "autres").trim().toLowerCase()
        }))
        .filter((ingredient) => ingredient.ingredientName && ingredient.quantity > 0)
    : [];

  if (!String(body.title || "").trim()) {
    throw badRequest("Le titre de la recette est requis");
  }

  if (!ingredients.length) {
    throw badRequest("Ajoutez au moins un ingredient avec une quantite");
  }

  return {
    title: String(body.title).trim(),
    image: String(body.image || "").trim() || "https://images.unsplash.com/photo-1547592180-85f173990554",
    preparationTime: Number(body.preparationTime || 20),
    servings: Number(body.servings || 1),
    ingredients,
    instructions: Array.isArray(body.instructions)
      ? body.instructions.map((instruction) => String(instruction).trim()).filter(Boolean)
      : [],
    nutrition: body.nutrition || {},
    categories: Array.isArray(body.categories) ? body.categories : [],
    summary: String(body.summary || "").trim(),
    description: String(body.description || "").trim(),
    cookingTime: Number(body.cookingTime || 0),
    readyInMinutes: Number(body.readyInMinutes || body.preparationTime || 20),
    requiredEquipments: Array.isArray(body.requiredEquipments) ? body.requiredEquipments : [],
    diets: Array.isArray(body.diets) ? body.diets : [],
    cuisines: Array.isArray(body.cuisines) ? body.cuisines : [],
    tags: Array.isArray(body.tags) ? body.tags : []
  };
}

export const searchRecipes = asyncHandler(async (req, res) => {
  res.json(await searchRecipesLegacy({ q: req.query.q }));
});

export const recipeCatalog = asyncHandler(async (req, res) => {
  const source = req.query.source || "all";
  res.json(
    await searchRecipeLibrary({
      q: req.query.q,
      page: req.query.page,
      limit: req.query.limit,
      source,
      user: req.user,
      filters: req.query
    })
  );
});

export const importFromSpoonacular = asyncHandler(async (req, res) => {
  res.status(201).json(await importSpoonacularRecipe(req.params.id, req.user));
});

export const suggestions = asyncHandler(async (req, res) => {
  res.json(await getRecipeSuggestions(req.user, req.query));
});

export const recipeDetail = asyncHandler(async (req, res) => {
  const recipe = await getRecipeById(req.params.id, req.query.source);
  if (!recipe) {
    res.status(404).json({ message: "Recipe not found" });
    return;
  }

  res.json(recipe);
});

export const recipeCompatibility = asyncHandler(async (req, res) => {
  const recipe = await getRecipeById(req.params.id, req.query.source);
  if (!recipe) throw notFound("Recipe not found");

  res.json(await getRecipeCompatibilityForUser(req.user._id, recipe));
});

export const createCustomRecipe = asyncHandler(async (req, res) => {
  const recipe = await Recipe.create({
    ...normalizeRecipePayload(req.body),
    source: "user",
    userId: req.user._id
  });
  res.status(201).json(recipe);
});

export const updateCustomRecipe = asyncHandler(async (req, res) => {
  const recipe = await Recipe.findById(req.params.id);
  if (!recipe) throw notFound("Recipe not found");
  if (recipe.source !== "user" || String(recipe.userId) !== String(req.user._id)) {
    throw forbidden("Vous ne pouvez modifier que vos recettes personnelles");
  }

  Object.assign(recipe, normalizeRecipePayload(req.body), { source: "user", userId: req.user._id });
  await recipe.save();
  res.json(recipe);
});
