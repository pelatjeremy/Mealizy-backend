import { normalizeIngredientName } from "./normalizeIngredient.js";
import { normalizeUnit } from "./unitConversion.js";

export const technicalTextPattern = /(^|[\s_./-])(prod|production|index|idx|undefined|null|nan|seed|fixture|mock|test|demo|placeholder)([\s_./-]|$)|^(prod|index)[_-]?\d+$|^dashboard\s+pates\s+\d{8,}$/i;

export function isTechnicalText(value = "") {
  return technicalTextPattern.test(String(value || "").trim());
}

export function cleanDisplayText(value = "") {
  const text = String(value || "").trim().replace(/\s+/g, " ");
  if (!text || isTechnicalText(text)) return "";
  return text;
}

function cleanStringList(values = []) {
  return [...new Set((values || []).map(cleanDisplayText).filter(Boolean))];
}

function cleanIngredientName(value = "") {
  const name = cleanDisplayText(value);
  return name && !isTechnicalText(normalizeIngredientName(name)) ? name : "";
}

function cleanIngredients(ingredients = []) {
  return (ingredients || [])
    .map((ingredient) => {
      const ingredientName = [
        ingredient.ingredientName,
        ingredient.name,
        ingredient.displayName,
        ingredient.originalName
      ].map(cleanIngredientName).find(Boolean);
      if (!ingredientName) return null;

      return {
        ...ingredient,
        ingredientName,
        displayName: cleanDisplayText(ingredient.displayName) || ingredientName,
        originalName: cleanDisplayText(ingredient.originalName),
        normalizedName: normalizeIngredientName(ingredientName),
        quantity: Number.isFinite(Number(ingredient.quantity)) ? Number(ingredient.quantity) : 0,
        amount: Number.isFinite(Number(ingredient.amount)) ? Number(ingredient.amount) : undefined,
        unit: normalizeUnit(ingredient.unit || "unit"),
        originalUnit: cleanDisplayText(ingredient.originalUnit),
        category: cleanDisplayText(ingredient.category) || "autres",
        aisle: cleanDisplayText(ingredient.aisle),
        image: isTechnicalText(ingredient.image) ? "" : String(ingredient.image || ""),
        sourceMetadata: ingredient.sourceMetadata && typeof ingredient.sourceMetadata === "object" ? ingredient.sourceMetadata : {}
      };
    })
    .filter(Boolean);
}

export function sanitizeRecipeData(recipe = {}) {
  return {
    ...recipe,
    title: cleanDisplayText(recipe.title || recipe.name),
    image: isTechnicalText(recipe.image) ? "" : String(recipe.image || ""),
    summary: cleanDisplayText(recipe.summary),
    description: cleanDisplayText(recipe.description),
    ingredients: cleanIngredients(recipe.ingredients),
    instructions: cleanStringList(recipe.instructions),
    requiredEquipments: cleanStringList(recipe.requiredEquipments),
    categories: cleanStringList(recipe.categories),
    diets: cleanStringList(recipe.diets),
    cuisines: cleanStringList(recipe.cuisines),
    tags: cleanStringList(recipe.tags)
  };
}

export function sanitizeRecipeForApi(recipe = {}) {
  const sanitized = sanitizeRecipeData(recipe);
  return {
    ...sanitized,
    title: sanitized.title || "Recette",
    image: sanitized.image || "https://images.unsplash.com/photo-1547592180-85f173990554"
  };
}

export function hasTechnicalRecipeData(recipe = {}) {
  const fields = [
    recipe.title,
    recipe.name,
    recipe.summary,
    recipe.description,
    recipe.image,
    ...(recipe.categories || []),
    ...(recipe.diets || []),
    ...(recipe.cuisines || []),
    ...(recipe.tags || []),
    ...(recipe.instructions || []),
    ...(recipe.requiredEquipments || []),
    ...(recipe.ingredients || []).flatMap((ingredient) => [
      ingredient.ingredientName,
      ingredient.name,
      ingredient.displayName,
      ingredient.originalName,
      ingredient.normalizedName,
      ingredient.category,
      ingredient.aisle,
      ingredient.image
    ])
  ].filter(Boolean);

  return fields.some((field) => isTechnicalText(field) || isTechnicalText(normalizeIngredientName(field)));
}
