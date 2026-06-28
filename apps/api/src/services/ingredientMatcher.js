import { Ingredient } from "../models/Ingredient.js";
import { normalizeUnit } from "../utils/unitConversion.js";
import { normalizeComparableIngredientName, buildIngredientComparableValues } from "./ingredientNormalizer.js";

function slugify(value = "") {
  return normalizeComparableIngredientName(value).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function compactStringList(values = []) {
  return [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];
}

function escapeRegex(value = "") {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function standardizeAmount(amount, unit) {
  const normalizedUnit = normalizeUnit(unit);
  const numericAmount = Number(amount || 0);

  if (normalizedUnit === "kg") return { standardAmount: numericAmount * 1000, standardUnit: "g" };
  if (normalizedUnit === "mg") return { standardAmount: numericAmount / 1000, standardUnit: "g" };
  if (normalizedUnit === "cl") return { standardAmount: numericAmount * 10, standardUnit: "ml" };
  if (normalizedUnit === "l") return { standardAmount: numericAmount * 1000, standardUnit: "ml" };

  return { standardAmount: numericAmount, standardUnit: normalizedUnit };
}

export async function findIngredientByComparableName(comparableName) {
  if (!comparableName) return null;

  const direct = await Ingredient.findOne({
    active: true,
    $or: [
      { normalizedName: comparableName },
      { slug: comparableName.replace(/\s+/g, "-") },
      { name: { $regex: `^${escapeRegex(comparableName)}$`, $options: "i" } },
      { synonyms: { $regex: `^${escapeRegex(comparableName)}$`, $options: "i" } },
      { alternativeSpellings: { $regex: `^${escapeRegex(comparableName)}$`, $options: "i" } },
      { plurals: { $regex: `^${escapeRegex(comparableName)}$`, $options: "i" } },
      { "translations.fr": { $regex: `^${escapeRegex(comparableName)}$`, $options: "i" } },
      { "translations.en": { $regex: `^${escapeRegex(comparableName)}$`, $options: "i" } }
    ]
  });
  if (direct) return direct;

  const candidates = await Ingredient.find({
    active: true,
    $or: [
      { normalizedName: { $regex: escapeRegex(comparableName), $options: "i" } },
      { name: { $regex: escapeRegex(comparableName), $options: "i" } },
      { synonyms: { $regex: escapeRegex(comparableName), $options: "i" } },
      { "translations.fr": { $regex: escapeRegex(comparableName), $options: "i" } },
      { "translations.en": { $regex: escapeRegex(comparableName), $options: "i" } }
    ]
  }).limit(20);

  return candidates.find((ingredient) => buildIngredientComparableValues(ingredient).includes(comparableName)) || null;
}

async function createUnknownIngredient(rawName, comparableName, metadata = {}) {
  const displayName = String(comparableName || rawName || "Ingredient").trim();
  const slug = slugify(comparableName || displayName);
  const aliases = compactStringList([displayName, metadata.originalName, metadata.nameClean, metadata.spoonacularName]);

  return Ingredient.findOneAndUpdate(
    { normalizedName: comparableName },
    {
      $setOnInsert: {
        name: displayName,
        slug,
        stableId: slug,
        normalizedName: comparableName,
        category: "autres",
        synonyms: aliases,
        source: "external",
        importMetadata: {
          provider: "spoonacular",
          firstSeenName: metadata.originalName || rawName,
          spoonacularId: metadata.spoonacularId || null,
          createdBy: "ingredientMatcher"
        },
        active: true,
        notes: "Auto-created by Spoonacular ingredient normalization"
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

export async function matchOrCreateIngredient(rawName, metadata = {}) {
  const comparableName = normalizeComparableIngredientName(rawName);
  const ingredient = await findIngredientByComparableName(comparableName);
  return ingredient || createUnknownIngredient(rawName, comparableName, metadata);
}

export async function normalizeRecipeIngredient(rawIngredient = {}) {
  const originalName = rawIngredient.originalName || rawIngredient.original || rawIngredient.nameClean || rawIngredient.name || rawIngredient.ingredientName || "";
  const displayName = rawIngredient.nameClean || rawIngredient.name || rawIngredient.ingredientName || originalName;
  const matchedIngredient = await matchOrCreateIngredient(displayName || originalName, {
    originalName,
    nameClean: rawIngredient.nameClean,
    spoonacularName: rawIngredient.name,
    spoonacularId: rawIngredient.id
  });
  const originalUnit = rawIngredient.unit || rawIngredient.measures?.metric?.unitShort || rawIngredient.originalUnit || "";
  const normalizedUnit = normalizeUnit(originalUnit);
  const amount = Number(rawIngredient.amount || rawIngredient.quantity || rawIngredient.measures?.metric?.amount || 0);
  const standard = standardizeAmount(amount, normalizedUnit);

  return {
    ingredientId: matchedIngredient._id,
    ingredientName: matchedIngredient.name,
    originalName,
    displayName,
    normalizedName: matchedIngredient.normalizedName || normalizeComparableIngredientName(displayName),
    quantity: amount,
    amount,
    unit: normalizedUnit,
    originalUnit,
    standardAmount: standard.standardAmount,
    standardUnit: standard.standardUnit,
    category: matchedIngredient.category || "autres",
    aisle: rawIngredient.aisle || "",
    image: rawIngredient.image || "",
    sourceMetadata: {
      provider: "spoonacular",
      spoonacularId: rawIngredient.id || null,
      consistency: rawIngredient.consistency || "",
      original: rawIngredient.original || ""
    }
  };
}
