import { pathToFileURL } from "url";
import mongoose from "mongoose";
import { runSpoonacularSync } from "./syncSpoonacularCatalog.js";

export { runSpoonacularSync };

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  runSpoonacularSync().catch(async (error) => {
    console.error(error);
    await mongoose.disconnect();
    process.exitCode = 1;
  });
}
