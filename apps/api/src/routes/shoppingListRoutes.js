import { Router } from "express";
import {
  addShoppingListItem,
  addCheckedToInventory,
  checkShoppingListItem,
  checkRecipeGeneratedShoppingListItem,
  completeShoppingList,
  generate,
  generateFromRecipe,
  generateFromRecipes,
  listShoppingLists,
  listRecipeGeneratedShoppingLists,
  recipeGeneratedShoppingListDetail,
  removeRecipeGeneratedShoppingList,
  updateShoppingList
} from "../controllers/shoppingListController.js";
import { requireAuth } from "../middlewares/authMiddleware.js";

const router = Router();

router.use(requireAuth);
router.get("/", listShoppingLists);
router.post("/generate", generate);
router.post("/from-recipe/:recipeId", generateFromRecipe);
router.post("/from-recipes", generateFromRecipes);
router.post("/complete", completeShoppingList);
router.put("/items/:id/check", checkShoppingListItem);
router.post("/items/:id/add-to-inventory", addShoppingListItem);
router.get("/:id", recipeGeneratedShoppingListDetail);
router.patch("/:id/items/:itemId/check", checkRecipeGeneratedShoppingListItem);
router.delete("/:id", removeRecipeGeneratedShoppingList);
router.put("/:id", updateShoppingList);
router.post("/:id/add-checked-to-inventory", addCheckedToInventory);

export const recipeShoppingListRouter = Router();

recipeShoppingListRouter.use(requireAuth);
recipeShoppingListRouter.get("/", listRecipeGeneratedShoppingLists);
recipeShoppingListRouter.post("/from-recipe/:recipeId", generateFromRecipe);
recipeShoppingListRouter.post("/from-recipes", generateFromRecipes);
recipeShoppingListRouter.get("/:id", recipeGeneratedShoppingListDetail);
recipeShoppingListRouter.patch("/:id/items/:itemId/check", checkRecipeGeneratedShoppingListItem);
recipeShoppingListRouter.delete("/:id", removeRecipeGeneratedShoppingList);

export default router;
