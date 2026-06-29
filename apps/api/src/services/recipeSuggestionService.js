import { InventoryItem } from "../models/InventoryItem.js";
import { listRecipes } from "./recipeService.js";
import { scoreRecipeWithInventoryItems } from "./recipeScoreEngine.js";

const defaultLimit = 20;
const defaultAnalysisLimit = 36;
const maxLimit = 60;
const maxAnalysisLimit = 48;

function clampPositiveInteger(value, fallback, maximum) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(Math.floor(parsed), maximum);
}

function parseOptionalNumber(value) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseBoolean(value) {
  return value === true || String(value).toLowerCase() === "true";
}

function recipeId(recipe) {
  return String(recipe?._id || recipe?.id || recipe?.externalId || "");
}

function recipeSource(recipe) {
  return recipe.source || (String(recipe.externalId || "").startsWith("demo-") ? "demo" : "user");
}

function compactNames(items = []) {
  return [...new Set(items.map((item) => item.ingredientName).filter(Boolean))];
}

function suggestionGroup(score, missingCount) {
  if (score.recommendation === "cook_now") return "readyToCook";
  if (score.recommendation === "almost_ready") return "highlyRecommended";
  if (missingCount <= 2 && score.recommendation !== "not_recommended") return "missingFewIngredients";
  return "lowCompatibility";
}

function explanationFor(score, missingCount) {
  if (score.recommendation === "cook_now") return "Tous les ingredients essentiels sont disponibles.";
  if (score.recommendation === "almost_ready") return "La recette est tres compatible avec votre inventaire.";
  if (missingCount <= 2) return `Il manque seulement ${missingCount} ingredient${missingCount > 1 ? "s" : ""}.`;
  if (score.missingCriticalIngredients.length) return "Des ingredients essentiels manquent pour cette recette.";
  return "La compatibilite avec votre inventaire est faible.";
}

function buildSuggestion(recipe, score) {
  const missingIngredients = [...score.missing, ...score.partial];
  const missingCount = missingIngredients.length;
  const group = suggestionGroup(score, missingCount);

  return {
    recipe: {
      ...recipe,
      id: recipeId(recipe),
      source: recipeSource(recipe)
    },
    score: score.compatibilityScore,
    recommendation: score.recommendation,
    group,
    explanation: explanationFor(score, missingCount),
    missingIngredients: compactNames(score.missing),
    partialIngredients: compactNames(score.partial),
    availableIngredients: compactNames(score.matched),
    missingCount,
    scoreDetails: score
  };
}

function emptyGroups() {
  return {
    readyToCook: [],
    highlyRecommended: [],
    missingFewIngredients: [],
    lowCompatibility: []
  };
}

function applySuggestionFilters(suggestion, filters = {}) {
  const minScore = parseOptionalNumber(filters.minScore);
  if (minScore !== null && suggestion.score < minScore) return false;

  const missingMax = parseOptionalNumber(filters.missingMax);
  if (missingMax !== null && suggestion.missingCount > missingMax) return false;

  if (parseBoolean(filters.readyOnly) && suggestion.recommendation !== "cook_now") return false;

  return true;
}

function sortSuggestions(a, b) {
  return (
    b.score - a.score ||
    a.missingCount - b.missingCount ||
    Number(a.recipe.preparationTime || a.recipe.readyInMinutes || 0) - Number(b.recipe.preparationTime || b.recipe.readyInMinutes || 0) ||
    String(a.recipe.title || "").localeCompare(String(b.recipe.title || ""))
  );
}

export function buildRecipeSuggestions(recipes = [], inventoryItems = [], filters = {}) {
  const limit = clampPositiveInteger(filters.limit, defaultLimit, maxLimit);
  const scored = recipes
    .map((recipe) => buildSuggestion(recipe, scoreRecipeWithInventoryItems(recipe, inventoryItems)))
    .filter((suggestion) => applySuggestionFilters(suggestion, filters))
    .sort(sortSuggestions);

  const suggestions = scored.slice(0, limit);
  const groups = emptyGroups();
  for (const suggestion of suggestions) {
    groups[suggestion.group].push(suggestion);
  }

  return {
    summary: {
      totalRecipesAnalyzed: recipes.length,
      readyToCook: groups.readyToCook.length,
      highlyRecommended: groups.highlyRecommended.length,
      missingFewIngredients: groups.missingFewIngredients.length,
      lowCompatibility: groups.lowCompatibility.length
    },
    suggestions,
    groups
  };
}

export async function getRecipeSuggestions(user, filters = {}) {
  const analysisLimit = clampPositiveInteger(filters.analysisLimit, defaultAnalysisLimit, maxAnalysisLimit);
  const [inventoryItems, userCatalog, mealizyCatalog, syncedCatalog] = await Promise.all([
    InventoryItem.find({ userId: user._id }).populate("ingredientId").lean(),
    listRecipes({ q: filters.q, source: "mine", user, limit: analysisLimit, filters }),
    listRecipes({ q: filters.q, source: "mealizy", limit: analysisLimit, filters }),
    listRecipes({ q: filters.q, source: "api", limit: analysisLimit, filters })
  ]);

  return buildRecipeSuggestions(
    [...userCatalog.items, ...mealizyCatalog.items, ...syncedCatalog.items],
    inventoryItems,
    filters
  );
}
