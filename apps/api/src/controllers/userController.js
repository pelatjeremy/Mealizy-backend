import asyncHandler from "express-async-handler";
import { User } from "../models/User.js";

export const getProfile = asyncHandler(async (req, res) => {
  res.json(req.user);
});

export const updateProfile = asyncHandler(async (req, res) => {
  const allowed = [
    "firstname",
    "lastname",
    "householdSize",
    "enabledMealTypes",
    "availableEquipments",
    "dietaryPreferences",
    "allergies"
  ];
  const update = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
  const user = await User.findByIdAndUpdate(req.user._id, update, { new: true }).select("-password");
  res.json(user);
});
