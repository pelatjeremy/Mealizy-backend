import { Router } from "express";
import {
  catalogCategories,
  catalogIngredientCreate,
  catalogIngredientDeactivate,
  catalogIngredientDetail,
  catalogIngredientMerge,
  catalogIngredients,
  catalogIngredientSearch,
  catalogIngredientUpdate,
  catalogUnits
} from "../controllers/catalogController.js";
import { requireAuth } from "../middlewares/authMiddleware.js";

const router = Router();

router.get("/ingredients", catalogIngredients);
router.get("/ingredients/search", catalogIngredientSearch);
router.get("/ingredients/:id", catalogIngredientDetail);
router.get("/categories", catalogCategories);
router.get("/units", catalogUnits);

router.post("/ingredients", requireAuth, catalogIngredientCreate);
router.put("/ingredients/:id", requireAuth, catalogIngredientUpdate);
router.post("/ingredients/:id/merge", requireAuth, catalogIngredientMerge);
router.post("/ingredients/:id/deactivate", requireAuth, catalogIngredientDeactivate);

export default router;

