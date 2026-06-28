import mongoose from "mongoose";
import { pathToFileURL } from "url";
import { env } from "../config/env.js";
import {
  formatMigrationReport,
  migrateRecipesIngredients
} from "../services/recipeIngredientMigrationService.js";

function parseArgs(argv) {
  return {
    dryRun: argv.includes("--dry-run") || !argv.includes("--write")
  };
}

export async function runRecipeIngredientMigration(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 5000 });

  try {
    const report = await migrateRecipesIngredients(options);
    console.log(formatMigrationReport(report));
    return report;
  } finally {
    await mongoose.disconnect();
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  runRecipeIngredientMigration().catch(async (error) => {
    console.error(error);
    await mongoose.disconnect();
    process.exitCode = 1;
  });
}
