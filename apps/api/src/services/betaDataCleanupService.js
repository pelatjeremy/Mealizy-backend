import { Ingredient } from "../models/Ingredient.js";
import { Recipe } from "../models/Recipe.js";
import { User } from "../models/User.js";

const markerPattern = /^(dashboard|demo|seed|test|dev)\b/i;
const technicalTitlePattern = /\b(dashboard|seed|test|dev)\b|[0-9]{10,}/i;
const technicalNamePattern = /^(dashboard|demo|seed|test|dev|prod|index)[-_ ]/i;

function recipeCleanupQuery(demoUserId) {
  return {
    $or: [
      { source: "demo" },
      { sourceProvider: "demo" },
      { externalId: { $regex: /^demo-/i } },
      { title: { $regex: markerPattern } },
      { title: { $regex: technicalTitlePattern } },
      { tags: { $in: ["demo", "test", "dev", "seed"] } },
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

  const recipes = await preview(Recipe, recipesQuery, { title: 1, externalId: 1, source: 1, sourceProvider: 1, userId: 1 });
  const ingredients = await preview(Ingredient, ingredientsQuery, { name: 1, stableId: 1, source: 1, importMetadata: 1 });
  const report = {
    mode: execute ? "execute" : "dry-run",
    usersDeleted: 0,
    recipes,
    ingredients,
    deleted: {
      recipes: 0,
      ingredients: 0
    }
  };

  if (!execute) return report;

  const [recipeDelete, ingredientDelete] = await Promise.all([
    Recipe.deleteMany(recipesQuery),
    Ingredient.deleteMany(ingredientsQuery)
  ]);
  report.deleted.recipes = recipeDelete.deletedCount || 0;
  report.deleted.ingredients = ingredientDelete.deletedCount || 0;
  return report;
}

export function formatCleanupBetaDataReport(report) {
  const lines = [
    `Mode: ${report.mode}`,
    `Users deleted: ${report.usersDeleted}`,
    `Recipes matched: ${report.recipes.count}`,
    `Ingredients matched: ${report.ingredients.count}`,
    `Recipes deleted: ${report.deleted.recipes}`,
    `Ingredients deleted: ${report.deleted.ingredients}`
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
