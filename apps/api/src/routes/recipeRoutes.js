import { Router } from "express";
import {
  createCustomRecipe,
  importFromSpoonacular,
  recipeCompatibility,
  recipeCatalog,
  recipeDetail,
  searchRecipes,
  suggestions,
  updateCustomRecipe
} from "../controllers/recipeController.js";
import { requireAuth } from "../middlewares/authMiddleware.js";

const router = Router();

router.get("/search", searchRecipes);
router.get("/catalog", requireAuth, recipeCatalog);
router.get("/suggestions", requireAuth, suggestions);
router.post("/import/spoonacular/:id", requireAuth, importFromSpoonacular);
router.get("/:id/compatibility", requireAuth, recipeCompatibility);
router.get("/:id", recipeDetail);
router.post("/", requireAuth, createCustomRecipe);
router.put("/:id", requireAuth, updateCustomRecipe);

export default router;
