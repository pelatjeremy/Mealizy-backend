import asyncHandler from "express-async-handler";
import { InventoryItem } from "../models/InventoryItem.js";
import { findOrCreateIngredient } from "../services/ingredientService.js";
import { normalizeUnit } from "../utils/unitConversion.js";
import { pickAllowedFields, rejectUnknownFields } from "../utils/validatePayload.js";

const inventoryCreateFields = ["name", "category", "quantity", "unit", "expirationDate"];
const inventoryUpdateFields = ["name", "category", "quantity", "unit", "expirationDate"];

async function backfillNormalizedNames(items) {
  await Promise.all(items.map(async (item) => {
    if (item.normalizedName || !item.ingredientId?.normalizedName) return;
    item.normalizedName = item.ingredientId.normalizedName;
    await item.save();
  }));
}

export const listInventory = asyncHandler(async (req, res) => {
  const items = await InventoryItem.find({ userId: req.user._id }).populate("ingredientId").sort({ expirationDate: 1 });
  await backfillNormalizedNames(items);
  res.json(items);
});

export const createInventoryItem = asyncHandler(async (req, res) => {
  rejectUnknownFields(req.body, inventoryCreateFields, "inventaire");
  const ingredient = await findOrCreateIngredient({ name: req.body.name, category: req.body.category });
  const item = await InventoryItem.create({
    userId: req.user._id,
    ingredientId: ingredient._id,
    normalizedName: ingredient.normalizedName,
    quantity: req.body.quantity,
    unit: normalizeUnit(req.body.unit),
    expirationDate: req.body.expirationDate
  });
  res.status(201).json(await item.populate("ingredientId"));
});

export const updateInventoryItem = asyncHandler(async (req, res) => {
  const update = pickAllowedFields(req.body, inventoryUpdateFields, "inventaire");
  if (update.unit) update.unit = normalizeUnit(update.unit);
  if (req.body.name) {
    const ingredient = await findOrCreateIngredient({ name: req.body.name, category: req.body.category });
    update.ingredientId = ingredient._id;
    update.normalizedName = ingredient.normalizedName;
    delete update.name;
  }

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
  await backfillNormalizedNames(items);
  res.json(items);
});
