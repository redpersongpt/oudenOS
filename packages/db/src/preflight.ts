// ─── Database Preflight Check ───────────────────────────────────────────────
// Validates that the live PostgreSQL database matches the canonical schema.
// Call this on API startup to fail fast on schema mismatch instead of
// silently running against stale/conflicting tables.
//
// This does NOT run migrations. It only checks and reports.
// If checks fail, the caller should refuse to start.

import type { Database } from "./index.js";
import { sql } from "drizzle-orm";

export interface PreflightResult {
  passed: boolean;
  checks: PreflightCheck[];
}

export interface PreflightCheck {
  name: string;
  passed: boolean;
  detail: string;
}

/**
 * Required PostgreSQL enum types and their expected values.
 * If the live DB has a different set of values, it needs migration.
 */
const REQUIRED_ENUMS: Record<string, string[]> = {
  subscription_tier: ["free", "premium", "expert", "pro", "enterprise"],
  subscription_status: ["active", "trialing", "past_due", "cancelled", "expired", "incomplete"],
  payment_status: ["succeeded", "failed", "pending", "refunded"],
  machine_status: ["active", "revoked", "expired"],
  oauth_provider: ["google", "apple"],
};

/**
 * Required tables and a sample of expected columns.
 * Not exhaustive — checks critical columns that were renamed during convergence.
 */
const REQUIRED_COLUMNS: Record<string, string[]> = {
  users: ["id", "email", "created_at"],
  subscriptions: ["id", "user_id", "tier", "status", "billing_period"],
  payment_history: ["id", "user_id", "amount_cents", "status", "product"],
  telemetry_events: ["id", "session_id", "event_type", "metadata"],
};

export async function runPreflight(db: Database): Promise<PreflightResult> {
  const checks: PreflightCheck[] = [];

  // ── Check 1: Required tables exist ────────────────────────────────────
  for (const [table, columns] of Object.entries(REQUIRED_COLUMNS)) {
    try {
      const result = await db.execute(sql.raw(`
        SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = '${table}'
      `));

      const existingColumns = new Set(
        (result as unknown as Array<{ column_name: string }>).map((r) => r.column_name)
      );

      if (existingColumns.size === 0) {
        checks.push({
          name: `table:${table}`,
          passed: false,
          detail: `Table "${table}" does not exist`,
        });
        continue;
      }

      const missingColumns = columns.filter((c) => !existingColumns.has(c));
      if (missingColumns.length > 0) {
        checks.push({
          name: `columns:${table}`,
          passed: false,
          detail: `Missing columns in "${table}": ${missingColumns.join(", ")}. ` +
            `If the table has old column names (e.g., "amount" instead of "amount_cents"), ` +
            `run the schema migration.`,
        });
      } else {
        checks.push({
          name: `columns:${table}`,
          passed: true,
          detail: `${columns.length} critical columns verified`,
        });
      }

      // Check for stale columns that indicate un-migrated schema
      const STALE_COLUMNS: Record<string, string[]> = {
        payment_history: ["amount", "tier", "billing_period"],
        telemetry_events: ["event", "properties", "server_timestamp"],
      };

      if (STALE_COLUMNS[table]) {
        const staleFound = STALE_COLUMNS[table].filter((c) => existingColumns.has(c));
        if (staleFound.length > 0) {
          checks.push({
            name: `stale:${table}`,
            passed: false,
            detail: `Stale columns found in "${table}": ${staleFound.join(", ")}. ` +
              `These were renamed in the canonical schema. Migration required.`,
          });
        }
      }
    } catch (e) {
      checks.push({
        name: `table:${table}`,
        passed: false,
        detail: `Query failed: ${e instanceof Error ? e.message : String(e)}`,
      });
    }
  }

  // ── Check 2: Required enums have expected values ──────────────────────
  for (const [enumName, expectedValues] of Object.entries(REQUIRED_ENUMS)) {
    try {
      const result = await db.execute(sql.raw(`
        SELECT enumlabel FROM pg_enum
        JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
        WHERE pg_type.typname = '${enumName}'
        ORDER BY pg_enum.enumsortorder
      `));

      const actualValues = (result as unknown as Array<{ enumlabel: string }>).map(
        (r) => r.enumlabel
      );

      if (actualValues.length === 0) {
        checks.push({
          name: `enum:${enumName}`,
          passed: false,
          detail: `Enum "${enumName}" does not exist in the database`,
        });
        continue;
      }

      const missingValues = expectedValues.filter((v) => !actualValues.includes(v));
      if (missingValues.length > 0) {
        checks.push({
          name: `enum:${enumName}`,
          passed: false,
          detail: `Enum "${enumName}" is missing values: ${missingValues.join(", ")}. ` +
            `Current: [${actualValues.join(", ")}]. ` +
            `Run: ${missingValues.map((v) => `ALTER TYPE ${enumName} ADD VALUE IF NOT EXISTS '${v}'`).join("; ")}`,
        });
      } else {
        checks.push({
          name: `enum:${enumName}`,
          passed: true,
          detail: `${actualValues.length} values verified`,
        });
      }
    } catch (e) {
      checks.push({
        name: `enum:${enumName}`,
        passed: false,
        detail: `Query failed: ${e instanceof Error ? e.message : String(e)}`,
      });
    }
  }

  return {
    passed: checks.every((c) => c.passed),
    checks,
  };
}

/**
 * Run preflight and log results. Returns true if all checks pass.
 * Call this from API startup to fail fast on schema mismatch.
 */
export async function preflightOrDie(
  db: Database,
  logger: { info: (msg: string) => void; error: (msg: string) => void; warn: (msg: string) => void },
): Promise<void> {
  logger.info("[preflight] Checking database schema compatibility...");

  const result = await runPreflight(db);

  for (const check of result.checks) {
    if (check.passed) {
      logger.info(`[preflight] PASS  ${check.name} — ${check.detail}`);
    } else {
      logger.error(`[preflight] FAIL  ${check.name} — ${check.detail}`);
    }
  }

  if (!result.passed) {
    const failCount = result.checks.filter((c) => !c.passed).length;
    logger.error(
      `[preflight] ${failCount} check(s) failed. ` +
      `The database schema does not match the canonical definition in packages/db. ` +
      `Run migrations or use 'pnpm --filter @redcore/db db:push' to align.`
    );
    throw new Error(`Database preflight failed: ${failCount} incompatible schema element(s)`);
  }

  logger.info("[preflight] All schema checks passed.");
}
