// ─── Database Connection ──────────────────────────────────────────────────────
// Uses postgres-js driver with canonical schema from @redcore/db.
// Schema ownership lives in packages/db — this file only owns the connection.

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@redcore/db/schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is required");
}

const queryClient = postgres(connectionString, {
  ssl: process.env.NODE_ENV === "production" ? "require" : false,
});
export const db = drizzle(queryClient, { schema });

// Re-export schema objects for route-level imports
export {
  users,
  subscriptions,
  refreshTokens,
  paymentHistory,
  machineActivations,
  connectedAccounts,
  userPreferences,
} from "@redcore/db/schema";
