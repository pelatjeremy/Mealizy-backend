import asyncHandler from "express-async-handler";
import { ShoppingList } from "../models/ShoppingList.js";
import {
  addCheckedItemsToInventory,
  addShoppingListItemToInventory,
  completeCheckedItems,
  createShoppingListFromRecipe,
  createShoppingListFromRecipeIds,
  deleteShoppingList,
  generateShoppingList,
  getShoppingListById,
  getShoppingListForWeek,
  listRecipeShoppingLists,
  setRecipeShoppingListItemChecked,
  setShoppingListItemChecked
} from "../services/shoppingListService.js";
import { getRecipeById } from "../services/recipeService.js";

function notFound(message) {
  const error = new Error(message);
  error.statusCode = 404;
  return error;
}

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

export const completeShoppingList = asyncHandler(async (req, res) => {
  res.json(await completeCheckedItems(req.user._id, req.body.week || req.query.week));
});

export const listRecipeGeneratedShoppingLists = asyncHandler(async (req, res) => {
  res.json(await listRecipeShoppingLists(req.user._id));
});

export const recipeGeneratedShoppingListDetail = asyncHandler(async (req, res) => {
  res.json(await getShoppingListById(req.user._id, req.params.id));
});

export const generateFromRecipe = asyncHandler(async (req, res) => {
  const recipe = await getRecipeById(req.params.recipeId, req.body.source || req.query.source);
  if (!recipe) throw notFound("Recipe not found");

  res.status(201).json(await createShoppingListFromRecipe(req.user, recipe, { title: req.body.title }));
});

export const generateFromRecipes = asyncHandler(async (req, res) => {
  res.status(201).json(
    await createShoppingListFromRecipeIds(req.user, req.body.recipeIds, {
      title: req.body.title,
      source: req.body.source
    })
  );
});

export const checkRecipeGeneratedShoppingListItem = asyncHandler(async (req, res) => {
  res.json(await setRecipeShoppingListItemChecked(req.user._id, req.params.id, req.params.itemId, req.body.checked));
});

export const removeRecipeGeneratedShoppingList = asyncHandler(async (req, res) => {
  await deleteShoppingList(req.user._id, req.params.id);
  res.status(204).send();
});
