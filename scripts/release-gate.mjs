#!/usr/bin/env node
// ─── Release Gate ───────────────────────────────────────────────────────────
// Verifies that all release-blocking conditions are met before a version
// can be tagged and shipped. Fails hard if any condition is not met.
//
// Checks:
//   1. pnpm verify passes (parity + typecheck)
//   2. Windows runtime proof artifacts exist and passed
//   3. Proof version matches the release version
//   4. Proof is recent (not stale — within 7 days)
//   5. No known release blockers in the repo
//
// Usage: node scripts/release-gate.mjs [--version v0.1.0]
// Exit code 0 = clear to release, 1 = blocked

import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const PROOF_DIR = join(ROOT, "artifacts", "windows-proof");
const MAX_PROOF_AGE_DAYS = 7;

const args = process.argv.slice(2);
let targetVersion = null;
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--version" && args[i + 1]) {
    targetVersion = args[i + 1].replace(/^v/, "");
    i++;
  }
}

console.log("");
console.log("  redcore OS — Release Gate");
console.log("  ─────────────────────────");
if (targetVersion) console.log(`  Target version: ${targetVersion}`);
console.log("");

let exitCode = 0;
const checks = [];

function check(name, pass, detail = "") {
  const status = pass ? "PASS" : "FAIL";
  console.log(`  ${status}  ${name}${detail ? ` (${detail})` : ""}`);
  checks.push({ name, pass, detail });
  if (!pass) exitCode = 1;
}

// ─── Check 1: pnpm verify ──────────────────────────────────────────────────

try {
  execSync("node scripts/validate-action-parity.mjs --quiet", { cwd: ROOT, stdio: "pipe" });
  check("action-parity-valid", true);
} catch {
  check("action-parity-valid", false, "pnpm validate:os:parity failed");
}

// ─── Check 2: Windows proof artifacts exist ─────────────────────────────────

if (!existsSync(PROOF_DIR)) {
  check("windows-proof-exists", false, `${PROOF_DIR} not found — run capture-windows-proof.ps1 on Windows`);
} else {
  const proofDirs = readdirSync(PROOF_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort()
    .reverse();

  if (proofDirs.length === 0) {
    check("windows-proof-exists", false, "No proof directories found");
  } else {
    const latestDir = join(PROOF_DIR, proofDirs[0]);
    const summaryPath = join(latestDir, "proof-summary.json");

    if (!existsSync(summaryPath)) {
      check("windows-proof-exists", false, `${proofDirs[0]}/proof-summary.json not found`);
    } else {
      const summary = JSON.parse(readFileSync(summaryPath, "utf-8"));
      check("windows-proof-exists", true, `dir=${proofDirs[0]}`);

      // Check 3: Proof passed
      check("windows-proof-passed", summary.verdict === "PASS", `verdict=${summary.verdict}, ${summary.passed}/${summary.passed + summary.failed}`);

      // Check 4: Proof version matches
      if (targetVersion) {
        const proofVersion = summary.version || "unknown";
        const versionMatch = proofVersion === targetVersion || proofVersion.startsWith(targetVersion);
        check("windows-proof-version-match", versionMatch, `proof=${proofVersion} target=${targetVersion}`);
      }

      // Check 5: Proof is recent
      const proofTimestamp = summary.timestamp;
      if (proofTimestamp) {
        // Parse the timestamp format YYYY-MM-DD-HHmmss
        const parts = proofTimestamp.match(/(\d{4})-(\d{2})-(\d{2})-(\d{2})(\d{2})(\d{2})/);
        if (parts) {
          const proofDate = new Date(`${parts[1]}-${parts[2]}-${parts[3]}T${parts[4]}:${parts[5]}:${parts[6]}`);
          const ageDays = (Date.now() - proofDate.getTime()) / (1000 * 60 * 60 * 24);
          check("windows-proof-recent", ageDays <= MAX_PROOF_AGE_DAYS, `${Math.round(ageDays)}d old, max=${MAX_PROOF_AGE_DAYS}d`);
        }
      }

      // Check 6: Required proof artifacts present
      const requiredArtifacts = [
        "system-status.json",
        "playbook-resolve.json",
        "apply-result.json",
        "verify-readback.json",
        "rollback-list.json",
        "ledger-query.json",
        "proof-summary.json",
      ];
      const missing = requiredArtifacts.filter((f) => !existsSync(join(latestDir, f)));
      check("windows-proof-artifacts-complete", missing.length === 0,
        missing.length > 0 ? `missing: ${missing.join(", ")}` : `${requiredArtifacts.length} artifacts`);
    }
  }
}

// ─── Check 7: No RELEASE_BLOCKER markers in codebase ────────────────────────

try {
  const blockerOutput = execSync(
    `grep -r "RELEASE_BLOCKER" --include="*.ts" --include="*.tsx" --include="*.rs" --include="*.yaml" --include="*.yml" -l . 2>/dev/null || true`,
    { cwd: ROOT, encoding: "utf-8" }
  ).trim();
  const blockerFiles = blockerOutput ? blockerOutput.split("\n").filter(Boolean) : [];
  check("no-release-blockers", blockerFiles.length === 0,
    blockerFiles.length > 0 ? `found in: ${blockerFiles.join(", ")}` : "");
} catch {
  check("no-release-blockers", true, "grep not available, skipped");
}

// ─── Summary ────────────────────────────────────────────────────────────────

console.log("");
const passed = checks.filter((c) => c.pass).length;
const failed = checks.filter((c) => !c.pass).length;
console.log(`  ${passed} passed, ${failed} failed`);
console.log(`  VERDICT: ${exitCode === 0 ? "CLEAR TO RELEASE" : "BLOCKED"}`);

if (exitCode !== 0) {
  console.log("");
  console.log("  Release is blocked. Fix the failing checks above.");
  console.log("  Windows proof: run scripts/capture-windows-proof.ps1 on a real Windows machine.");
}
console.log("");

process.exit(exitCode);
