import { Recipe } from "../models/Recipe.js";
import { normalizeUnit } from "../utils/unitConversion.js";
import { normalizeComparableIngredientName } from "./ingredientNormalizer.js";
import {
  findIngredientByComparableName,
  matchOrCreateIngredient,
  standardizeAmount
} from "./ingredientMatcher.js";

export const INGREDIENTS_MIGRATION_VERSION = "sprint-5.7";

const enrichedIngredientFields = [
  "ingredientId",
  "originalName",
  "displayName",
  "normalizedName",
  "amount",
  "originalUnit",
  "standardAmount",
  "standardUnit",
  "aisle",
  "image",
  "sourceMetadata"
];

function clone(value) {
  return JSON.parse(JSON.stringify(value || []));
}

function hasValue(value) {
  return value !== undefined && value !== null;
}

export function isEnrichedRecipeIngredient(ingredient = {}) {
  return enrichedIngredientFields.every((field) => hasValue(ingredient[field]));
}

export function isRecipeIngredientsMigrated(recipe = {}) {
  const ingredients = recipe.ingredients || [];
  if (!ingredients.length) return true;
  return ingredients.every(isEnrichedRecipeIngredient);
}

function readArrayIngredient(rawIngredient) {
  if (!Array.isArray(rawIngredient)) return null;

  const [ingredientName, quantity, unit, category] = rawIngredient;
  return { ingredientName, quantity, unit, category };
}

function normalizeLegacyIngredientShape(rawIngredient = {}) {
  const source = readArrayIngredient(rawIngredient) || rawIngredient;
  const originalName =
    source.originalName ||
    source.original ||
    source.nameClean ||
    source.displayName ||
    source.name ||
    source.ingredientName ||
    "";
  const displayName = source.displayName || source.nameClean || source.name || source.ingredientName || originalName;
  const amount = Number(source.amount ?? source.quantity ?? source.measures?.metric?.amount ?? 0);
  const originalUnit = source.originalUnit || source.unit || source.measures?.metric?.unitShort || "";
  const unit = normalizeUnit(originalUnit);
  const standard = standardizeAmount(amount, unit);

  return {
    originalName,
    displayName,
    amount,
    originalUnit,
    unit,
    standardAmount: standard.standardAmount,
    standardUnit: standard.standardUnit,
    category: source.category || "autres",
    aisle: source.aisle || "",
    image: source.image || "",
    sourceMetadata: {
      ...(source.sourceMetadata || {}),
      provider: source.sourceMetadata?.provider || source.provider || "mealizy",
      migratedBy: "recipeIngredientMigration",
      original: source.original || ""
    }
  };
}

function buildPseudoIngredient(rawName, comparableName, legacyIngredient) {
  return {
    _id: null,
    name: rawName || comparableName || "Ingredient",
    normalizedName: comparableName,
    category: legacyIngredient.category || "autres",
    image: legacyIngredient.image || ""
  };
}

async function matchLegacyIngredient(legacyIngredient, { dryRun }) {
  const rawName = legacyIngredient.displayName || legacyIngredient.originalName;
  const comparableName = normalizeComparableIngredientName(rawName);
  const existingIngredient = await findIngredientByComparableName(comparableName);

  if (existingIngredient) {
    return { ingredient: existingIngredient, created: false, comparableName };
  }

  if (dryRun) {
    return {
      ingredient: buildPseudoIngredient(rawName, comparableName, legacyIngredient),
      created: true,
      comparableName
    };
  }

  const ingredient = await matchOrCreateIngredient(rawName, {
    originalName: legacyIngredient.originalName,
    nameClean: legacyIngredient.displayName,
    provider: "mealizy-migration"
  });

  return { ingredient, created: true, comparableName };
}

function buildEnrichedIngredient(legacyIngredient, matchedIngredient, comparableName) {
  return {
    ingredientId: matchedIngredient._id,
    ingredientName: matchedIngredient.name,
    originalName: legacyIngredient.originalName || legacyIngredient.displayName,
    displayName: legacyIngredient.displayName || matchedIngredient.name,
    normalizedName: matchedIngredient.normalizedName || comparableName,
    quantity: legacyIngredient.amount,
    amount: legacyIngredient.amount,
    unit: legacyIngredient.unit,
    originalUnit: legacyIngredient.originalUnit,
    standardAmount: legacyIngredient.standardAmount,
    standardUnit: legacyIngredient.standardUnit,
    category: matchedIngredient.category || legacyIngredient.category || "autres",
    aisle: legacyIngredient.aisle,
    image: legacyIngredient.image || matchedIngredient.image || "",
    sourceMetadata: legacyIngredient.sourceMetadata
  };
}

