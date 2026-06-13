import mongoose from "mongoose";

const inventoryItemSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    ingredientId: { type: mongoose.Schema.Types.ObjectId, ref: "Ingredient", required: true },
    quantity: { type: Number, required: true, min: 0 },
    unit: {
      type: String,
      enum: ["g", "kg", "ml", "L", "unité", "tranche", "boîte", "pot", "cuillère à soupe", "cuillère à café"],
      required: true
    },
    expirationDate: { type: Date }
  },
  { timestamps: true }
);

export const InventoryItem = mongoose.model("InventoryItem", inventoryItemSchema);
