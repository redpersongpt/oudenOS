#!/usr/bin/env node
// ─── Database Convergence Operator ──────────────────────────────────────────
// Safe entrypoint for running the schema convergence migration and verifying
// the result against the canonical preflight checks.
//
// Modes:
//   check    — run preflight only, report pass/fail (no changes)
//   migrate  — run the convergence SQL then verify with preflight
//   verify   — alias for check
//
// Usage:
//   node scripts/db-converge.mjs check
//   node scripts/db-converge.mjs migrate
//   node scripts/db-converge.mjs migrate --dry-run
//
// Environment:
//   DATABASE_URL (required) — PostgreSQL connection string
//
// Exit codes:
//   0 = passed / migration succeeded
//   1 = failed / DB incompatible / migration error

import { readFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const MIGRATION_FILE = join(ROOT, "packages/db/migrations/001_schema_convergence.sql");

const args = process.argv.slice(2);
const mode = args[0] ?? "check";
const dryRun = args.includes("--dry-run");

const DB_URL = process.env.DATABASE_URL;

// ─── Environment validation ────────────────────────────────────────────────

console.log("");
console.log("  redcore — Database Convergence Operator");
console.log("  ────────────────────────────────────────");

if (!DB_URL) {
  console.error("  FAIL  DATABASE_URL is not set.");
  console.error("        Export it before running: export DATABASE_URL=postgres://...");
  console.error("");
  process.exit(1);
}

// Parse connection string safely — show host/db, never password
function describeTarget(url) {
  try {
    const parsed = new URL(url);
    return `${parsed.hostname}:${parsed.port || 5432}/${parsed.pathname.replace("/", "")}`;
  } catch {
    return "(unparseable connection string)";
  }
}

const target = describeTarget(DB_URL);
console.log(`  Target: ${target}`);
console.log(`  Mode:   ${mode}${dryRun ? " (dry-run)" : ""}`);
console.log("");

// ─── Preflight check (shared with packages/db) ─────────────────────────────

async function runPreflight() {
  console.log("  Running preflight checks against live database...");
  console.log("");

  try {
    // Build packages/db if needed
    const distExists = existsSync(join(ROOT, "packages/db/dist/preflight.js"));
    if (!distExists) {
      console.log("  Building packages/db...");
      execSync("pnpm --filter @redcore/db build", { cwd: ROOT, stdio: "pipe" });
    }

    const { runPreflight: preflight } = await import(join(ROOT, "packages/db/dist/preflight.js"));
    const { db } = await import(join(ROOT, "packages/db/dist/index.js"));

    const result = await preflight(db);

    for (const check of result.checks) {
      const status = check.passed ? "PASS" : "FAIL";
      console.log(`  ${status}  ${check.name}`);
      if (!check.passed) {
        console.log(`         ${check.detail}`);
      }
    }

    console.log("");
    const passed = result.checks.filter((c) => c.passed).length;
    const failed = result.checks.filter((c) => !c.passed).length;
    console.log(`  ${passed} passed, ${failed} failed`);

    // Force-close the connection pool
    try {
      const pg = await import(join(ROOT, "packages/db/dist/index.js"));
      // postgres-js doesn't expose pool.end() on the drizzle instance,
      // but the process will exit cleanly after we return
    } catch { /* ok */ }

    return result.passed;
  } catch (e) {
    console.error(`  ERROR  Preflight failed to run: ${e.message}`);
    return false;
  }
}

// ─── Migration execution ───────────────────────────────────────────────────

async function runMigration() {
  if (!existsSync(MIGRATION_FILE)) {
    console.error(`  FAIL  Migration file not found: ${MIGRATION_FILE}`);
    return false;
  }

  const sql = readFileSync(MIGRATION_FILE, "utf-8");
  const statementCount = (sql.match(/DO \$\$/g) || []).length + (sql.match(/ALTER TYPE/g) || []).length;

  console.log(`  Migration: 001_schema_convergence.sql`);
  console.log(`  Statements: ~${statementCount} operations`);
  console.log(`  Target: ${target}`);
  console.log("");

  if (dryRun) {
    console.log("  DRY RUN — migration will NOT be executed.");
    console.log("  The following SQL would run:");
    console.log("");
    // Show just the operation summaries, not full SQL
    const ops = sql.match(/RAISE NOTICE '([^']+)'/g) || [];
    for (const op of ops) {
      const msg = op.match(/RAISE NOTICE '([^']+)'/)?.[1];
      if (msg) console.log(`    ${msg}`);
    }
    console.log("");
    console.log("  Remove --dry-run to execute for real.");
    return true;
  }

  console.log("  Executing migration...");
  console.log("");

  try {
    const output = execSync(`psql "${DB_URL}" -f "${MIGRATION_FILE}" 2>&1`, {
      encoding: "utf-8",
      timeout: 60000,
    });

    // Show NOTICE lines (our progress markers)
    const notices = output.split("\n").filter(
      (l) => l.includes("NOTICE") || l.includes("COMMIT") || l.includes("BEGIN")
    );
    for (const line of notices) {
      console.log(`  ${line.trim()}`);
    }

    console.log("");
    console.log("  Migration executed successfully.");
    return true;
  } catch (e) {
    console.error(`  FAIL  Migration execution failed:`);
    console.error(`  ${e.message}`);
    if (e.stdout) console.error(e.stdout);
    return false;
  }
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  if (mode === "check" || mode === "verify") {
    const passed = await runPreflight();
    console.log(passed ? "  RESULT: COMPATIBLE" : "  RESULT: INCOMPATIBLE");
    console.log("");
    if (!passed) {
      console.log("  Run: node scripts/db-converge.mjs migrate");
    }
    process.exit(passed ? 0 : 1);
  }

  if (mode === "migrate") {
    // Step 1: Run pre-migration preflight to see current state
    console.log("  ── Pre-migration check ──");
    const preOk = await runPreflight();

    if (preOk) {
      console.log("  Database already passes preflight. Migration may not be needed.");
      console.log("  RESULT: ALREADY COMPATIBLE");
      console.log("");
      process.exit(0);
    }

    console.log("");
    console.log("  ── Running migration ──");
    const migrated = await runMigration();

    if (!migrated) {
      console.log("  RESULT: MIGRATION FAILED");
      console.log("");
      process.exit(1);
    }

    // Step 2: Post-migration verification
    console.log("");
    console.log("  ── Post-migration verification ──");
    const postOk = await runPreflight();

    if (postOk) {
      console.log("  RESULT: MIGRATION SUCCEEDED — database is now compatible");
    } else {
      console.log("  RESULT: MIGRATION RAN BUT VERIFICATION STILL FAILS");
      console.log("  Manual intervention may be required.");
    }
    console.log("");
    process.exit(postOk ? 0 : 1);
  }

  console.error(`  Unknown mode: ${mode}`);
  console.error("  Usage: node scripts/db-converge.mjs [check|migrate|verify] [--dry-run]");
  process.exit(1);
}

main().catch((e) => {
  console.error(`  Fatal: ${e.message}`);
  process.exit(1);
});
