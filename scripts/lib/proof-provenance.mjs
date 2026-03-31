// ─── Proof Provenance ──────────────────────────────────────────────────────
// Hash-chain provenance for Windows proof artifacts.
//
// DESIGN:
//   Each proof artifact is individually hashed (SHA-256).
//   A proof-manifest.json is generated containing:
//     - ordered list of artifact filenames + their SHA-256 digests
//     - build binding (commit, version, platform)
//     - capture environment metadata
//     - a bundle digest: SHA-256 of the concatenated artifact digests
//
//   The bundle digest is the single value that represents the entire proof run.
//   It is deterministic: same artifacts → same digest, any tampering → different digest.
//
// PROVENANCE CHAIN:
//   1. capture-windows-proof.ps1 generates artifacts + proof-manifest.json
//   2. CI logs the bundle digest as a workflow output (immutable in GitHub Actions)
//   3. release-gate.mjs re-computes digests from files and compares to manifest
//   4. If CI-anchored, the CI bundle digest is compared to the re-computed one
//
// ATTACK MITIGATIONS:
//   - Forged JSON: digest mismatch (attacker must forge all files + manifest consistently)
//   - Copied old proof: commit SHA binding mismatch
//   - Tampered after capture: digest mismatch
//   - Partial replay: missing artifact or digest mismatch
//   - Cross-machine copy: hostName + CI run ID mismatch
//   - Non-CI proof in release: provenanceSource !== "ci" warning
//
// WHAT THIS DOES NOT DO:
//   - Cryptographic signing (would require key management infrastructure)
//   - Remote attestation (would require trusted execution environment)
//   These are acknowledged residual risks documented below.

import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

// ─── Constants ─────────────────────────────────────────────────────────────

export const MANIFEST_FILENAME = "proof-manifest.json";
export const DIGEST_ALGORITHM = "sha256";

// Artifacts that MUST be present and hashed in a valid Windows proof bundle
export const BUNDLE_MEMBERS = [
  "system-status.json",
  "playbook-resolve.json",
  "apply-result.json",
  "verify-readback.json",
  "rollback-list.json",
  "ledger-query.json",
  "proof-summary.json",
];

export const REBOOT_BUNDLE_MEMBERS = [
  "pre-reboot-summary.json",
  "pre-create-plan.json",
  "pre-ledger-state.json",
  "post-journal-state.json",
  "post-resume-result.json",
  "post-ledger-after-resume.json",
  "reboot-proof-summary.json",
];

// ─── Hashing ───────────────────────────────────────────────────────────────

/**
 * SHA-256 hash of a buffer or string, returned as hex.
 */
export function sha256(data) {
  return createHash(DIGEST_ALGORITHM).update(data).digest("hex");
}

/**
 * Compute SHA-256 of a file on disk.
 */
export function hashFile(filePath) {
  const content = readFileSync(filePath);
  return sha256(content);
}

// ─── Bundle Digest ─────────────────────────────────────────────────────────

/**
 * Compute the bundle digest from a directory of proof artifacts.
 * The digest is SHA-256(digest1 + ":" + digest2 + ":" + ... + ":" + digestN)
 * where digests are in the canonical BUNDLE_MEMBERS order.
 *
 * Returns { digests: Record<string, string>, bundleDigest: string, missing: string[] }
 */
export function computeBundleDigest(proofDir, members = BUNDLE_MEMBERS) {
  const digests = {};
  const missing = [];

  for (const filename of members) {
    const filePath = join(proofDir, filename);
    if (existsSync(filePath)) {
      digests[filename] = hashFile(filePath);
    } else {
      missing.push(filename);
    }
  }

  if (missing.length > 0) {
    return { digests, bundleDigest: null, missing };
  }

  // Canonical digest: hash of ordered digest string
  const digestChain = members.map((f) => digests[f]).join(":");
  const bundleDigest = sha256(digestChain);

  return { digests, bundleDigest, missing };
}

// ─── Manifest Generation ───────────────────────────────────────────────────

/**
 * Generate a proof-manifest.json for a proof directory.
 * Called by the capture scripts after all artifacts are written.
 */
