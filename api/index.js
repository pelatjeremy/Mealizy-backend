import { app } from "../src/app.js";
import { connectDb } from "../src/config/db.js";

let dbConnectionPromise;

async function ensureDbConnection() {
  if (!dbConnectionPromise) {
    dbConnectionPromise = connectDb();
  }

  return dbConnectionPromise;
}

export default async function handler(req, res) {
  await ensureDbConnection();
  return app(req, res);
}
