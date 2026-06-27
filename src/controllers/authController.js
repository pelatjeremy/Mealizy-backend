import asyncHandler from "express-async-handler";
import { User } from "../models/User.js";
import { signToken } from "../services/tokenService.js";

function serializeUser(user) {
  const obj = user.toObject ? user.toObject() : user;
  delete obj.password;
  return obj;
}

export const register = asyncHandler(async (req, res) => {
  const firstname = String(req.body.firstname || req.body.name || "").trim();
  const lastname = String(req.body.lastname || "").trim() || "Mealizy";
  const email = String(req.body.email || "").toLowerCase().trim();
  const password = String(req.body.password || "");

  if (!firstname || !email || password.length < 8) {
    const error = new Error("Prenom, email et mot de passe de 8 caracteres minimum requis");
    error.statusCode = 400;
    throw error;
  }

  const user = await User.create({
    ...req.body,
    firstname,
    lastname,
    email,
    password
  });
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
