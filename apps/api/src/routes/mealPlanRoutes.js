import { Router } from "express";
import {
  addWeekMeal,
  createWeek,
  editMealPlan,
  generateWeekShoppingList,
  listMealPlans,
  moveWeekMeal,
  removeMealPlan,
  removeWeekMeal,
  upsertMealPlan,
  weeklyMealPlan
} from "../controllers/mealPlanController.js";
import { requireAuth } from "../middlewares/authMiddleware.js";

const router = Router();

router.use(requireAuth);
router.get("/week", weeklyMealPlan);
router.post("/week", createWeek);
router.post("/:id/meals", addWeekMeal);
router.patch("/:id/meals/:mealId", moveWeekMeal);
router.delete("/:id/meals/:mealId", removeWeekMeal);
router.post("/:id/shopping-list", generateWeekShoppingList);
router.get("/", listMealPlans);
router.post("/", upsertMealPlan);
router.put("/:id", editMealPlan);
router.delete("/:id", removeMealPlan);

export default router;
