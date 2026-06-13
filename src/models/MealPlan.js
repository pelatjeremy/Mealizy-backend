import mongoose from "mongoose";

const mealPlanSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    weekStartDate: { type: Date, required: true, index: true },
    day: { type: Number, required: true, min: 0, max: 6 },
    mealType: {
      type: String,
      enum: ["breakfast", "lunch", "dinner", "snack"],
      required: true
    },
    recipeId: { type: String, required: true },
    servings: { type: Number, required: true, min: 1 }
  },
  { timestamps: true }
);

export const MealPlan = mongoose.model("MealPlan", mealPlanSchema);