function emptyStats(dryRun) {
  return {
    dryRun,
    totalRecipes: 0,
    alreadyConformRecipes: 0,
    recipesToMigrate: 0,
    migratedRecipes: 0,
    skippedRecipes: 0,
    ingredientsAnalyzed: 0,
    ingredientsMatched: 0,
    ingredientsCreated: 0,
    errors: [],
    examples: [],
    startedAt: new Date(),
    finishedAt: null,
    durationMs: 0
  };
}

function pushExample(report, recipe, before, after) {
  if (report.examples.length >= 5 || !before || !after) return;

  report.examples.push({
    recipeId: String(recipe._id || recipe.externalId || recipe.title || "unknown"),
    recipeTitle: recipe.title || "",
    before,
    after
  });
}

export async function migrateRecipeIngredients(recipe, options = {}) {
  const { dryRun = true, now = new Date() } = options;
  const ingredients = recipe.ingredients || [];
  const result = {
    recipe,
    skipped: false,
    migrated: false,
    ingredientsAnalyzed: 0,
    ingredientsMatched: 0,
    ingredientsCreated: 0,
    examples: []
  };

  if (isRecipeIngredientsMigrated(recipe)) {
    result.skipped = true;
    return result;
  }

  const originalIngredientsBackup = clone(ingredients);
  const enrichedIngredients = [];

  for (const rawIngredient of ingredients) {
    const legacyIngredient = normalizeLegacyIngredientShape(rawIngredient);
    const match = await matchLegacyIngredient(legacyIngredient, { dryRun });
    const enrichedIngredient = buildEnrichedIngredient(legacyIngredient, match.ingredient, match.comparableName);

    result.ingredientsAnalyzed += 1;
    result.ingredientsMatched += match.created ? 0 : 1;
    result.ingredientsCreated += match.created ? 1 : 0;
    enrichedIngredients.push(enrichedIngredient);
    if (result.examples.length < 2) result.examples.push({ before: rawIngredient, after: enrichedIngredient });
  }

  if (!dryRun) {
    recipe.ingredients = enrichedIngredients;
    recipe.migrationMetadata = {
      ...(recipe.migrationMetadata?.toObject?.() || recipe.migrationMetadata || {}),
      ingredientsMigratedAt: now,
      ingredientsMigrationVersion: INGREDIENTS_MIGRATION_VERSION,
      originalIngredientsBackup
    };
    await recipe.save();
  }

  result.migrated = true;
  return result;
}

export async function migrateRecipesIngredients(options = {}) {
  const { dryRun = true, logger = console } = options;
  const report = emptyStats(dryRun);
  const cursor = Recipe.find({}).cursor();

  for await (const recipe of cursor) {
    report.totalRecipes += 1;

    try {
      if (isRecipeIngredientsMigrated(recipe)) {
        report.alreadyConformRecipes += 1;
        report.skippedRecipes += 1;
        continue;
      }

      report.recipesToMigrate += 1;
      const result = await migrateRecipeIngredients(recipe, { dryRun });

      report.ingredientsAnalyzed += result.ingredientsAnalyzed;
      report.ingredientsMatched += result.ingredientsMatched;
      report.ingredientsCreated += result.ingredientsCreated;
      report.migratedRecipes += result.migrated ? 1 : 0;
      for (const example of result.examples) pushExample(report, recipe, example.before, example.after);
    } catch (error) {
      const failure = {
        recipeId: String(recipe._id || recipe.externalId || "unknown"),
        recipeTitle: recipe.title || "",
        message: error.message
      };
      report.errors.push(failure);
      logger.error(`Recipe ingredient migration failed for ${failure.recipeId}: ${failure.message}`);
    }
  }

  report.finishedAt = new Date();
  report.durationMs = report.finishedAt.getTime() - report.startedAt.getTime();
  return report;
}

export function formatMigrationReport(report) {
  const lines = [
    `Mode: ${report.dryRun ? "dry-run" : "write"}`,
    `Recipes analyzed: ${report.totalRecipes}`,
    `Recipes already conform: ${report.alreadyConformRecipes}`,
    `Recipes to migrate: ${report.recipesToMigrate}`,
    `Recipes migrated: ${report.migratedRecipes}`,
    `Recipes skipped: ${report.skippedRecipes}`,
    `Ingredients analyzed: ${report.ingredientsAnalyzed}`,
    `Ingredients matched: ${report.ingredientsMatched}`,
    `Ingredients auto-created: ${report.ingredientsCreated}`,
    `Errors: ${report.errors.length}`,
    `Duration: ${report.durationMs}ms`
  ];

  if (report.examples.length) {
    lines.push("Examples:");
    for (const example of report.examples) {
      lines.push(
        `- ${example.recipeTitle || example.recipeId}: ${JSON.stringify(example.before)} -> ${JSON.stringify(example.after)}`
      );
    }
  }

  if (report.errors.length) {
    lines.push("Failures:");
    for (const error of report.errors) {
      lines.push(`- ${error.recipeTitle || error.recipeId}: ${error.message}`);
    }
  }

  return lines.join("\n");
}
