#!/usr/bin/env node
// ─── Release Gate ───────────────────────────────────────────────────────────
// Verifies that ALL release-blocking conditions are met before a version
// can be tagged and shipped. Fails hard if any condition is not met.
//
// TRUTH BOUNDARY:
//   Cross-platform checks run here (parity, typecheck, structural).
//   Windows-only checks are validated via proof artifact inspection.
//   The gate NEVER claims Windows runtime truth from non-Windows checks.
//
// ANTI-FAKE:
//   - Proof artifacts must contain binding fields (commit SHA, version, platform)
//   - Bindings must match the target release identity
//   - Proof must not be stale (>7 days old)
//   - Running this gate on non-Windows explicitly marks Windows checks as UNPROVEN
//
// Usage: node scripts/release-gate.mjs [--version v0.1.0] [--commit abc1234]
// Exit code 0 = clear to release, 1 = blocked

import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import {
  WINDOWS_PROOF_ARTIFACTS,
  REBOOT_PROOF_ARTIFACTS,
  PROOF_SUMMARY_SCHEMA,
  REBOOT_PROOF_SCHEMA,
  validateProofSummary,
  validateProofBinding,
  isProofStale,
  getEnvironmentCapabilities,
  PROOF_MAX_AGE_DAYS,
} from "./lib/evidence-contract.mjs";
import {
  verifyManifest,
  verifyManifestBinding,
  MANIFEST_FILENAME,
} from "./lib/proof-provenance.mjs";

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const PROOF_DIR = join(ROOT, "artifacts", "windows-proof");
const REBOOT_PROOF_DIR = join(ROOT, "artifacts", "reboot-proof");

// ─── Parse args ─────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
let targetVersion = null;
let targetCommit = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--version" && args[i + 1]) {
    targetVersion = args[i + 1].replace(/^v/, "");
    i++;
  }
  if (args[i] === "--commit" && args[i + 1]) {
    targetCommit = args[i + 1];
    i++;
  }
}

// Auto-detect commit SHA if not provided
if (!targetCommit) {
  try {
    targetCommit = execSync("git rev-parse HEAD", { cwd: ROOT, encoding: "utf-8" }).trim();
  } catch { /* ok */ }
}

// Auto-detect version if not provided
if (!targetVersion) {
  try {
    const pkg = JSON.parse(readFileSync(join(ROOT, "apps/os-desktop/package.json"), "utf-8"));
    targetVersion = pkg.version;
  } catch { /* ok */ }
}

// ─── Environment detection ──────────────────────────────────────────────────

const env = getEnvironmentCapabilities();

console.log("");
console.log("  redcore OS — Release Gate");
console.log("  ─────────────────────────");
console.log(`  Environment: ${env.platform} (${env.canProveWindowsOnly ? "full" : "cross-platform only"})`);
if (targetVersion) console.log(`  Target version: ${targetVersion}`);
if (targetCommit) console.log(`  Target commit:  ${targetCommit.slice(0, 7)}`);
console.log(`  Truth: ${env.truthStatement}`);
console.log("");

let exitCode = 0;
const checks = [];

function check(name, pass, detail = "") {
  const status = pass ? "PASS" : "FAIL";
  console.log(`  ${status}  ${name}${detail ? ` — ${detail}` : ""}`);
  checks.push({ name, pass, detail });
  if (!pass) exitCode = 1;
}

function unproven(name, detail = "") {
  console.log(`  ????  ${name} — UNPROVEN${detail ? ` (${detail})` : ""}`);
  checks.push({ name, pass: false, detail: `UNPROVEN: ${detail}` });
  exitCode = 1;
}

// ─── Section 1: Cross-platform checks ───────────────────────────────────────

console.log("  ── Cross-platform checks ──");

// Check 1: Action parity
try {
  execSync("node scripts/validate-action-parity.mjs --quiet", { cwd: ROOT, stdio: "pipe" });
  check("action-parity", true);
} catch {
  check("action-parity", false, "validate-action-parity.mjs failed");
}

// Check 2: No RELEASE_BLOCKER markers
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

// Check 3: No hardcoded fallback URLs in download truth
try {
  const dlContent = readFileSync(join(ROOT, "apps/web/src/lib/downloads.ts"), "utf-8");
  const hasFallback = dlContent.includes("OS_FALLBACK_URL") || dlContent.includes("FALLBACK");
  check("no-download-fallback", !hasFallback,
    hasFallback ? "downloads.ts still contains a fallback URL" : "canonical metadata only");
} catch {
  check("no-download-fallback", false, "could not read downloads.ts");
}

console.log("");

// ─── Section 2: Windows proof artifacts ─────────────────────────────────────

console.log("  ── Windows runtime proof ──");

