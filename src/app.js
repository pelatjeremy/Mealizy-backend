import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { env, getEnvReadiness } from "./config/env.js";
import { errorHandler, notFound } from "./middlewares/errorMiddleware.js";
import authRoutes from "./routes/authRoutes.js";
import inventoryRoutes from "./routes/inventoryRoutes.js";
import mealPlanRoutes from "./routes/mealPlanRoutes.js";
import recipeRoutes from "./routes/recipeRoutes.js";
import shoppingListRoutes from "./routes/shoppingListRoutes.js";
import userRoutes from "./routes/userRoutes.js";

export const app = express();

app.use(helmet());
app.use(cors({ origin: env.corsOrigin, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", app: "Mealizy", env: getEnvReadiness() });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/recipes", recipeRoutes);
app.use("/api/meal-plans", mealPlanRoutes);
app.use("/api/shopping-list", shoppingListRoutes);

app.use(notFound);
app.use(errorHandler);
