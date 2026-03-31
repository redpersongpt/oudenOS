#!/usr/bin/env node
// ─── Proof Validator ───────────────────────────────────────────────────────
// Validates Windows proof artifacts against the evidence contract.
// Can be run from any platform to inspect proof quality.
//
// Usage:
//   node scripts/validate-proof.mjs                    # validate latest proof
//   node scripts/validate-proof.mjs --dir path/to/dir  # validate specific dir
//   node scripts/validate-proof.mjs --commit abc1234   # check binding to commit
//   node scripts/validate-proof.mjs --version 0.1.0    # check binding to version
//
// Exit code 0 = valid, 1 = invalid or missing

import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  WINDOWS_PROOF_ARTIFACTS,
  REBOOT_PROOF_ARTIFACTS,
  PROOF_SUMMARY_SCHEMA,
  REBOOT_PROOF_SCHEMA,
  validateProofSummary,
  validateProofBinding,
  isProofStale,
  getEnvironmentCapabilities,
} from "./lib/evidence-contract.mjs";

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const args = process.argv.slice(2);

let proofDir = null;
let targetCommit = null;
let targetVersion = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--dir" && args[i + 1]) { proofDir = args[i + 1]; i++; }
  if (args[i] === "--commit" && args[i + 1]) { targetCommit = args[i + 1]; i++; }
  if (args[i] === "--version" && args[i + 1]) { targetVersion = args[i + 1].replace(/^v/, ""); i++; }
}

// Auto-find latest proof dir
if (!proofDir) {
  const baseDir = join(ROOT, "artifacts", "windows-proof");
  if (existsSync(baseDir)) {
    const dirs = readdirSync(baseDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name)
      .sort()
      .reverse();
    if (dirs.length > 0) proofDir = join(baseDir, dirs[0]);
  }
}

const env = getEnvironmentCapabilities();

console.log("");
console.log("  redcore OS — Proof Validator");
console.log("  ────────────────────────────");
console.log(`  Platform: ${env.platform}`);

if (!proofDir || !existsSync(proofDir)) {
  console.log("  FAIL  No proof directory found");
  console.log("        Run capture-windows-proof.ps1 on a Windows machine first.");
  console.log("");
  process.exit(1);
}

console.log(`  Proof dir: ${proofDir}`);
console.log("");

let exitCode = 0;

function check(name, pass, detail = "") {
  console.log(`  ${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!pass) exitCode = 1;
}

// 1. Artifact completeness
const missingArtifacts = WINDOWS_PROOF_ARTIFACTS.filter(f => !existsSync(join(proofDir, f)));
check("artifacts-complete", missingArtifacts.length === 0,
  missingArtifacts.length > 0 ? `missing: ${missingArtifacts.join(", ")}` : `${WINDOWS_PROOF_ARTIFACTS.length} present`);

// 2. Summary schema
const summaryPath = join(proofDir, "proof-summary.json");
if (existsSync(summaryPath)) {
  const summary = JSON.parse(readFileSync(summaryPath, "utf-8"));

  check("verdict-pass", summary.verdict === "PASS", `verdict=${summary.verdict}`);

  const schemaResult = validateProofSummary(summary, PROOF_SUMMARY_SCHEMA);
  check("schema-valid", schemaResult.valid,
    schemaResult.valid ? "all fields present" : schemaResult.errors.join("; "));

  // 3. Staleness
  if (summary.timestamp) {
    const staleness = isProofStale(summary.timestamp);
    check("proof-fresh", !staleness.stale,
      staleness.stale ? staleness.reason : `${staleness.ageDays}d old`);
  }

  // 4. Binding
  if (summary.gitCommitSha || summary.appVersion) {
    const target = {};
    if (targetCommit) target.commitSha = targetCommit;
    if (targetVersion) target.version = targetVersion;

    if (Object.keys(target).length > 0) {
      const bindingResult = validateProofBinding(summary, target);
      check("binding-matches", bindingResult.valid,
        bindingResult.valid ? "commit + version match" : bindingResult.errors.join("; "));
    }

    // Display binding info
    console.log("");
    console.log("  ── Proof identity ──");
    if (summary.gitCommitSha) console.log(`  Commit:   ${summary.gitCommitSha.slice(0, 7)}`);
    if (summary.appVersion) console.log(`  Version:  ${summary.appVersion}`);
    if (summary.targetPlatform) console.log(`  Platform: ${summary.targetPlatform}`);
    if (summary.hostName) console.log(`  Host:     ${summary.hostName}`);
    if (summary.hostOS) console.log(`  OS:       ${summary.hostOS}`);
    if (summary.releaseChannel) console.log(`  Channel:  ${summary.releaseChannel}`);
  } else {
    check("binding-present", false, "No binding fields — proof was captured before evidence hardening. Re-capture required.");
  }
} else {
  check("summary-exists", false, "proof-summary.json not found");
}

console.log("");
console.log(`  VERDICT: ${exitCode === 0 ? "VALID" : "INVALID"}`);
console.log("");

process.exit(exitCode);
