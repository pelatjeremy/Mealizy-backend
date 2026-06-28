import mongoose from "mongoose";
import { normalizeIngredientName } from "../utils/normalizeIngredient.js";

const nutritionSchema = new mongoose.Schema(
  {
    calories: { type: Number, default: 0 },
    protein: { type: Number, default: 0 },
    carbs: { type: Number, default: 0 },
    fat: { type: Number, default: 0 },
    fiber: { type: Number, default: 0 },
    sugar: { type: Number, default: 0 },
    sodium: { type: Number, default: 0 },
    vitamins: { type: Map, of: String, default: {} },
    nutrients: { type: [mongoose.Schema.Types.Mixed], default: [] }
  },
  { _id: false }
);

const recipeIngredientSchema = new mongoose.Schema(
  {
    ingredientId: { type: mongoose.Schema.Types.ObjectId, ref: "Ingredient" },
    ingredientName: { type: String, required: true },
    originalName: { type: String, default: "" },
    displayName: { type: String, default: "" },
    normalizedName: { type: String, required: true },
    quantity: { type: Number, required: true, min: 0 },
    amount: { type: Number, min: 0 },
    unit: { type: String, required: true },
    originalUnit: { type: String, default: "" },
    standardAmount: { type: Number, min: 0 },
    standardUnit: { type: String, default: "" },
    category: { type: String, default: "autres" },
    aisle: { type: String, default: "" },
    image: { type: String, default: "" },
    sourceMetadata: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  { _id: false }
);

recipeIngredientSchema.pre("validate", function normalize(next) {
  this.normalizedName = this.normalizedName || normalizeIngredientName(this.ingredientName);
  next();
});

const migrationMetadataSchema = new mongoose.Schema(
  {
    ingredientsMigratedAt: { type: Date },
    ingredientsMigrationVersion: { type: String, default: "" },
    originalIngredientsBackup: { type: [mongoose.Schema.Types.Mixed], default: undefined }
  },
  { _id: false }
);

const recipeSchema = new mongoose.Schema(
  {
    source: { type: String, enum: ["api", "user", "demo"], default: "user" },
    sourceProvider: { type: String, enum: ["spoonacular", "mealizy", "user", "demo"], default: "user" },
    externalId: { type: String },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    title: { type: String, required: true },
    image: { type: String, required: true },
    summary: { type: String, default: "" },
    description: { type: String, default: "" },
    ingredients: { type: [recipeIngredientSchema], default: [] },
    instructions: { type: [String], default: [] },
    preparationTime: { type: Number, default: 20 },
    cookingTime: { type: Number, default: 0 },
    readyInMinutes: { type: Number, default: 20 },
    servings: { type: Number, default: 2 },
    nutrition: { type: nutritionSchema, default: () => ({}) },
    requiredEquipments: { type: [String], default: [] },
    categories: { type: [String], default: [] },
    diets: { type: [String], default: [] },
    cuisines: { type: [String], default: [] },
    tags: { type: [String], default: [] },
    importedAt: { type: Date },
    importedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    ratings: {
      average: { type: Number, default: 0 },
      count: { type: Number, default: 0 }
    },
    favoritesCount: { type: Number, default: 0 },
    commentsCount: { type: Number, default: 0 },
    photos: { type: [String], default: [] },
    visibility: { type: String, enum: ["private", "shared", "public"], default: "private" },
    stats: {
      plannedCount: { type: Number, default: 0 },
      cookedCount: { type: Number, default: 0 }
    },
    migrationMetadata: { type: migrationMetadataSchema, default: undefined }
  },
  { timestamps: true }
);

recipeSchema.index({ source: 1, userId: 1, title: 1 });
recipeSchema.index({ externalId: 1, source: 1 });
recipeSchema.index(
  { sourceProvider: 1, externalId: 1 },
  { unique: true, partialFilterExpression: { sourceProvider: "spoonacular", externalId: { $type: "string" } } }
);
recipeSchema.index({ title: "text", summary: "text", description: "text" });

export const Recipe = mongoose.model("Recipe", recipeSchema);
