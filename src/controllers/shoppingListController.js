import asyncHandler from "express-async-handler";
import { ShoppingList } from "../models/ShoppingList.js";
import { addCheckedItemsToInventory, generateShoppingList } from "../services/shoppingListService.js";

export const listShoppingLists = asyncHandler(async (req, res) => {
  const lists = await ShoppingList.find({ userId: req.user._id }).sort({ weekStartDate: -1 });
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

export const addCheckedToInventory = asyncHandler(async (req, res) => {
  res.json(await addCheckedItemsToInventory(req.user._id, req.params.id));
});
