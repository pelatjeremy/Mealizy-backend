import asyncHandler from "express-async-handler";
import { User } from "../models/User.js";
import { signToken } from "../services/tokenService.js";

function serializeUser(user) {
  const obj = user.toObject ? user.toObject() : user;
  delete obj.password;
  return obj;
}

export const register = asyncHandler(async (req, res) => {
  const user = await User.create(req.body);
  res.status(201).json({ user: serializeUser(user), token: signToken(user._id) });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: String(email).toLowerCase() }).select("+password");

  if (!user || !(await user.comparePassword(password))) {
    const error = new Error("Invalid credentials");
    error.statusCode = 401;
    throw error;
  }

  res.json({ user: serializeUser(user), token: signToken(user._id) });
});
