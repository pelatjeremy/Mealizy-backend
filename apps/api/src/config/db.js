import mongoose from "mongoose";
import { env } from "./env.js";

function maskMongoUri(uri = "") {
  try {
    const parsed = new URL(uri);
    if (parsed.password) parsed.password = "***";
    return parsed.toString();
  } catch {
    return uri.replace(/:\/\/([^:]+):([^@]+)@/, "://$1:***@");
  }
}

export async function connectDb() {
  mongoose.set("strictQuery", true);
  console.log(`[startup] Connecting to MongoDB: ${maskMongoUri(env.mongoUri)}`);
  await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 5000 });
  console.log(`MongoDB connected: ${mongoose.connection.name}`);
}
