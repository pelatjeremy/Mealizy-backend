import { ingredientUnits } from "../data/catalogUnits.js";

export async function listIngredientUnits() {
  return ingredientUnits;
}

export async function getIngredientUnit(id) {
  return ingredientUnits.find((unit) => unit.id === id) || null;
}

