import { InventoryItem } from "../models/InventoryItem.js";
import { normalizeIngredientName } from "../utils/normalizeIngredient.js";
import { compareRecipeWithInventoryItems } from "./recipeInventoryMatcher.js";
import { recipeScoreConfig } from "./recipeScoreConfig.js";

const recommendationLabels = {
  cookNow: "cook_now",
  almostReady: "almost_ready",
  shoppingNeeded: "shopping_needed",
  notRecommended: "not_recommended"
};

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(Number(value || 0))));
}

function toComparableId(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value._id) return String(value._id);
  return String(value);
}

function ingredientLabel(ingredient) {
  return ingredient.ingredientName || ingredient.displayName || ingredient.name || ingredient.originalName || "Ingredient";
}

function normalizedName(ingredient) {
  return ingredient.normalizedName || normalizeIngredientName(ingredientLabel(ingredient));
}

function explicitImportance(ingredient) {
  const value = String(ingredient.importance || ingredient.importanceLevel || "").toLowerCase();
  const aliases = {
    essentiel: "essential",
    essentielle: "essential",
    optionnel: "optional",
    optionnelle: "optional",
    facultatif: "optional",
    facultative: "optional"
  };
  if (aliases[value]) return aliases[value];
  return ["essential", "important", "optional"].includes(value) ? value : "";
}

function hasKeyword(normalized, keywords) {
  return keywords.some((keyword) => normalized.includes(normalizeIngredientName(keyword)));
}

export function classifyIngredientImportance(ingredient = {}, index = 0, totalIngredients = 0, config = recipeScoreConfig) {
  const explicit = explicitImportance(ingredient);
  if (explicit) return explicit;

  const normalized = normalizedName(ingredient);
  const category = String(ingredient.category || "").toLowerCase();
  const unit = String(ingredient.standardUnit || ingredient.unit || "").toLowerCase();
  const quantity = Number(ingredient.standardAmount ?? ingredient.quantity ?? ingredient.amount ?? 0);
  const isSmallSeasoning = ["pinch", "tsp", "teaspoon"].includes(unit) || (["g", "ml"].includes(unit) && quantity > 0 && quantity <= 10);

  if (config.optionalCategories.includes(category) || hasKeyword(normalized, config.optionalKeywords) || isSmallSeasoning) {
    return "optional";
  }

  if (config.essentialCategories.includes(category)) return "essential";
  if (totalIngredients <= 3 || (index < 2 && quantity >= 50)) return "essential";

  return "important";
}

function buildRecipeIngredientIndex(recipe) {
  const entries = recipe.ingredients || [];
  const byId = new Map();
  const byName = new Map();

  entries.forEach((ingredient, index) => {
    const entry = { ingredient, index };
    const ingredientId = toComparableId(ingredient.ingredientId);
    if (ingredientId) byId.set(ingredientId, entry);
    byName.set(normalizedName(ingredient), entry);
  });

  return { byId, byName, total: entries.length };
}

function findRecipeIngredient(match, index) {
  const ingredientId = toComparableId(match.ingredientId);
  if (ingredientId && index.byId.has(ingredientId)) return index.byId.get(ingredientId);
  return index.byName.get(match.normalizedName) || { ingredient: match, index: 0 };
}

function enrichMatch(match, recipeIndex, config) {
  const recipeEntry = findRecipeIngredient(match, recipeIndex);
  const importance = classifyIngredientImportance(recipeEntry.ingredient, recipeEntry.index, recipeIndex.total, config);
  return {
    ...match,
    category: recipeEntry.ingredient.category || match.category || "autres",
    importance
  };
}

function quantityContribution(item) {
  if (item.status === "disponible") return 100;
  if (item.status === "manquant") return 0;
  if (item.quantityComparable === false) return 100;

  const required = Number(item.requiredQuantity || 0);
  if (required <= 0) return 50;

  return clampScore((Number(item.availableQuantity || 0) / required) * 100);
}

