import mongoose from "mongoose";

export const mealPlanDays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
export const mealTypes = ["breakfast", "lunch", "dinner", "snack"];
export const recipeSources = ["api", "user", "demo"];

const mealPlanSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    weekStartDate: { type: Date, required: true, index: true },
    day: { type: String, enum: mealPlanDays, required: true },
    mealType: {
      type: String,
      enum: mealTypes,
      required: true
    },
    recipeId: { type: String, required: true },
    recipeSource: { type: String, enum: recipeSources, required: true },
    recipeSnapshot: { type: mongoose.Schema.Types.Mixed },
    servings: { type: Number, required: true, min: 1 }
  },
  { timestamps: true }
);

mealPlanSchema.index({ userId: 1, weekStartDate: 1, day: 1, mealType: 1 }, { unique: true });

export const MealPlan = mongoose.model("MealPlan", mealPlanSchema);
