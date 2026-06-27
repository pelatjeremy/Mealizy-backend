import { Router } from "express";
import { createCustomRecipe, recipeCatalog, recipeDetail, searchRecipes, suggestions, updateCustomRecipe } from "../controllers/recipeController.js";
import { requireAuth } from "../middlewares/authMiddleware.js";

const router = Router();

router.get("/search", searchRecipes);
router.get("/catalog", requireAuth, recipeCatalog);
router.get("/suggestions", requireAuth, suggestions);
router.get("/:id", recipeDetail);
router.post("/", requireAuth, createCustomRecipe);
router.put("/:id", requireAuth, updateCustomRecipe);

export default router;
