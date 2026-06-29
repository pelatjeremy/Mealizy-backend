import crypto from "crypto";
import mongoose from "mongoose";
import { pathToFileURL } from "url";
import { env } from "../config/env.js";
import { demoRecipes } from "../data/demoRecipes.js";
import { Recipe } from "../models/Recipe.js";
import { User } from "../models/User.js";

export const demoUserSeed = {
  email: "demo@mealizy.app",
  username: "Mealizy Demo",
  firstname: "Mealizy",
  lastname: "Demo",
  source: "seed"
};

export async function seedDemoRecipes() {
  if (process.env.NODE_ENV === "production" && !process.argv.includes("--allow-production")) {
    throw new Error("seed:demo-recipes is disabled in production. Use --allow-production only for an isolated demo database.");
  }

  const password = crypto.randomBytes(24).toString("hex");
  const demoUser = await User.findOneAndUpdate(
    { email: demoUserSeed.email },
    { $setOnInsert: { ...demoUserSeed, password } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const results = [];
  for (const recipe of demoRecipes) {
    const seededRecipe = await Recipe.findOneAndUpdate(
      { externalId: recipe.externalId },
      {
        ...recipe,
        source: "user",
        userId: demoUser._id,
        categories: recipe.categories || []
      },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );
    results.push(seededRecipe);
  }

  return { user: demoUser, recipes: results };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await mongoose.connect(env.mongoUri);
  const result = await seedDemoRecipes();
  console.log(`Seeded ${result.recipes.length} demo recipes for ${result.user.email}`);
  await mongoose.disconnect();
}