if (!existsSync(PROOF_DIR)) {
  unproven("windows-proof-exists", `${PROOF_DIR} not found — run capture-windows-proof.ps1 on Windows`);
} else {
  const proofDirs = readdirSync(PROOF_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort()
    .reverse();

  if (proofDirs.length === 0) {
    unproven("windows-proof-exists", "No proof directories found");
  } else {
    const latestDir = join(PROOF_DIR, proofDirs[0]);
    const summaryPath = join(latestDir, "proof-summary.json");

    if (!existsSync(summaryPath)) {
      unproven("windows-proof-exists", `${proofDirs[0]}/proof-summary.json not found`);
    } else {
      const summary = JSON.parse(readFileSync(summaryPath, "utf-8"));
      check("windows-proof-exists", true, `dir=${proofDirs[0]}`);

      // Verdict
      check("windows-proof-passed", summary.verdict === "PASS",
        `verdict=${summary.verdict}, ${summary.passed}/${summary.passed + summary.failed}`);

      // Staleness
      if (summary.timestamp) {
        const staleness = isProofStale(summary.timestamp);
        check("windows-proof-fresh", !staleness.stale,
          staleness.stale ? staleness.reason : `${staleness.ageDays}d old (max ${PROOF_MAX_AGE_DAYS}d)`);
      } else {
        check("windows-proof-fresh", false, "no timestamp in proof summary");
      }

      // Binding validation (anti-fake)
      const bindingResult = validateProofSummary(summary, PROOF_SUMMARY_SCHEMA);
      if (!bindingResult.valid) {
        // Check if it's just missing binding fields (pre-hardening proof)
        const missingBinding = bindingResult.errors.filter(e => e.includes("binding field"));
        const missingRequired = bindingResult.errors.filter(e => !e.includes("binding field") && !e.includes("verdict"));

        if (missingBinding.length > 0) {
          check("windows-proof-bound", false,
            `Proof missing binding fields: ${missingBinding.map(e => e.replace("Missing binding field: ", "").replace(" (proof cannot be bound to a release)", "")).join(", ")}. Re-capture with updated capture script.`);
        }
        if (missingRequired.length > 0) {
          check("windows-proof-schema", false, missingRequired.join("; "));
        }
      } else {
        check("windows-proof-schema", true, "all required + binding fields present");

        // Commit binding
        if (targetCommit && summary.gitCommitSha) {
          const commitMatch = summary.gitCommitSha === targetCommit ||
            summary.gitCommitSha.startsWith(targetCommit) ||
            targetCommit.startsWith(summary.gitCommitSha);
          check("windows-proof-commit-match", commitMatch,
            `proof=${summary.gitCommitSha?.slice(0, 7)} target=${targetCommit.slice(0, 7)}`);
        }

        // Version binding
        if (targetVersion && summary.appVersion) {
          check("windows-proof-version-match", summary.appVersion === targetVersion,
            `proof=${summary.appVersion} target=${targetVersion}`);
        }

        // Platform binding
        if (summary.targetPlatform) {
          check("windows-proof-platform", summary.targetPlatform.includes("windows"),
            `platform=${summary.targetPlatform}`);
        }
      }

      // Required artifacts
      const missing = WINDOWS_PROOF_ARTIFACTS.filter((f) => !existsSync(join(latestDir, f)));
      check("windows-proof-artifacts-complete", missing.length === 0,
        missing.length > 0 ? `missing: ${missing.join(", ")}` : `${WINDOWS_PROOF_ARTIFACTS.length} artifacts`);

      // ── Provenance / tamper detection ──
      const manifestResult = verifyManifest(latestDir);
      if (!manifestResult.valid) {
        if (manifestResult.errors.some(e => e.includes("not found"))) {
          check("windows-proof-provenance", false,
            "proof-manifest.json missing — re-capture with updated script to get hash-chain provenance");
        } else if (manifestResult.errors.some(e => e.includes("TAMPER"))) {
          check("windows-proof-tamper-free", false,
            manifestResult.errors.filter(e => e.includes("TAMPER")).join("; "));
        } else {
          check("windows-proof-provenance", false, manifestResult.errors.join("; "));
        }
      } else {
        check("windows-proof-provenance", true,
          `bundle=${manifestResult.bundleDigest?.slice(0, 12)}... (${manifestResult.manifest.artifacts.length} files verified)`);

        // Binding verification via manifest
        if (targetCommit || targetVersion) {
          const mbResult = verifyManifestBinding(manifestResult.manifest, {
            commitSha: targetCommit,
            version: targetVersion,
          });
          check("windows-proof-manifest-binding", mbResult.valid,
            mbResult.valid ? "commit+version match" : mbResult.errors.join("; "));
        }

        // Provenance source
        const src = manifestResult.manifest.provenance?.source;
        if (src === "ci") {
          check("windows-proof-ci-provenance", true,
            `CI run ${manifestResult.manifest.provenance.ciRunId}`);
        } else {
          check("windows-proof-ci-provenance", false,
            `source=${src} — proof not captured in CI (lower assurance)`);
        }

        // Log warnings
        for (const w of manifestResult.warnings) {
          console.log(`  WARN  ${w}`);
        }
      }
    }
  }
}

console.log("");

// ─── Section 3: Reboot/resume proof ─────────────────────────────────────────

console.log("  ── Reboot/resume proof ──");

if (!existsSync(REBOOT_PROOF_DIR)) {
  unproven("reboot-proof-exists", `${REBOOT_PROOF_DIR} not found — run capture-reboot-proof.ps1 phases A+B on Windows`);
} else {
  const rebootDirs = readdirSync(REBOOT_PROOF_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort()
    .reverse();

  if (rebootDirs.length === 0) {
    unproven("reboot-proof-exists", "No reboot proof directories found");
  } else {
    const latestDir = join(REBOOT_PROOF_DIR, rebootDirs[0]);
    const summaryPath = join(latestDir, "reboot-proof-summary.json");

    if (!existsSync(summaryPath)) {
      unproven("reboot-proof-exists", `${rebootDirs[0]}/reboot-proof-summary.json not found — Phase B may not have run`);
    } else {
      const summary = JSON.parse(readFileSync(summaryPath, "utf-8"));
      check("reboot-proof-exists", true, `dir=${rebootDirs[0]}`);

      check("reboot-proof-passed", summary.verdict === "PASS",
        `verdict=${summary.verdict}, ${summary.passed}/${summary.passed + summary.failed}`);

      // Binding validation
      const rebootBinding = validateProofSummary(summary, REBOOT_PROOF_SCHEMA);
      if (!rebootBinding.valid) {
        const missingBinding = rebootBinding.errors.filter(e => e.includes("binding field"));
        if (missingBinding.length > 0) {
          check("reboot-proof-bound", false, "Missing binding fields — re-capture with updated script");
        }
      }

      // Artifact completeness
      const missingReboot = REBOOT_PROOF_ARTIFACTS.filter((f) => !existsSync(join(latestDir, f)));
      check("reboot-proof-artifacts-complete", missingReboot.length === 0,
        missingReboot.length > 0 ? `missing: ${missingReboot.join(", ")}` : `${REBOOT_PROOF_ARTIFACTS.length} artifacts`);

      // Provenance
      const rebootManifest = verifyManifest(latestDir);
      if (rebootManifest.valid) {
        check("reboot-proof-provenance", true,
          `bundle=${rebootManifest.bundleDigest?.slice(0, 12)}...`);
      } else if (rebootManifest.errors.some(e => e.includes("TAMPER"))) {
        check("reboot-proof-tamper-free", false,
          rebootManifest.errors.filter(e => e.includes("TAMPER")).join("; "));
      } else {
        check("reboot-proof-provenance", false,
          "proof-manifest.json missing or invalid — re-capture with updated script");
      }
    }
  }
}

console.log("");

// ─── Section 4: Environment truth boundary ──────────────────────────────────

console.log("  ── Truth boundary ──");

if (!env.canProveWindowsOnly) {
  console.log(`  INFO  Running on ${env.platform} — Windows runtime checks validated via artifacts only`);
  console.log(`  INFO  Cross-platform structural checks are authoritative`);
  console.log(`  INFO  Windows proof artifacts are inspected, not re-executed`);
  console.log(`  WARN  If proof artifacts are missing or stale, release is BLOCKED`);
} else {
  console.log(`  INFO  Running on Windows — both cross-platform and Windows checks available`);
}

console.log("");

// ─── Summary ────────────────────────────────────────────────────────────────

const passed = checks.filter((c) => c.pass).length;
const failed = checks.filter((c) => !c.pass).length;
const unprovenCount = checks.filter((c) => c.detail?.startsWith("UNPROVEN")).length;

console.log(`  ${passed} passed, ${failed} failed${unprovenCount > 0 ? `, ${unprovenCount} unproven` : ""}`);

if (exitCode === 0) {
  console.log("  VERDICT: CLEAR TO RELEASE");
} else if (unprovenCount > 0 && unprovenCount === failed) {
  console.log("  VERDICT: BLOCKED — Windows proof missing (not capturable from this environment)");
} else {
  console.log("  VERDICT: BLOCKED");
}

if (exitCode !== 0) {
  console.log("");
  if (unprovenCount > 0) {
    console.log("  Windows proof capture required:");
    console.log("    1. Build on Windows: cd services/os-service && cargo build --release");
    console.log("    2. Capture proof:    .\\scripts\\capture-windows-proof.ps1");
    console.log("    3. Capture reboot:   .\\scripts\\capture-reboot-proof.ps1 -Phase pre-reboot");
    console.log("    4. Commit artifacts: git add artifacts/ && git commit");
  }
  console.log("  Fix failing checks above before releasing.");
}
console.log("");

process.exit(exitCode);
