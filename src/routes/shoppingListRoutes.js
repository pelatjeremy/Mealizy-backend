import { Router } from "express";
import {
  addCheckedToInventory,
  generate,
  listShoppingLists,
  updateShoppingList
} from "../controllers/shoppingListController.js";
import { requireAuth } from "../middlewares/authMiddleware.js";

const router = Router();

router.use(requireAuth);
router.get("/", listShoppingLists);
router.post("/generate", generate);
router.put("/:id", updateShoppingList);
router.post("/:id/add-checked-to-inventory", addCheckedToInventory);

export default router;
