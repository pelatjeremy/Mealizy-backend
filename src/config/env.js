import dotenv from "dotenv";

dotenv.config();

const isProduction = process.env.NODE_ENV === "production";

function requiredEnv(name, fallback = "") {
  const value = process.env[name] || fallback;
  if (isProduction && !value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

export const env = {
  port: process.env.PORT || "4000",
  mongoUri: requiredEnv("MONGODB_URI"),
  jwtSecret: requiredEnv("JWT_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:3000",
  spoonacularApiKey: process.env.SPOONACULAR_API_KEY || ""
};

export function getEnvReadiness() {
  return {
    mongodbUri: Boolean(process.env.MONGODB_URI),
    jwtSecret: Boolean(process.env.JWT_SECRET),
    spoonacularApiKey: Boolean(process.env.SPOONACULAR_API_KEY)
  };
}
