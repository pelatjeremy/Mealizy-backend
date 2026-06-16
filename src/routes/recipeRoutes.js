import { Router } from "express";
import {
  createCustomRecipe,
  deleteCustomRecipe,
  myRecipes,
  searchRecipes,
  suggestions,
  updateCustomRecipe
} from "../controllers/recipeController.js";
import { optionalAuth, requireAuth } from "../middlewares/authMiddleware.js";

const router = Router();

router.get("/search", optionalAuth, searchRecipes);
router.get("/mine", requireAuth, myRecipes);
router.get("/suggestions", requireAuth, suggestions);
router.post("/", requireAuth, createCustomRecipe);
router.put("/:id", requireAuth, updateCustomRecipe);
router.delete("/:id", requireAuth, deleteCustomRecipe);

export default router;
