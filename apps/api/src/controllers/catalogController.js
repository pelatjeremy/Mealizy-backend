import asyncHandler from "express-async-handler";
import {
  createIngredient,
  deactivateIngredient,
  getIngredientById,
  listIngredients,
  mergeIngredients,
  searchIngredients,
  updateIngredient
} from "../services/ingredientService.js";
import { listIngredientCategories } from "../services/categoryService.js";
import { listIngredientUnits } from "../services/unitService.js";

export const catalogIngredients = asyncHandler(async (req, res) => {
  res.json(await listIngredients(req.query));
});

export const catalogIngredientSearch = asyncHandler(async (req, res) => {
  res.json(await searchIngredients(req.query));
});

export const catalogIngredientDetail = asyncHandler(async (req, res) => {
  res.json(await getIngredientById(req.params.id));
});

export const catalogIngredientCreate = asyncHandler(async (req, res) => {
  res.status(201).json(await createIngredient(req.body));
});

export const catalogIngredientUpdate = asyncHandler(async (req, res) => {
  res.json(await updateIngredient(req.params.id, req.body));
});

export const catalogIngredientDeactivate = asyncHandler(async (req, res) => {
  res.json(await deactivateIngredient(req.params.id));
});

export const catalogIngredientMerge = asyncHandler(async (req, res) => {
  res.json(await mergeIngredients(req.params.id, req.body.targetId));
});

export const catalogCategories = asyncHandler(async (_req, res) => {
  res.json(await listIngredientCategories());
});

export const catalogUnits = asyncHandler(async (_req, res) => {
  res.json(await listIngredientUnits());
});

