import { Router } from "express";
import { createCustomRecipe, myRecipes, searchRecipes, suggestions } from "../controllers/recipeController.js";
import { optionalAuth, requireAuth } from "../middlewares/authMiddleware.js";

const router = Router();

router.get("/search", optionalAuth, searchRecipes);
router.get("/mine", requireAuth, myRecipes);
router.get("/suggestions", requireAuth, suggestions);
router.post("/", requireAuth, createCustomRecipe);

export default router;
