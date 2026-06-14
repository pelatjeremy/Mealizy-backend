import mongoose from "mongoose";
import { normalizeIngredientName } from "../utils/normalizeIngredient.js";

const ingredientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    normalizedName: { type: String, required: true, index: true },
    category: {
      type: String,
      enum: ["fruits-legumes", "epicerie", "produits-laitiers", "viandes-poissons", "surgeles", "autres"],
      default: "autres"
    }
  },
  { timestamps: true }
);

ingredientSchema.pre("validate", function normalize(next) {
  this.normalizedName = this.normalizedName || normalizeIngredientName(this.name);
  next();
});

export const Ingredient = mongoose.model("Ingredient", ingredientSchema);
