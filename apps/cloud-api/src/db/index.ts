// ─── Database Connection ───────────────────────────────────────────────────────

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

const connectionString =
  process.env.DATABASE_URL ?? "postgres://localhost:5432/redcore_tuning";

// postgres-js client — use max:1 for serverless, higher for long-running server
const queryClient = postgres(connectionString, {
  max: 20,
  idle_timeout: 30,
  connect_timeout: 10,
});

export const db = drizzle(queryClient, { schema });

export * from "./schema.js";
