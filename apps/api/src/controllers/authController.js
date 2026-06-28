import asyncHandler from "express-async-handler";
import { User } from "../models/User.js";
import { signToken } from "../services/tokenService.js";

function authError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function isDuplicateEmailError(error) {
  return error?.code === 11000 && (error?.keyPattern?.email || error?.keyValue?.email);
}

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

  if (!firstname) throw authError("Le prenom est requis");
  if (!email) throw authError("L'email est requis");
  if (password.length < 8) throw authError("Le mot de passe doit contenir au moins 8 caracteres");

  try {
    const user = await User.create({
      ...req.body,
      firstname,
      lastname,
      email,
      password
    });
    res.status(201).json({ user: serializeUser(user), token: signToken(user._id) });
  } catch (error) {
    if (isDuplicateEmailError(error)) {
      throw authError("Un compte existe deja avec cet email", 409);
    }
    throw error;
  }
});

export const login = asyncHandler(async (req, res) => {
  const email = String(req.body.email || "").toLowerCase().trim();
  const password = String(req.body.password || "");

  if (!email || !password) {
    throw authError("Email et mot de passe requis");
  }

  const user = await User.findOne({ email }).select("+password");

  if (!user || !(await user.comparePassword(password))) {
    throw authError("Email ou mot de passe incorrect", 401);
  }

  res.json({ user: serializeUser(user), token: signToken(user._id) });
});
