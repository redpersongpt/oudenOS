// ─── Database Connection ──────────────────────────────────────────────────────

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is required");
}

const queryClient = postgres(connectionString, {
  ssl: process.env.NODE_ENV === "production" ? "require" : false,
});
export const db = drizzle(queryClient, { schema });

export * from "./schema.js";
