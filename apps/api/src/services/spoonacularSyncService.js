import { Recipe } from "../models/Recipe.js";
import { normalizeRecipeIngredient } from "./ingredientMatcher.js";
import { searchSpoonacularRecipes, SpoonacularApiError } from "./spoonacularService.js";

function emptyReport(options = {}) {
  return {
    query: options.q || options.query || "",
    limit: Number(options.limit || 24),
    analyzedRecipes: 0,
    newRecipes: 0,
    updatedRecipes: 0,
    duplicatesIgnored: 0,
    ingredientsAnalyzed: 0,
    quotaRemaining: null,
    errors: [],
    startedAt: new Date(),
    finishedAt: null,
    durationMs: 0
  };
}

function compactError(error) {
  if (error instanceof SpoonacularApiError) {
    return {
      type: "spoonacular",
      reason: error.reason,
      spoonacularStatus: error.spoonacularStatus,
      message: error.responseMessage || error.message,
      quotaRemaining: error.quota?.remaining ?? null
    };
  }

  return {
    type: "internal",
    reason: "unknown",
    message: error instanceof Error ? error.message : String(error)
  };
}

function logSpoonacularStatus(logger, error) {
  const details = compactError(error);
  if (details.reason === "quota_exceeded") {
    logger.warn(`[spoonacular-sync] Quota exceeded${details.quotaRemaining !== null ? `, remaining=${details.quotaRemaining}` : ""}`);
    return;
  }
  if (details.reason === "invalid_key") {
    logger.error("[spoonacular-sync] Invalid Spoonacular API key");
    return;
  }
  if (details.reason === "network_error" || details.reason === "spoonacular_unavailable") {
    logger.warn(`[spoonacular-sync] Spoonacular unavailable: ${details.message}`);
    return;
  }
  logger.warn(`[spoonacular-sync] Spoonacular request failed: ${details.reason} ${details.message}`);
}

function externalIdOf(recipe) {
  return String(recipe.externalId || recipe.id || "").trim();
}

async function normalizeSyncedIngredients(recipe) {
  const ingredients = await Promise.all((recipe.ingredients || []).map((ingredient) => normalizeRecipeIngredient(ingredient)));
  return ingredients;
}

async function upsertSyncedRecipe(recipe, options = {}) {
  const externalId = externalIdOf(recipe);
  if (!externalId) {
    return { status: "skipped", reason: "missing_external_id", ingredientsAnalyzed: 0 };
  }

  const existing = await Recipe.findOne({ sourceProvider: "spoonacular", externalId }).lean();
  const ingredients = await normalizeSyncedIngredients(recipe);
  const now = options.now || new Date();

  await Recipe.findOneAndUpdate(
    { sourceProvider: "spoonacular", externalId },
    {
      $set: {
        ...recipe,
        source: "api",
        sourceProvider: "spoonacular",
        externalId,
        ingredients,
        updatedAt: now
      },
      $setOnInsert: {
        importedAt: now
      }
    },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );

  return {
    status: existing ? "updated" : "created",
    ingredientsAnalyzed: ingredients.length
  };
}

export async function syncSpoonacularCatalog(options = {}) {
  const {
    q = options.query || "pasta",
    limit = 24,
    page = 1,
    filters = {},
    logger = console
  } = options;
  const report = emptyReport({ q, limit });
  const seenExternalIds = new Set();

  try {
    const catalog = await searchSpoonacularRecipes({ q, page, limit, filters });
    report.quotaRemaining = catalog.quota?.remaining ?? null;

    for (const recipe of catalog.items || []) {
      const externalId = externalIdOf(recipe);
      if (externalId && seenExternalIds.has(externalId)) {
        report.duplicatesIgnored += 1;
        continue;
      }
      if (externalId) seenExternalIds.add(externalId);

      report.analyzedRecipes += 1;
      try {
        const result = await upsertSyncedRecipe(recipe, options);
        report.ingredientsAnalyzed += result.ingredientsAnalyzed;
        if (result.status === "created") report.newRecipes += 1;
        if (result.status === "updated") report.updatedRecipes += 1;
        if (result.status === "skipped") report.duplicatesIgnored += 1;
      } catch (error) {
        report.errors.push({
          type: "recipe",
          externalId: externalId || null,
          title: recipe.title || "",
          message: error instanceof Error ? error.message : String(error)
        });
      }
    }
  } catch (error) {
    logSpoonacularStatus(logger, error);
    const syncError = compactError(error);
    report.quotaRemaining = syncError.quotaRemaining ?? report.quotaRemaining;
    report.errors.push(syncError);
  }

  report.finishedAt = new Date();
  report.durationMs = report.finishedAt.getTime() - report.startedAt.getTime();
  return report;
}

export function formatSpoonacularSyncReport(report) {
  const lines = [
    `Query: ${report.query || "(none)"}`,
    `Limit: ${report.limit}`,
    `Recipes analyzed: ${report.analyzedRecipes}`,
    `New recipes: ${report.newRecipes}`,
    `Recipes updated: ${report.updatedRecipes}`,
    `Duplicates ignored: ${report.duplicatesIgnored}`,
    `Ingredients analyzed: ${report.ingredientsAnalyzed}`,
    `Quota remaining: ${report.quotaRemaining ?? "unknown"}`,
    `Errors: ${report.errors.length}`,
    `Duration: ${report.durationMs}ms`
  ];

  if (report.errors.length) {
    lines.push("Failures:");
    for (const error of report.errors) {
      lines.push(`- ${error.reason || error.type}: ${error.message}`);
    }
  }

  return lines.join("\n");
}

