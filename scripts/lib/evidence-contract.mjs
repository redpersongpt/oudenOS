// ─── Evidence Contract ─────────────────────────────────────────────────────
// Machine-checkable truth boundary model for redcore release validation.
//
// Defines exactly what can be proven on each platform, what evidence is
// required, and how to validate proof artifacts against build identity.
//
// This module is consumed by:
//   - scripts/release-gate.mjs  (release blocking)
//   - scripts/validate-proof.mjs (standalone proof validation)
//   - CI workflows (evidence collection)

// ─── Truth Boundary Categories ─────────────────────────────────────────────

/**
 * CROSS_PLATFORM: Provable from any OS (macOS, Linux, Windows).
 * These checks require only source code and Node.js toolchain.
 */
export const CROSS_PLATFORM_CHECKS = [
  { id: "typecheck",       name: "TypeScript typecheck (all workspace projects)",  runner: "pnpm typecheck" },
  { id: "action-parity",   name: "Playbook ↔ wizard structural alignment",        runner: "node scripts/validate-action-parity.mjs --quiet" },
  { id: "schema-parity",   name: "QuestionnaireAnswers ↔ strategyQuestions match", runner: "node scripts/validate-action-parity.mjs --quiet" },
  { id: "no-blockers",     name: "No RELEASE_BLOCKER markers in codebase",         runner: "grep" },
  { id: "download-truth",  name: "No hardcoded download URLs in web surfaces",     runner: "grep" },
];

/**
 * WINDOWS_ONLY: Can ONLY be proven on real Windows.
 * These require the Rust service binary and Windows system APIs.
 */
export const WINDOWS_ONLY_CHECKS = [
  // Build
  { id: "rust-build",         name: "Rust service compiles for x86_64-pc-windows-msvc",   proofArtifact: null,                         source: "CI cargo build" },
  // Smoke
  { id: "service-startup",    name: "Service starts, initializes DB, responds to status",  proofArtifact: "system-status.json",         source: "capture-windows-proof.ps1" },
  { id: "ipc-roundtrip",      name: "JSON-RPC IPC round-trip works",                      proofArtifact: "system-status.json",         source: "capture-windows-proof.ps1" },
  { id: "playbook-resolve",   name: "playbook.resolve returns valid plan",                 proofArtifact: "playbook-resolve.json",      source: "capture-windows-proof.ps1" },
  // Mutation
  { id: "apply-action",       name: "execute.applyAction mutates registry",                proofArtifact: "apply-result.json",          source: "capture-windows-proof.ps1" },
  { id: "verify-readback",    name: "Registry readback confirms mutation",                 proofArtifact: "verify-readback.json",       source: "capture-windows-proof.ps1" },
  // Rollback
  { id: "rollback-snapshot",  name: "Rollback snapshot created before apply",              proofArtifact: "rollback-list.json",         source: "capture-windows-proof.ps1" },
  { id: "rollback-restore",   name: "Rollback restores original values",                   proofArtifact: "verify-after-rollback.json", source: "capture-windows-proof.ps1" },
  // Ledger
  { id: "ledger-state",       name: "DB ledger records execution state",                   proofArtifact: "ledger-query.json",          source: "capture-windows-proof.ps1" },
  // Reboot/resume
  { id: "reboot-survive",     name: "Execution plan survives real Windows reboot",         proofArtifact: "post-journal-state.json",    source: "capture-reboot-proof.ps1" },
  { id: "resume-actions",     name: "journal.resume returns remaining actions post-reboot", proofArtifact: "post-resume-result.json",    source: "capture-reboot-proof.ps1" },
];

/**
 * INFERABLE_NOT_CLAIMABLE: Can be partially inferred from cross-platform
 * checks but cannot be honestly claimed as proven without Windows evidence.
 */
export const INFERABLE_NOT_CLAIMABLE = [
  { id: "wizard-flow",       what: "Wizard step navigation works end-to-end",    inference: "TypeScript compiles, store types align",   truth: "Requires Electron runtime on Windows" },
  { id: "ui-rendering",      what: "UI renders correctly without visual bugs",   inference: "JSX compiles, components export",          truth: "Requires visual inspection or screenshot" },
  { id: "installer-works",   what: "Installer produces working installation",    inference: "CI packages installer, size check passes", truth: "Requires manual install on Windows" },
  { id: "production-db",     what: "API starts against production PostgreSQL",   inference: "Preflight module compiles, schema aligned", truth: "Requires live DB connection" },
];

// ─── Proof Artifact Schema ─────────────────────────────────────────────────

/**
 * Schema for a valid proof-summary.json.
 * Every field is required for the proof to be accepted.
 */
