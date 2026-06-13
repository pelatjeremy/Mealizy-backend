import { Router } from "express";
import { deleteMealPlan, listMealPlans, upsertMealPlan } from "../controllers/mealPlanController.js";
import { requireAuth } from "../middlewares/authMiddleware.js";

const router = Router();

router.use(requireAuth);
router.get("/", listMealPlans);
router.post("/", upsertMealPlan);
router.delete("/:id", deleteMealPlan);

export default router;
