import { ingredientCategories } from "../data/catalogCategories.js";

export async function listIngredientCategories() {
  return ingredientCategories;
}

export async function getIngredientCategory(id) {
  return ingredientCategories.find((category) => category.id === id) || null;
}

