import asyncHandler from "express-async-handler";
import { InventoryItem } from "../models/InventoryItem.js";
import { findOrCreateIngredient } from "../services/ingredientService.js";
import { Ingredient } from "../models/Ingredient.js";
import { normalizeIngredientName } from "../utils/normalizeIngredient.js";
import { normalizeUnit } from "../utils/unitConversion.js";

export const listInventory = asyncHandler(async (req, res) => {
  const items = await InventoryItem.find({ userId: req.user._id }).populate("ingredientId").sort({ expirationDate: 1 });
  res.json(items);
});

export const createInventoryItem = asyncHandler(async (req, res) => {
  const ingredient = await findOrCreateIngredient({ name: req.body.name, category: req.body.category });
  const item = await InventoryItem.create({
    userId: req.user._id,
    ingredientId: ingredient._id,
    quantity: req.body.quantity,
    unit: normalizeUnit(req.body.unit),
    expirationDate: req.body.expirationDate || undefined
  });
  res.status(201).json(await item.populate("ingredientId"));
});

export const updateInventoryItem = asyncHandler(async (req, res) => {
  const update = {
    quantity: req.body.quantity,
    unit: req.body.unit ? normalizeUnit(req.body.unit) : undefined,
    expirationDate: req.body.expirationDate || undefined
  };
  Object.keys(update).forEach((key) => update[key] === undefined && delete update[key]);

  const item = await InventoryItem.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    update,
    { new: true }
  ).populate("ingredientId");
  if (!item) {
    const error = new Error("Inventory item not found");
    error.statusCode = 404;
    throw error;
  }

  if (req.body.name || req.body.category) {
    const ingredientUpdate = {};
    if (req.body.name) {
      ingredientUpdate.name = req.body.name;
      ingredientUpdate.normalizedName = normalizeIngredientName(req.body.name);
    }
    if (req.body.category) ingredientUpdate.category = req.body.category;
    await Ingredient.findByIdAndUpdate(item.ingredientId._id, ingredientUpdate);
    await item.populate("ingredientId");
  }

  res.json(item);
});

export const deleteInventoryItem = asyncHandler(async (req, res) => {
  await InventoryItem.deleteOne({ _id: req.params.id, userId: req.user._id });
  res.status(204).send();
});

export const expiringSoon = asyncHandler(async (req, res) => {
  const now = new Date();
  const limit = new Date();
  limit.setDate(limit.getDate() + 5);
  const items = await InventoryItem.find({
    userId: req.user._id,
    expirationDate: { $gte: now, $lte: limit }
  }).populate("ingredientId").sort({ expirationDate: 1 });
  res.json(items);
});
