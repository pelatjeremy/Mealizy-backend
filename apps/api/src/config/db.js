import mongoose from "mongoose";
import { env, maskMongoUri } from "./env.js";

export async function connectDb() {
  mongoose.set("strictQuery", true);
  console.log(`[startup] Connecting to MongoDB: ${maskMongoUri(env.mongoUri)}`);
  await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 5000 });
  console.log(`MongoDB connected: ${mongoose.connection.name}`);
}
