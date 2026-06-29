import mongoose from "mongoose";
import { pathToFileURL } from "url";
import { env } from "../config/env.js";
import { formatSpoonacularSyncReport, syncSpoonacularCatalog } from "../services/spoonacularSyncService.js";

function readArgValue(argv, name, fallback = undefined) {
  const inline = argv.find((arg) => arg.startsWith(`${name}=`));
  if (inline) return inline.slice(name.length + 1);
  const index = argv.indexOf(name);
  if (index === -1) return fallback;
  return argv[index + 1] ?? fallback;
}

function parseArgs(argv) {
  const category = readArgValue(argv, "--category", readArgValue(argv, "--type", ""));
  return {
    q: readArgValue(argv, "--query", readArgValue(argv, "--q", "pasta")),
    limit: Number(readArgValue(argv, "--limit", 24)),
    page: Number(readArgValue(argv, "--page", 1)),
    filters: category ? { category } : {}
  };
}

export async function runSpoonacularSync(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 5000 });

  try {
    const report = await syncSpoonacularCatalog(options);
    console.log(formatSpoonacularSyncReport(report));
    return report;
  } finally {
    await mongoose.disconnect();
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  runSpoonacularSync().catch(async (error) => {
    console.error(error);
    await mongoose.disconnect();
    process.exitCode = 1;
  });
}

