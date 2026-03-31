#!/usr/bin/env node
// ─── Seal Proof Bundle ─────────────────────────────────────────────────────
// Generates proof-manifest.json for a proof directory.
// Called by capture-windows-proof.ps1 AFTER all artifacts are written.
//
// Usage:
//   node scripts/seal-proof-bundle.mjs <proof-dir> [--reboot]
//
// The script reads proof-summary.json for binding info, computes SHA-256
// digests of all bundle members, and writes proof-manifest.json.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  generateManifest,
  BUNDLE_MEMBERS,
  REBOOT_BUNDLE_MEMBERS,
  MANIFEST_FILENAME,
} from "./lib/proof-provenance.mjs";

const proofDir = process.argv[2];
const isReboot = process.argv.includes("--reboot");

if (!proofDir || !existsSync(proofDir)) {
  console.error("Usage: node scripts/seal-proof-bundle.mjs <proof-dir> [--reboot]");
  process.exit(1);
}

const members = isReboot ? REBOOT_BUNDLE_MEMBERS : BUNDLE_MEMBERS;
const summaryFile = isReboot ? "reboot-proof-summary.json" : "proof-summary.json";
const summaryPath = join(proofDir, summaryFile);

let binding = {};
if (existsSync(summaryPath)) {
  try {
    const summary = JSON.parse(readFileSync(summaryPath, "utf-8"));
    binding = {
      gitCommitSha: summary.gitCommitSha,
      appVersion: summary.appVersion,
      targetPlatform: summary.targetPlatform,
      releaseChannel: summary.releaseChannel,
      hostName: summary.hostName,
      hostOS: summary.hostOS,
      timestamp: summary.timestamp,
    };
  } catch { /* binding will be empty */ }
}

const result = generateManifest(proofDir, binding, members);

if (!result.valid) {
  console.error(`  FAIL  ${result.error}`);
  process.exit(1);
}

const manifestPath = join(proofDir, MANIFEST_FILENAME);
writeFileSync(manifestPath, JSON.stringify(result.manifest, null, 2));

console.log(`  [sealed] ${MANIFEST_FILENAME}`);
console.log(`  bundle digest: ${result.manifest.bundleDigest}`);
console.log(`  artifacts: ${result.manifest.artifacts.length}`);
console.log(`  provenance: ${result.manifest.provenance.source}`);
if (result.manifest.provenance.ciRunId) {
  console.log(`  CI run: ${result.manifest.provenance.ciRunUrl}`);
}
