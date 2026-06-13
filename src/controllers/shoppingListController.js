import asyncHandler from "express-async-handler";
import { ShoppingList } from "../models/ShoppingList.js";
import { addCheckedItemsToInventory, generateShoppingList } from "../services/shoppingListService.js";

export const listShoppingLists = asyncHandler(async (req, res) => {
  const filter = { userId: req.user._id };
  if (req.query.weekStartDate) filter.weekStartDate = req.query.weekStartDate;
  const lists = await ShoppingList.find(filter).sort({ weekStartDate: -1 });
  res.json(lists);
});

export const generate = asyncHandler(async (req, res) => {
  const list = await generateShoppingList(req.user, req.body.weekStartDate);
  res.status(201).json(list);
});

export const updateShoppingList = asyncHandler(async (req, res) => {
  const list = await ShoppingList.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    req.body,
    { new: true }
  );
  res.json(list);
});

export const checkShoppingListItem = asyncHandler(async (req, res) => {
  const list = await ShoppingList.findOne({ userId: req.user._id, "items._id": req.params.id });
  if (!list) {
    const error = new Error("Shopping list item not found");
    error.statusCode = 404;
    throw error;
  }

  const item = list.items.id(req.params.id);
  item.checked = Boolean(req.body.checked);
  list.isCompleted = list.items.length > 0 && list.items.every((entry) => entry.checked);
  await list.save();

  if (item.checked && req.body.addToInventory) {
    await addCheckedItemsToInventory(req.user._id, list._id);
  }

  res.json(list);
});

export const addCheckedToInventory = asyncHandler(async (req, res) => {
  res.json(await addCheckedItemsToInventory(req.user._id, req.params.id));
});