export function generateManifest(proofDir, binding, members = BUNDLE_MEMBERS) {
  const { digests, bundleDigest, missing } = computeBundleDigest(proofDir, members);

  if (missing.length > 0) {
    return {
      valid: false,
      error: `Cannot generate manifest: missing artifacts: ${missing.join(", ")}`,
    };
  }

  const manifest = {
    // Schema
    schemaVersion: 1,
    type: "windows-proof-manifest",
    generatedAt: new Date().toISOString(),
    generator: "scripts/lib/proof-provenance.mjs",

    // Bundle
    digestAlgorithm: DIGEST_ALGORITHM,
    bundleDigest,
    artifacts: members.map((filename) => ({
      filename,
      [DIGEST_ALGORITHM]: digests[filename],
    })),

    // Binding (from proof-summary.json)
    binding: {
      gitCommitSha: binding.gitCommitSha ?? null,
      appVersion: binding.appVersion ?? null,
      targetPlatform: binding.targetPlatform ?? null,
      releaseChannel: binding.releaseChannel ?? null,
      hostName: binding.hostName ?? null,
      hostOS: binding.hostOS ?? null,
      timestamp: binding.timestamp ?? null,
    },

    // Provenance
    provenance: {
      source: binding.provenanceSource ?? (process.env.CI ? "ci" : "local"),
      ciRunId: process.env.GITHUB_RUN_ID ?? null,
      ciRunUrl: process.env.GITHUB_RUN_ID
        ? `https://github.com/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
        : null,
      ciWorkflow: process.env.GITHUB_WORKFLOW ?? null,
      ciActor: process.env.GITHUB_ACTOR ?? null,
    },
  };

  return { valid: true, manifest };
}

// ─── Manifest Verification ─────────────────────────────────────────────────

/**
 * Verify a proof-manifest.json against the actual files on disk.
 * Re-computes all digests and compares to the recorded values.
 *
 * Returns { valid: boolean, errors: string[], warnings: string[] }
 */
export function verifyManifest(proofDir) {
  const errors = [];
  const warnings = [];

  const manifestPath = join(proofDir, MANIFEST_FILENAME);
  if (!existsSync(manifestPath)) {
    return {
      valid: false,
      errors: ["proof-manifest.json not found — proof bundle has no provenance"],
      warnings: [],
    };
  }

  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
  } catch (e) {
    return {
      valid: false,
      errors: [`proof-manifest.json is not valid JSON: ${e.message}`],
      warnings: [],
    };
  }

  // Schema version check
  if (manifest.schemaVersion !== 1) {
    errors.push(`Unknown manifest schema version: ${manifest.schemaVersion}`);
  }

  // Bundle digest check
  if (!manifest.bundleDigest) {
    errors.push("Manifest has no bundleDigest");
    return { valid: false, errors, warnings };
  }

  if (!Array.isArray(manifest.artifacts) || manifest.artifacts.length === 0) {
    errors.push("Manifest has no artifacts array");
    return { valid: false, errors, warnings };
  }

  // Re-compute digests from disk and compare
  const members = manifest.artifacts.map((a) => a.filename);
  const { digests: recomputed, bundleDigest: recomputedBundle, missing } =
    computeBundleDigest(proofDir, members);

  for (const filename of missing) {
    errors.push(`Artifact missing from disk: ${filename}`);
  }

  // Per-file digest comparison
  for (const entry of manifest.artifacts) {
    const recorded = entry[DIGEST_ALGORITHM];
    const actual = recomputed[entry.filename];
    if (!recorded) {
      errors.push(`No digest recorded for ${entry.filename}`);
    } else if (actual && recorded !== actual) {
      errors.push(
        `TAMPER DETECTED: ${entry.filename} digest mismatch\n` +
        `    recorded: ${recorded.slice(0, 16)}...\n` +
        `    actual:   ${actual.slice(0, 16)}...`
      );
    }
  }

  // Bundle digest comparison
  if (recomputedBundle && manifest.bundleDigest !== recomputedBundle) {
    errors.push(
      `TAMPER DETECTED: bundle digest mismatch\n` +
      `    recorded: ${manifest.bundleDigest.slice(0, 16)}...\n` +
      `    actual:   ${recomputedBundle.slice(0, 16)}...`
    );
  }

  // Provenance warnings (not hard failures, but flagged)
  if (manifest.provenance?.source === "local") {
    warnings.push("Proof was captured locally (not CI) — lower provenance assurance");
  }
  if (!manifest.provenance?.ciRunId) {
    warnings.push("No CI run ID — proof cannot be traced to a specific pipeline execution");
  }

  // Binding completeness
  if (!manifest.binding?.gitCommitSha) {
    errors.push("Manifest binding missing gitCommitSha");
  }
  if (!manifest.binding?.appVersion) {
    errors.push("Manifest binding missing appVersion");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    bundleDigest: recomputedBundle,
    manifest,
  };
}

/**
 * Verify that the manifest binding matches a target build identity.
 */
export function verifyManifestBinding(manifest, target) {
  const errors = [];

  if (target.commitSha && manifest.binding?.gitCommitSha) {
    if (manifest.binding.gitCommitSha !== target.commitSha) {
      errors.push(
        `Commit mismatch: proof=${manifest.binding.gitCommitSha.slice(0, 7)} ` +
        `target=${target.commitSha.slice(0, 7)}`
      );
    }
  }

  if (target.version && manifest.binding?.appVersion) {
    if (manifest.binding.appVersion !== target.version) {
      errors.push(
        `Version mismatch: proof=${manifest.binding.appVersion} target=${target.version}`
      );
    }
  }

  return { valid: errors.length === 0, errors };
}
