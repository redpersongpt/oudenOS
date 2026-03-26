// ─── Database Connection ──────────────────────────────────────────────────────

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

const connectionString = process.env.DATABASE_URL ?? "postgres://localhost:5432/redcore_tuning";

const queryClient = postgres(connectionString);
export const db = drizzle(queryClient, { schema });

export * from "./schema.js";
