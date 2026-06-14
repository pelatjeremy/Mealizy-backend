import mongoose from "mongoose";
import { normalizeIngredientName } from "../utils/normalizeIngredient.js";

const inventoryUnits = [
  "g",
  "kg",
  "ml",
  "L",
  "l",
  "unit",
  "unite",
  "unité",
  "unitÃ©",
  "tranche",
  "slice",
  "boîte",
  "boÃ®te",
  "can",
  "pot",
  "jar",
  "cuillère à soupe",
  "cuillÃ¨re Ã  soupe",
  "tbsp",
  "cuillère à café",
  "cuillÃ¨re Ã  cafÃ©",
  "tsp"
];

const inventoryItemSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    ingredientId: { type: mongoose.Schema.Types.ObjectId, ref: "Ingredient", required: true },
    normalizedName: { type: String, required: true, index: true },
    quantity: { type: Number, required: true, min: 0 },
    unit: {
      type: String,
      enum: inventoryUnits,
      required: true
    },
    expirationDate: { type: Date }
  },
  { timestamps: true }
);

inventoryItemSchema.pre("validate", async function normalize(next) {
  if (!this.normalizedName && this.populated("ingredientId") && this.ingredientId?.normalizedName) {
    this.normalizedName = this.ingredientId.normalizedName;
  }

  if (!this.normalizedName && this.ingredientId) {
    const Ingredient = mongoose.model("Ingredient");
    const ingredient = await Ingredient.findById(this.ingredientId).select("name normalizedName").lean();
    this.normalizedName = ingredient?.normalizedName || normalizeIngredientName(ingredient?.name || "");
  }

  next();
});

export const InventoryItem = mongoose.model("InventoryItem", inventoryItemSchema);