export const PROOF_SUMMARY_SCHEMA = {
  required: [
    "version",        // Service version string
    "timestamp",      // ISO-ish timestamp (YYYY-MM-DD-HHmmss)
    "binary",         // Path to the binary that was tested
    "verdict",        // "PASS" or "FAIL"
    "passed",         // Number of passed checks
    "failed",         // Number of failed checks
    "checks",         // Array of check results
  ],
  // Fields added by evidence hardening (must be present for binding validation)
  binding: [
    "gitCommitSha",   // Full 40-char SHA of the commit tested
    "gitCommitShort", // 7-char short SHA
    "appVersion",     // Package version from package.json
    "buildTimestamp",  // When the binary was built (ISO 8601)
    "targetPlatform", // "x86_64-pc-windows-msvc"
    "releaseChannel", // "dev" | "ci" | "release"
    "hostName",       // Machine hostname where proof was captured
    "hostOS",         // OS version string
  ],
};

export const REBOOT_PROOF_SCHEMA = {
  required: [
    "type",           // Must be "reboot-resume-proof"
    "verdict",        // "PASS" or "FAIL"
    "passed",
    "failed",
    "planId",
    "timestamp",
    "preRebootChecks",
    "postRebootChecks",
  ],
  binding: [
    "gitCommitSha",
    "appVersion",
    "targetPlatform",
    "hostName",
  ],
};

// ─── Staleness Rules ───────────────────────────────────────────────────────

export const PROOF_MAX_AGE_DAYS = 7;

// ─── Required Proof Artifacts ──────────────────────────────────────────────

export const WINDOWS_PROOF_ARTIFACTS = [
  "system-status.json",
  "playbook-resolve.json",
  "apply-result.json",
  "verify-readback.json",
  "rollback-list.json",
  "ledger-query.json",
  "proof-summary.json",
];

export const REBOOT_PROOF_ARTIFACTS = [
  "pre-reboot-summary.json",
  "pre-ledger-state.json",
  "post-journal-state.json",
  "post-resume-result.json",
  "post-ledger-after-resume.json",
  "reboot-proof-summary.json",
];

// ─── Validation Functions ──────────────────────────────────────────────────

/**
 * Validate that a proof summary has all required fields.
 * Returns { valid: boolean, errors: string[] }
 */
export function validateProofSummary(summary, schema = PROOF_SUMMARY_SCHEMA) {
  const errors = [];

  for (const field of schema.required) {
    if (summary[field] === undefined || summary[field] === null) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  for (const field of schema.binding) {
    if (summary[field] === undefined || summary[field] === null) {
      errors.push(`Missing binding field: ${field} (proof cannot be bound to a release)`);
    }
  }

  if (summary.verdict && summary.verdict !== "PASS") {
    errors.push(`Proof verdict is "${summary.verdict}", not "PASS"`);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate that proof artifacts match a target build identity.
 * This prevents using stale or mismatched proof from a different build.
 */
export function validateProofBinding(summary, target) {
  const errors = [];

  if (target.commitSha && summary.gitCommitSha) {
    if (summary.gitCommitSha !== target.commitSha) {
      errors.push(
        `Commit SHA mismatch: proof=${summary.gitCommitSha.slice(0, 7)} target=${target.commitSha.slice(0, 7)}`
      );
    }
  }

  if (target.version && summary.appVersion) {
    if (summary.appVersion !== target.version) {
      errors.push(
        `Version mismatch: proof=${summary.appVersion} target=${target.version}`
      );
    }
  }

  if (target.platform && summary.targetPlatform) {
    if (summary.targetPlatform !== target.platform) {
      errors.push(
        `Platform mismatch: proof=${summary.targetPlatform} target=${target.platform}`
      );
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Check if proof is stale (older than MAX_AGE_DAYS).
 */
export function isProofStale(timestamp, maxAgeDays = PROOF_MAX_AGE_DAYS) {
  const parts = timestamp.match(/(\d{4})-(\d{2})-(\d{2})-(\d{2})(\d{2})(\d{2})/);
  if (!parts) return { stale: true, reason: "Unparseable timestamp" };

  const proofDate = new Date(`${parts[1]}-${parts[2]}-${parts[3]}T${parts[4]}:${parts[5]}:${parts[6]}`);
  const ageDays = (Date.now() - proofDate.getTime()) / (1000 * 60 * 60 * 24);

  return {
    stale: ageDays > maxAgeDays,
    ageDays: Math.round(ageDays * 10) / 10,
    reason: ageDays > maxAgeDays
      ? `Proof is ${Math.round(ageDays)}d old (max ${maxAgeDays}d)`
      : null,
  };
}

/**
 * Detect if current environment is Windows.
 * Used to prevent false-confidence claims from non-Windows runs.
 */
export function isWindowsEnvironment() {
  return process.platform === "win32";
}

/**
 * Get the validation class for the current environment.
 * Returns what CAN and CANNOT be proven from here.
 */
export function getEnvironmentCapabilities() {
  const isWindows = isWindowsEnvironment();
  return {
    platform: process.platform,
    canProveCrossPlatform: true,
    canProveWindowsOnly: isWindows,
    truthStatement: isWindows
      ? "Full validation (cross-platform + Windows runtime)"
      : `Partial validation only (cross-platform checks from ${process.platform}). Windows runtime truth UNPROVEN.`,
  };
}
