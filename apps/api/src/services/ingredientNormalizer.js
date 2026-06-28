import { normalizeIngredientName } from "../utils/normalizeIngredient.js";

const descriptors = new Set([
  "fresh",
  "raw",
  "ripe",
  "large",
  "small",
  "medium",
  "chopped",
  "diced",
  "sliced",
  "minced",
  "ground",
  "whole",
  "organic",
  "frais",
  "fraiche",
  "fraiches",
  "cru",
  "crue",
  "gros",
  "grande",
  "petit",
  "petite",
  "fraich",
  "coupe",
  "coupee",
  "emince",
  "emincee"
]);

const phraseTranslations = new Map([
  ["olive oil", "huile olive"],
  ["ground beef", "boeuf hache"],
  ["cherry tomato", "tomate cerise"],
  ["cherry tomatoes", "tomate cerise"]
]);

const tokenTranslations = new Map([
  ["tomato", "tomate"],
  ["tomatoe", "tomate"],
  ["tomatoes", "tomate"],
  ["milk", "lait"],
  ["beef", "boeuf"],
  ["oil", "huile"],
  ["olive", "olive"],
  ["olives", "olive"],
  ["egg", "oeuf"],
  ["eggs", "oeuf"],
  ["onion", "oignon"],
  ["onions", "oignon"],
  ["garlic", "ail"],
  ["chicken", "poulet"],
  ["flour", "farine"],
  ["sugar", "sucre"],
  ["butter", "beurre"],
  ["cheese", "fromage"]
]);

const synonymPhrases = new Map([
  ["huile d olive", "huile olive"],
  ["huile dolive", "huile olive"],
  ["boeuf moulu", "boeuf hache"],
  ["bœuf hache", "boeuf hache"],
  ["tomates", "tomate"],
  ["tomates fraiches", "tomate"],
  ["fresh tomate", "tomate"]
]);

export function normalizeComparableIngredientName(value = "") {
  let normalized = normalizeIngredientName(value);

  for (const [source, target] of phraseTranslations) {
    normalized = normalized.replace(new RegExp(`\\b${normalizeIngredientName(source)}\\b`, "g"), target);
  }

  if (synonymPhrases.has(normalized)) return synonymPhrases.get(normalized);

  const translatedTokens = normalized
    .split(" ")
    .map((token) => tokenTranslations.get(token) || token)
    .filter((token) => token && !descriptors.has(token));

  normalized = translatedTokens.join(" ").trim();
  return synonymPhrases.get(normalized) || normalized;
}

export function buildIngredientComparableValues(ingredient) {
  const values = [
    ingredient.name,
    ingredient.normalizedName,
    ingredient.slug,
    ...(ingredient.synonyms || []),
    ...(ingredient.alternativeSpellings || []),
    ...(ingredient.plurals || []),
    ...(ingredient.translations?.fr || []),
    ...(ingredient.translations?.en || [])
  ];

  return [...new Set(values.map(normalizeComparableIngredientName).filter(Boolean))];
}
