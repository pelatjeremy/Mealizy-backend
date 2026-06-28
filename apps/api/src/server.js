import { app } from "./app.js";
import { connectDb } from "./config/db.js";
import { env } from "./config/env.js";

async function bootstrap() {
  console.log("[startup] Mealizy API bootstrap started");
  console.log(`[startup] PORT=${env.port}`);
  console.log(`[startup] JWT_SECRET=${env.jwtSecret ? "set" : "missing"}`);
  await connectDb();
  console.log("[startup] MongoDB connection completed");
  console.log("[startup] Starting Express listener");
  app.listen(env.port, () => {
    console.log(`Mealizy API listening on http://localhost:${env.port}`);
  });
}

bootstrap().catch((error) => {
  console.error("Unable to start Mealizy API", error);
  process.exit(1);
});
