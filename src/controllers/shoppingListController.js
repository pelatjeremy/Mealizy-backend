import asyncHandler from "express-async-handler";
import { ShoppingList } from "../models/ShoppingList.js";
import {
  addCheckedItemsToInventory,
  addShoppingListItemToInventory,
  generateShoppingList,
  getShoppingListForWeek,
  setShoppingListItemChecked
} from "../services/shoppingListService.js";

export const listShoppingLists = asyncHandler(async (req, res) => {
  if (req.query.week) {
    const list = await getShoppingListForWeek(req.user, req.query.week);
    res.json(list || { weekStartDate: req.query.week, items: [] });
    return;
  }

  const lists = await ShoppingList.find({ userId: req.user._id }).sort({ weekStartDate: -1 });
  res.json(lists);
});

export const generate = asyncHandler(async (req, res) => {
  const list = await generateShoppingList(req.user, req.body.week || req.body.weekStartDate);
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

export const checkShoppingListItem = asyncHandler(async (req, res) => {
  res.json(await setShoppingListItemChecked(req.user._id, req.params.id, req.body.checked));
});

export const addShoppingListItem = asyncHandler(async (req, res) => {
  res.json(await addShoppingListItemToInventory(req.user._id, req.params.id));
});
