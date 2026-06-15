import { Ingredient } from "../models/Ingredient.js";
import { normalizeIngredientName } from "../utils/normalizeIngredient.js";

export async function findOrCreateIngredient({ name, category = "autres" }) {
  const normalizedName = normalizeIngredientName(name);
  return Ingredient.findOneAndUpdate(
    { normalizedName },
    {
      $set: { category },
      $setOnInsert: { name, normalizedName }
    },
    { upsert: true, new: true }
  );
}
