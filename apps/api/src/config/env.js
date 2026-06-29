import dotenv from "dotenv";
import { randomBytes } from "node:crypto";

dotenv.config();

const corsOrigins = (process.env.CORS_ORIGIN || "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

function readJwtSecret() {
  const jwtSecret = process.env.JWT_SECRET?.trim();
  const isProduction = process.env.NODE_ENV === "production";

  if (jwtSecret) return jwtSecret;

  if (isProduction) {
    throw new Error("JWT_SECRET is required in production");
  }

  console.warn("[startup] JWT_SECRET is missing; using an ephemeral development-only secret");
  return randomBytes(48).toString("hex");
}

export const env = {
  port: process.env.PORT || 4000,
  mongoUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/mealizy",
  jwtSecret: readJwtSecret(),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  corsOrigins,
  spoonacularApiKey: process.env.SPOONACULAR_API_KEY || ""
};
