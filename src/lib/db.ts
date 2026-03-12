// src/lib/db.ts
import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    "MONGODB_URI is not defined. Add it to your .env.local file:\n" +
    "MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/workout_analyzer?retryWrites=true&w=majority"
  );
}

interface Cache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var __mongoCache: Cache | undefined;
}

const cached: Cache = global.__mongoCache ?? { conn: null, promise: null };
global.__mongoCache = cached;

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (cached.conn) {
    console.log("[DB] Reusing existing MongoDB connection");
    return cached.conn;
  }

  if (!cached.promise) {
    const uri = MONGODB_URI as string;
    console.log("[DB] Creating new MongoDB connection to Atlas...");

    cached.promise = mongoose
      .connect(uri, {
        bufferCommands: false,
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        maxPoolSize: 10,
      })
      .then((m) => {
        console.log("[DB] ✅ Connected to MongoDB Atlas successfully");
        console.log("[DB] Database name:", m.connection.name);
        return m;
      })
      .catch((err) => {
        console.error("[DB] ❌ MongoDB connection failed:", err.message);
        cached.promise = null; // allow retry
        throw err;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

export default connectToDatabase;