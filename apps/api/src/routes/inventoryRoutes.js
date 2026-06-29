import { Router } from "express";
import {
  createInventoryItem,
  deleteInventoryItem,
  expiringSoon,
  listInventory,
  updateInventoryItem
} from "../controllers/inventoryController.js";
import { requireAuth } from "../middlewares/authMiddleware.js";

const router = Router();

router.use(requireAuth);
router.get("/", listInventory);
router.get("/expiring-soon", expiringSoon);
router.post("/", createInventoryItem);
router.patch("/:id", updateInventoryItem);
router.put("/:id", updateInventoryItem);
router.delete("/:id", deleteInventoryItem);

export default router;
