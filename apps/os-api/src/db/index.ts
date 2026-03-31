// ─── Database Connection ──────────────────────────────────────────────────────
// Uses pg (node-postgres) driver with canonical schema from @redcore/db.
// Schema ownership lives in packages/db — this file only owns the connection.

import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from '@redcore/db/schema';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is required');
}

const pool = new pg.Pool({
  connectionString: databaseUrl,
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: true } : false,
});

pool.on('error', (err) => {
  console.error('[db] Unexpected pool error:', err.message);
});

export const db = drizzle(pool, { schema });

export async function closeDb(): Promise<void> {
  await pool.end();
}

export { pool };

// Re-export schema objects for route-level imports
export {
  users,
  subscriptions,
  refreshTokens,
  paymentHistory,
  machineActivations,
  connectedAccounts,
  userPreferences,
  telemetryEvents,
  adminAuditLog,
  donations,
  fleetGroups,
  fleetMembers,
} from '@redcore/db/schema';
