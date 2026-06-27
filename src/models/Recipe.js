import mongoose from "mongoose";
import { normalizeIngredientName } from "../utils/normalizeIngredient.js";

const nutritionSchema = new mongoose.Schema(
  {
    calories: { type: Number, default: 0 },
    protein: { type: Number, default: 0 },
    carbs: { type: Number, default: 0 },
    fat: { type: Number, default: 0 },
    vitamins: { type: Map, of: String, default: {} }
  },
  { _id: false }
);

const recipeIngredientSchema = new mongoose.Schema(
  {
    ingredientName: { type: String, required: true },
    normalizedName: { type: String, required: true },
    quantity: { type: Number, required: true, min: 0 },
    unit: { type: String, required: true },
    category: { type: String, default: "autres" }
  },
  { _id: false }
);

recipeIngredientSchema.pre("validate", function normalize(next) {
  this.normalizedName = this.normalizedName || normalizeIngredientName(this.ingredientName);
  next();
});

const recipeSchema = new mongoose.Schema(
  {
    source: { type: String, enum: ["api", "user", "demo"], default: "user" },
    externalId: { type: String },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    title: { type: String, required: true },
    image: { type: String, required: true },
    ingredients: { type: [recipeIngredientSchema], default: [] },
    instructions: { type: [String], default: [] },
    preparationTime: { type: Number, default: 20 },
    servings: { type: Number, default: 2 },
    nutrition: { type: nutritionSchema, default: () => ({}) },
    requiredEquipments: { type: [String], default: [] },
    categories: { type: [String], default: [] },
    diets: { type: [String], default: [] }
  },
  { timestamps: true }
);

recipeSchema.index({ source: 1, userId: 1, title: 1 });
recipeSchema.index({ externalId: 1, source: 1 });

export const Recipe = mongoose.model("Recipe", recipeSchema);
