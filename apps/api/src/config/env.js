import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { randomBytes } from "node:crypto";

const configDir = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.resolve(configDir, "../..");
const repoRoot = path.resolve(apiRoot, "../..");
const protectedEnvKeys = new Set(Object.keys(process.env));

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  const parsed = dotenv.parse(readFileSync(filePath));
  for (const [key, value] of Object.entries(parsed)) {
    if (protectedEnvKeys.has(key)) continue;
    process.env[key] = value;
  }
}

[
  path.join(repoRoot, ".env"),
  path.join(apiRoot, ".env"),
  path.join(repoRoot, ".env.local"),
  path.join(apiRoot, ".env.local")
].forEach(loadEnvFile);

export function maskMongoUri(uri = "") {
  try {
    const parsed = new URL(uri);
    if (parsed.password) parsed.password = "***";
    return parsed.toString();
  } catch {
    return uri.replace(/:\/\/([^:]+):([^@]+)@/, "://$1:***@");
  }
}

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
