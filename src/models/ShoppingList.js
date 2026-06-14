import mongoose from "mongoose";

const shoppingListItemSchema = new mongoose.Schema(
  {
    ingredientName: { type: String, required: true },
    normalizedName: { type: String, required: true },
    quantity: { type: Number, required: true, min: 0 },
    unit: { type: String, required: true },
    category: { type: String, default: "autres" },
    checked: { type: Boolean, default: false }
  },
  { _id: true }
);

const shoppingListSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    weekStartDate: { type: Date, required: true, index: true },
    items: { type: [shoppingListItemSchema], default: [] },
    generatedAt: { type: Date },
    isCompleted: { type: Boolean, default: false }
  },
  { timestamps: true }
);

shoppingListSchema.index({ userId: 1, weekStartDate: 1 }, { unique: true });

export const ShoppingList = mongoose.model("ShoppingList", shoppingListSchema);
