import jwt from "jsonwebtoken";
import asyncHandler from "express-async-handler";
import { env } from "../config/env.js";
import { User } from "../models/User.js";

export const requireAuth = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    const error = new Error("Authentication required");
    error.statusCode = 401;
    throw error;
  }

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch {
    const error = new Error("Invalid or expired token");
    error.statusCode = 401;
    throw error;
  }

  const user = await User.findById(payload.sub).select("-password");

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 401;
    throw error;
  }

  req.user = user;
  next();
});
