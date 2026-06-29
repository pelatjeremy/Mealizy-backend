import mongoose from "mongoose";

const shoppingListItemSchema = new mongoose.Schema(
  {
    ingredientId: { type: mongoose.Schema.Types.ObjectId, ref: "Ingredient" },
    ingredientName: { type: String, required: true },
    displayName: { type: String, default: "" },
    normalizedName: { type: String, required: true },
    quantity: { type: Number, required: true, min: 0 },
    unit: { type: String, required: true },
    standardQuantity: { type: Number, min: 0 },
    standardUnit: { type: String, default: "" },
    category: { type: String, default: "autres" },
    sourceRecipes: {
      type: [
        {
          recipeId: { type: String, required: true },
          title: { type: String, default: "" }
        }
      ],
      default: []
    },
    checked: { type: Boolean, default: false },
    isChecked: { type: Boolean, default: false }
  },
  { _id: true }
);

const shoppingListSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, default: "Liste de courses" },
    status: { type: String, enum: ["active", "completed", "archived"], default: "active", index: true },
    weekStartDate: { type: Date, index: true },
    sourceRecipes: {
      type: [
        {
          recipeId: { type: String, required: true },
          title: { type: String, default: "" }
        }
      ],
      default: []
    },
    items: { type: [shoppingListItemSchema], default: [] },
    generatedAt: { type: Date },
    isCompleted: { type: Boolean, default: false }
  },
  { timestamps: true }
);

shoppingListSchema.index(
  { userId: 1, weekStartDate: 1 },
  { unique: true, partialFilterExpression: { weekStartDate: { $type: "date" } } }
);

export const ShoppingList = mongoose.model("ShoppingList", shoppingListSchema);
