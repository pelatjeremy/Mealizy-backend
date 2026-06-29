import asyncHandler from "express-async-handler";
import { User } from "../models/User.js";
import { pickAllowedFields } from "../utils/validatePayload.js";

const profileUpdateFields = [
  "firstname",
  "lastname",
  "householdSize",
  "enabledMealTypes",
  "availableEquipments",
  "dietaryPreferences",
  "allergies"
];

export const getProfile = asyncHandler(async (req, res) => {
  res.json(req.user);
});

export const updateProfile = asyncHandler(async (req, res) => {
  const update = pickAllowedFields(req.body, profileUpdateFields, "profil");
  const user = await User.findByIdAndUpdate(req.user._id, update, { new: true, runValidators: true }).select("-password");
  res.json(user);
});
