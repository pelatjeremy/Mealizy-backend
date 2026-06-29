import { Router } from "express";
import { getProfile, updateProfile } from "../controllers/userController.js";
import { requireAuth } from "../middlewares/authMiddleware.js";

const router = Router();

router.get("/profile", requireAuth, getProfile);
router.put("/profile", requireAuth, updateProfile);

export default router;
