import { Router } from "express";
import {
  addShoppingListItem,
  addCheckedToInventory,
  checkShoppingListItem,
  completeShoppingList,
  generate,
  listShoppingLists,
  updateShoppingList
} from "../controllers/shoppingListController.js";
import { requireAuth } from "../middlewares/authMiddleware.js";

const router = Router();

router.use(requireAuth);
router.get("/", listShoppingLists);
router.post("/generate", generate);
router.post("/complete", completeShoppingList);
router.put("/items/:id/check", checkShoppingListItem);
router.post("/items/:id/add-to-inventory", addShoppingListItem);
router.put("/:id", updateShoppingList);
router.post("/:id/add-checked-to-inventory", addCheckedToInventory);

export default router;
