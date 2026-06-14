import bcrypt from "bcryptjs";
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 8, select: false },
    firstname: { type: String, required: true, trim: true },
    lastname: { type: String, required: true, trim: true },
    householdSize: { type: Number, default: 2, min: 1 },
    enabledMealTypes: {
      type: [String],
      default: ["breakfast", "lunch", "dinner", "snack"]
    },
    availableEquipments: { type: [String], default: ["four", "plaques", "blender"] },
    dietaryPreferences: { type: [String], default: [] },
    allergies: { type: [String], default: [] }
  },
  { timestamps: true }
);

userSchema.pre("save", async function hashPassword(next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

export const User = mongoose.model("User", userSchema);