function weightedAverage(items, scoreForItem, config) {
  const totals = items.reduce(
    (acc, item) => {
      const weight = config.importanceWeights[item.importance] || config.importanceWeights.important;
      acc.score += scoreForItem(item) * weight;
      acc.weight += weight;
      return acc;
    },
    { score: 0, weight: 0 }
  );

  return totals.weight ? clampScore(totals.score / totals.weight) : 0;
}

function missingImpactScore(items, config) {
  const missingPenalty = items.reduce((total, item) => {
    if (item.status === "disponible") return total;

    const baseWeight = config.importanceWeights[item.importance] || config.importanceWeights.important;
    const statusWeight = item.status === "partiel" ? 0.45 : 1;
    return total + baseWeight * statusWeight;
  }, 0);
  const maximumPenalty = items.reduce(
    (total, item) => total + (config.importanceWeights[item.importance] || config.importanceWeights.important),
    0
  );

  return maximumPenalty ? clampScore(100 - (missingPenalty / maximumPenalty) * 100) : 0;
}

function recommendationFor({ compatibilityScore, quantityScore, missingCriticalIngredients }, config) {
  if (!missingCriticalIngredients.length && compatibilityScore >= config.recommendationThresholds.cookNow && quantityScore >= 85) {
    return recommendationLabels.cookNow;
  }

  if (!missingCriticalIngredients.length && compatibilityScore >= config.recommendationThresholds.almostReady) {
    return recommendationLabels.almostReady;
  }

  if (compatibilityScore >= config.recommendationThresholds.shoppingNeeded) {
    return recommendationLabels.shoppingNeeded;
  }

  return recommendationLabels.notRecommended;
}

function names(items) {
  return [...new Set(items.map((item) => item.ingredientName).filter(Boolean))];
}

export function scoreRecipeWithInventoryItems(recipe, inventoryItems = [], options = {}) {
  const config = options.config || recipeScoreConfig;
  const compatibility = compareRecipeWithInventoryItems(recipe, inventoryItems);
  const recipeIndex = buildRecipeIngredientIndex(recipe);
  const matched = compatibility.matched.map((item) => enrichMatch(item, recipeIndex, config));
  const partial = compatibility.partial.map((item) => enrichMatch(item, recipeIndex, config));
  const missing = compatibility.missing.map((item) => enrichMatch(item, recipeIndex, config));
  const allItems = [...matched, ...partial, ...missing];

  const availabilityScore = compatibility.compatibilityScore;
  const quantityScore = weightedAverage(allItems, quantityContribution, config);
  const essentialItems = allItems.filter((item) => item.importance === "essential");
  const essentialScore = essentialItems.length ? weightedAverage(essentialItems, quantityContribution, config) : 100;
  const missingImpact = missingImpactScore(allItems, config);
  const missingCriticalItems = [...missing, ...partial].filter((item) => item.importance === "essential");
  const missingOptionalItems = [...missing, ...partial].filter((item) => item.importance === "optional");

  const weightedScore = clampScore(
    availabilityScore * config.weights.availability +
      quantityScore * config.weights.quantity +
      essentialScore * config.weights.essential +
      missingImpact * config.weights.missingImpact
  );
  const recommendation = recommendationFor(
    {
      compatibilityScore: weightedScore,
      quantityScore,
      missingCriticalIngredients: missingCriticalItems
    },
    config
  );

  return {
    recipeId: compatibility.recipeId,
    compatibilityScore: weightedScore,
    availabilityScore,
    quantityScore,
    essentialScore,
    missingImpactScore: missingImpact,
    recommendation,
    missingCriticalIngredients: names(missingCriticalItems),
    missingOptionalIngredients: names(missingOptionalItems),
    matched,
    partial,
    missing,
    inventoryCompatibility: compatibility
  };
}

export async function scoreRecipeForUser(userId, recipe, options = {}) {
  const inventoryItems = await InventoryItem.find({ userId }).populate("ingredientId").lean();
  return scoreRecipeWithInventoryItems(recipe, inventoryItems, options);
}

export async function scoreRecipesForUser(userId, recipes = [], options = {}) {
  const inventoryItems = await InventoryItem.find({ userId }).populate("ingredientId").lean();
  return recipes.map((recipe) => scoreRecipeWithInventoryItems(recipe, inventoryItems, options));
}
