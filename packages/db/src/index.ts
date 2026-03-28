// ─── Unified Database Connection ─────────────────────────────────────────────
// Single PostgreSQL instance shared across web, tuning-api, and os-api.

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgres://localhost:5432/redcore";

const pool = postgres(DATABASE_URL, {
  max: 20,
  idle_timeout: 30,
  connect_timeout: 10,
});

export const db = drizzle(pool, { schema });

export * from "./schema.js";
export type Database = typeof db;
