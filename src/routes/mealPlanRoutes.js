import { Router } from "express";
import { editMealPlan, listMealPlans, removeMealPlan, upsertMealPlan } from "../controllers/mealPlanController.js";
import { requireAuth } from "../middlewares/authMiddleware.js";

const router = Router();

router.use(requireAuth);
router.get("/", listMealPlans);
router.post("/", upsertMealPlan);
router.put("/:id", editMealPlan);
router.delete("/:id", removeMealPlan);

export default router;
