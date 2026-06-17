import { Router } from "express";
import { createCustomRecipe, recipeDetail, searchRecipes, suggestions } from "../controllers/recipeController.js";
import { requireAuth } from "../middlewares/authMiddleware.js";

const router = Router();

router.get("/search", searchRecipes);
router.get("/suggestions", requireAuth, suggestions);
router.get("/:id", recipeDetail);
router.post("/", requireAuth, createCustomRecipe);

export default router;
