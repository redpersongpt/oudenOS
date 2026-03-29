// ─── IPC Contract ────────────────────────────────────────────────────────────
// Source of truth for all communication between UI and Rust service.
// The renderer NEVER talks to the service directly — always through main.
//
// IMPORTANT: ALLOWED_METHODS in preload/index.ts MUST stay in sync with
// the keys of IpcMethods below.

import type { ProfileClassification, MachineProfile } from "./profiles.js";
import type { HardwareAssessment } from "./assessment.js";
import type { TransformPreset, ResolvedPlaybook, RecommendedAppsResult, AppBundleResolveResult, AppInstallResult } from "./playbook.js";
import type { ActionExecutionResult } from "./execution.js";
import type { PersonalizationPreferences } from "./personalization.js";
import type { OsRollbackSnapshot, OsRollbackOperation, OsAuditLogEntry } from "./rollback.js";
import type { OsJournalState } from "./journal.js";
import type { RegistryVerifyResult } from "./verify.js";

// ─── Request / Response pairs ─────────────────────────────────────────────────

export interface IpcMethods {
  // ── Assessment ────────────────────────────────────────────────────────────
  // assess.full is the supported machine scan entrypoint.
  "assess.full": { params: {}; result: HardwareAssessment };

  // ── Classification ────────────────────────────────────────────────────────
  "classify.machine": { params: { assessmentId: string }; result: ProfileClassification };

  // ── Playbook (primary transformation path) ────────────────────────────────
  // playbook.resolve takes the user-confirmed profile + preset and returns
  // a fully resolved plan with per-action status (Included/Blocked/Optional…).
  "playbook.resolve": { params: { profile: MachineProfile; preset: TransformPreset }; result: ResolvedPlaybook };

  // ── App bundle ────────────────────────────────────────────────────────────
  "appbundle.getRecommended": { params: { profile: MachineProfile }; result: RecommendedAppsResult };
  "appbundle.resolve": { params: { profile: MachineProfile; selectedApps: string[] }; result: AppBundleResolveResult };
  "appbundle.install": { params: { appId: string }; result: AppInstallResult };

  // ── Execution ─────────────────────────────────────────────────────────────
  "execute.applyAction": { params: { actionId: string }; result: ActionExecutionResult };

  // ── Personalization ───────────────────────────────────────────────────────
  "personalize.options": { params: { profile?: MachineProfile }; result: Record<string, unknown> };
  "personalize.apply": {
    params: { profile: MachineProfile; options: PersonalizationPreferences & Record<string, unknown> };
    result: Record<string, unknown>;
  };
  "personalize.revert": { params: { snapshotId: string }; result: Record<string, unknown> };

  // ── Rollback ─────────────────────────────────────────────────────────────
  "rollback.list": { params: {}; result: OsRollbackSnapshot[] };
  "rollback.restore": { params: { snapshotId: string }; result: OsRollbackOperation };
  "rollback.audit": { params: { limit: number }; result: OsAuditLogEntry[] };

  // ── Journal (reboot-resume) ───────────────────────────────────────────────
  "journal.state": { params: {}; result: OsJournalState | null };
  "journal.resume": { params: {}; result: { status: string; resumed: number } };
  "journal.cancel": { params: {}; result: { status: string } };

  // ── Verification ──────────────────────────────────────────────────────────
  "verify.registryValue": { params: { hive: string; path: string; valueName: string }; result: RegistryVerifyResult };

  // ── System ────────────────────────────────────────────────────────────────
  "system.status": { params: {}; result: { status: string; uptimeSeconds: number; version: string } };
  "system.reboot": { params: { reason: string }; result: { status: string; reason: string } };
}

// ─── Push events (Rust → main → renderer) ────────────────────────────────────
// Only events that are ACTUALLY emitted belong here.

export interface IpcEvents {
  // Execution progress — emitted per action during execute.applyAction batches
  "execute.progress": { actionId: string; status: string; percent: number; detail: string };

  // Scan progress — emitted during assess.full when hardware scan is running
  // NOTE: Rust emission wiring pending; subscribe in preload when ready.
  "scan.progress": { phase: string; percent: number; detail: string };

  // Journal progress — emitted when a reboot-resume step completes
  "journal.progress": { planId: string; completedActions: number; totalActions: number };

  // Service-level errors not tied to a specific call
  "service.error": { code: string; message: string };
}
