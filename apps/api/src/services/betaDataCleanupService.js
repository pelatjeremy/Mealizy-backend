import { Ingredient } from "../models/Ingredient.js";
import { Recipe } from "../models/Recipe.js";
import { User } from "../models/User.js";
import { sanitizeRecipeData } from "../utils/recipeSanitizer.js";

const markerPattern = /^(dashboard|demo|seed|test|dev|placeholder)\b/i;
const technicalTitlePattern = /\b(dashboard|seed|test|dev|placeholder)\b|prod[\s_-]*index|[0-9]{10,}/i;
const technicalNamePattern = /^(dashboard|demo|seed|test|dev|prod|index|placeholder)[-_ ]/i;

function recipeCleanupQuery(demoUserId) {
  return {
    $or: [
      { source: "demo" },
      { sourceProvider: "demo" },
      { externalId: { $regex: /^demo-/i } },
      { title: { $regex: markerPattern } },
      { title: { $regex: technicalTitlePattern } },
      { tags: { $in: ["demo", "test", "dev", "seed", "placeholder"] } },
      { categories: { $in: ["demo", "test", "dev", "seed", "placeholder"] } },
      { dishTypes: { $in: ["demo", "test", "dev", "seed", "placeholder"] } },
      { "metadata.createdBy": { $in: ["demo", "test", "dev", "seed"] } },
      { "importMetadata.createdBy": { $in: ["demo", "test", "dev", "seed"] } },
      { "sourceMetadata.createdBy": { $in: ["demo", "test", "dev", "seed"] } },
      ...(demoUserId ? [{ userId: demoUserId }] : [])
    ]
  };
}

function ingredientCleanupQuery() {
  return {
    $or: [
      { source: { $in: ["test", "dev", "demo"] } },
      { name: { $regex: markerPattern } },
      { name: { $regex: technicalNamePattern } },
      { stableId: { $regex: /^(dashboard|demo|seed|test|dev)[-_]/i } },
      { "importMetadata.createdBy": { $in: ["test", "dev", "demo"] } }
    ]
  };
}

function recipeSanitizeQuery() {
  const marker = /(^|[\s_./-])(prod|production|index|idx|undefined|null|nan|seed|fixture|mock|test|demo|dev|placeholder)([\s_./-]|$)|^(prod|index)[_-]?\d+$|^dashboard\s+pates\s+\d{8,}$/i;
  return {
    $or: [
      { title: { $regex: marker } },
      { name: { $regex: marker } },
      { summary: { $regex: marker } },
      { description: { $regex: marker } },
      { image: { $regex: marker } },
      { categories: { $regex: marker } },
      { dishTypes: { $regex: marker } },
      { diets: { $regex: marker } },
      { cuisines: { $regex: marker } },
      { tags: { $regex: marker } },
      { instructions: { $regex: marker } },
      { requiredEquipments: { $regex: marker } },
      { "ingredients.displayName": { $regex: marker } },
      { "ingredients.ingredientName": { $regex: marker } },
      { "ingredients.name": { $regex: marker } },
      { "ingredients.originalName": { $regex: marker } },
      { "ingredients.normalizedName": { $regex: marker } },
      { "ingredients.category": { $regex: marker } },
      { "ingredients.aisle": { $regex: marker } },
      { "ingredients.image": { $regex: marker } },
      { "ingredients.sourceMetadata.provider": { $regex: marker } },
      { "ingredients.sourceMetadata.nameClean": { $regex: marker } },
      { "ingredients.sourceMetadata.originalName": { $regex: marker } },
      { "ingredients.sourceMetadata.spoonacularName": { $regex: marker } },
      { "metadata.createdBy": { $regex: marker } },
      { "metadata.source": { $regex: marker } },
      { "metadata.label": { $regex: marker } },
      { "sourceMetadata.createdBy": { $regex: marker } },
      { "sourceMetadata.source": { $regex: marker } },
      { "sourceMetadata.label": { $regex: marker } },
      { "importMetadata.createdBy": { $regex: marker } },
      { "importMetadata.source": { $regex: marker } },
      { "importMetadata.label": { $regex: marker } },
      { "migrationMetadata.originalIngredientsBackup.displayName": { $regex: marker } },
      { "migrationMetadata.originalIngredientsBackup.ingredientName": { $regex: marker } },
      { "migrationMetadata.originalIngredientsBackup.originalName": { $regex: marker } }
    ]
  };
}

async function preview(model, query, projection = {}) {
  const [count, samples] = await Promise.all([
    model.countDocuments(query),
    model.find(query, projection).limit(10).lean()
  ]);

  return { count, samples };
}

export async function cleanupBetaData({ execute = false } = {}) {
  const demoUser = await User.findOne({ email: "demo@mealizy.app" }).select("_id email").lean();
  const recipesQuery = recipeCleanupQuery(demoUser?._id);
  const ingredientsQuery = ingredientCleanupQuery();
  const recipesToSanitizeQuery = recipeSanitizeQuery();

  const recipes = await preview(Recipe, recipesQuery, { title: 1, externalId: 1, source: 1, sourceProvider: 1, userId: 1 });
  const recipesToSanitize = await preview(Recipe, recipesToSanitizeQuery, { title: 1, source: 1, sourceProvider: 1, tags: 1, categories: 1 });
  const ingredients = await preview(Ingredient, ingredientsQuery, { name: 1, stableId: 1, source: 1, importMetadata: 1 });
  const report = {
    mode: execute ? "execute" : "dry-run",
    usersDeleted: 0,
    recipes,
    recipesToSanitize,
    ingredients,
    deleted: {
      recipes: 0,
      ingredients: 0
    },
    sanitized: {
      recipes: 0
    }
  };

  if (!execute) return report;

  const [recipeDelete, ingredientDelete] = await Promise.all([
    Recipe.deleteMany(recipesQuery),
    Ingredient.deleteMany(ingredientsQuery)
  ]);
  report.deleted.recipes = recipeDelete.deletedCount || 0;
  report.deleted.ingredients = ingredientDelete.deletedCount || 0;

  const recipesForSanitizing = await Recipe.find(recipesToSanitizeQuery).lean();
  for (const recipe of recipesForSanitizing) {
    await Recipe.updateOne({ _id: recipe._id }, { $set: sanitizeRecipeData(recipe) }, { runValidators: true });
    report.sanitized.recipes += 1;
  }
  return report;
}

export function formatCleanupBetaDataReport(report) {
  const lines = [
    `Mode: ${report.mode}`,
    `Users deleted: ${report.usersDeleted}`,
    `Recipes matched: ${report.recipes.count}`,
    `Recipes to sanitize: ${report.recipesToSanitize.count}`,
    `Ingredients matched: ${report.ingredients.count}`,
    `Recipes deleted: ${report.deleted.recipes}`,
    `Ingredients deleted: ${report.deleted.ingredients}`,
    `Recipes sanitized: ${report.sanitized.recipes}`
  ];

  if (report.recipes.samples.length) {
    lines.push("Recipe samples:");
    for (const recipe of report.recipes.samples) {
      lines.push(`- ${recipe.title || "(untitled)"} [${recipe.source || "unknown"}/${recipe.sourceProvider || "unknown"}]`);
    }
  }

  if (report.ingredients.samples.length) {
    lines.push("Ingredient samples:");
    for (const ingredient of report.ingredients.samples) {
      lines.push(`- ${ingredient.name || "(unnamed)"} [${ingredient.source || "unknown"}]`);
    }
  }

  return lines.join("\n");
}
