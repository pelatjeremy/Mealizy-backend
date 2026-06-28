import mongoose from "mongoose";
import { ingredientCategoryIds } from "../data/catalogCategories.js";
import { normalizeIngredientName } from "../utils/normalizeIngredient.js";

function slugify(value = "") {
  return normalizeIngredientName(value).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const nutritionReferenceSchema = new mongoose.Schema(
  {
    calories: { type: Number, default: 0 },
    protein: { type: Number, default: 0 },
    carbs: { type: Number, default: 0 },
    fat: { type: Number, default: 0 },
    fiber: { type: Number, default: 0 },
    sugar: { type: Number, default: 0 },
    sodium: { type: Number, default: 0 },
    servingSize: { type: Number, default: 100 },
    servingUnit: { type: String, default: "g" },
    source: { type: String, default: "" }
  },
  { _id: false }
);

const ingredientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, trim: true, lowercase: true },
    normalizedName: { type: String, required: true, index: true },
    stableId: { type: String, trim: true },
    category: {
      type: String,
      enum: ingredientCategoryIds,
      default: "autres"
    },
    subcategory: { type: String, default: "" },
    synonyms: { type: [String], default: [] },
    translations: {
      fr: { type: [String], default: [] },
      en: { type: [String], default: [] }
    },
    alternativeSpellings: { type: [String], default: [] },
    plurals: { type: [String], default: [] },
    image: { type: String, default: "" },
    icon: { type: String, default: "" },
    nutritionReference: { type: nutritionReferenceSchema, default: () => ({}) },
    source: { type: String, enum: ["mealizy", "user", "seed", "external"], default: "mealizy" },
    importMetadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    active: { type: Boolean, default: true, index: true },
    mergedInto: { type: mongoose.Schema.Types.ObjectId, ref: "Ingredient" },
    notes: { type: String, default: "" }
  },
  { timestamps: true }
);

ingredientSchema.pre("validate", function normalize(next) {
  this.normalizedName = this.normalizedName || normalizeIngredientName(this.name);
  this.slug = this.slug || slugify(this.name);
  this.stableId = this.stableId || this.slug;
  next();
});

ingredientSchema.index({ slug: 1 }, { unique: true, sparse: true });
ingredientSchema.index({ stableId: 1 }, { unique: true, sparse: true });
ingredientSchema.index({ category: 1, subcategory: 1, active: 1 });
ingredientSchema.index({ normalizedName: 1, active: 1 });
ingredientSchema.index({ name: "text", normalizedName: "text", synonyms: "text", alternativeSpellings: "text", plurals: "text", "translations.fr": "text", "translations.en": "text" });

export const Ingredient = mongoose.model("Ingredient", ingredientSchema);
