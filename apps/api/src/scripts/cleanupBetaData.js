import mongoose from "mongoose";
import { pathToFileURL } from "url";
import { env } from "../config/env.js";
import { cleanupBetaData, formatCleanupBetaDataReport } from "../services/betaDataCleanupService.js";

function parseArgs(argv) {
  const execute = argv.includes("--execute");
  return {
    execute,
    dryRun: !execute
  };
}

export async function runCleanupBetaData(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 5000 });

  try {
    const report = await cleanupBetaData({ execute: options.execute });
    console.log(formatCleanupBetaDataReport(report));
    if (options.dryRun) {
      console.log("Dry-run only. Re-run with --execute after reviewing the matched samples.");
    }
    return report;
  } finally {
    await mongoose.disconnect();
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCleanupBetaData().catch(async (error) => {
    console.error(error);
    await mongoose.disconnect();
    process.exitCode = 1;
  });
}
