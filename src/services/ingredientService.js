import { Ingredient } from "../models/Ingredient.js";
import { normalizeIngredientName } from "../utils/normalizeIngredient.js";

export async function findOrCreateIngredient({ name, category = "autres" }) {
  const normalizedName = normalizeIngredientName(name);
  return Ingredient.findOneAndUpdate(
    { normalizedName },
    { $setOnInsert: { name, normalizedName, category } },
    { upsert: true, new: true }
  );
}
