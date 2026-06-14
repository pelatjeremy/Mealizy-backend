import { app } from "./app.js";
import { connectDb } from "./config/db.js";
import { env } from "./config/env.js";

async function bootstrap() {
  await connectDb();
  app.listen(env.port, () => {
    console.log(`Mealizy API listening on http://localhost:${env.port}`);
  });
}

bootstrap().catch((error) => {
  console.error("Unable to start Mealizy API", error);
  process.exit(1);
});
