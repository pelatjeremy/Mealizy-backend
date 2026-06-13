import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export function signToken(userId) {
  if (!env.jwtSecret) {
    throw new Error("JWT_SECRET is required");
  }
  return jwt.sign({ sub: userId }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}
