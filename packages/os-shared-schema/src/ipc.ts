// ─── IPC Contract ────────────────────────────────────────────────────────────
// Source of truth for all communication between UI and Rust service.
// The renderer NEVER talks to the service directly — always through main.
//
// IMPORTANT: ALLOWED_METHODS in preload/index.ts MUST stay in sync with
// the keys of IpcMethods below.

import type { ProfileClassification, MachineProfile } from "./profiles.js";
import type { OSHealthAssessment } from "./transformation.js";
import type { HardwareAssessment, WorkIndicatorAssessment } from "./assessment.js";
import type { TransformPreset, ResolvedPlaybook, RecommendedApp, AppBundleResolveResult } from "./playbook.js";
import type { ExecutionStartResult, ActionExecutionResult } from "./execution.js";
import type { PersonalizationOptions, PersonalizationPreferences } from "./personalization.js";
import type { OsRollbackSnapshot, OsRollbackOperation, OsAuditLogEntry } from "./rollback.js";
import type { OsJournalState } from "./journal.js";
import type { RegistryVerifyResult } from "./verify.js";

// ─── Request / Response pairs ─────────────────────────────────────────────────

export interface IpcMethods {
  // ── Assessment ────────────────────────────────────────────────────────────
  // assess.full replaces the earlier assess.hardware + assess.workIndicators split.
  "assess.full": { params: {}; result: HardwareAssessment };
  "assess.health": { params: {}; result: OSHealthAssessment };
  "assess.workIndicators": { params: {}; result: WorkIndicatorAssessment };

  // ── Classification ────────────────────────────────────────────────────────
  "classify.machine": { params: { assessmentId: string }; result: ProfileClassification };

  // ── Playbook (primary transformation path) ────────────────────────────────
  // playbook.resolve takes the user-confirmed profile + preset and returns
  // a fully resolved plan with per-action status (Included/Blocked/Optional…).
  "playbook.resolve": { params: { profile: MachineProfile; preset: TransformPreset }; result: ResolvedPlaybook };

  // ── App bundle ────────────────────────────────────────────────────────────
  "appbundle.getRecommended": { params: { profile: MachineProfile }; result: RecommendedApp[] };
  "appbundle.resolve": { params: { appIds: string[] }; result: AppBundleResolveResult };

  // ── Execution ─────────────────────────────────────────────────────────────
  "execute.apply": { params: { planId: string }; result: ExecutionStartResult };
  "execute.applyAction": { params: { actionId: string }; result: ActionExecutionResult };
  "execute.pause": { params: {}; result: void };
  "execute.resume": { params: {}; result: void };

  // ── Personalization ───────────────────────────────────────────────────────
  "personalize.options": { params: {}; result: PersonalizationOptions };
  "personalize.apply": { params: { preferences: PersonalizationPreferences }; result: void };
  "personalize.revert": { params: {}; result: void };

  // ── Rollback ─────────────────────────────────────────────────────────────
  "rollback.list": { params: {}; result: OsRollbackSnapshot[] };
  "rollback.restore": { params: { snapshotId: string }; result: OsRollbackOperation };
  "rollback.audit": { params: { limit: number }; result: OsAuditLogEntry[] };

  // ── Journal (reboot-resume) ───────────────────────────────────────────────
  "journal.state": { params: {}; result: OsJournalState | null };
  "journal.resume": { params: {}; result: void };
  "journal.cancel": { params: {}; result: void };

  // ── Verification ──────────────────────────────────────────────────────────
  "verify.registryValue": { params: { hive: string; path: string; valueName: string }; result: RegistryVerifyResult };

  // ── System ────────────────────────────────────────────────────────────────
  "system.status": { params: {}; result: { version: string; uptime: number; mode: "live" | "demo" } };
  "system.reboot": { params: { reason: string }; result: void };
}

// ─── Push events (Rust → main → renderer) ────────────────────────────────────
// Only events that are ACTUALLY emitted belong here.
// Add to preload ALLOWED_CHANNELS when Rust emission is wired.

export interface IpcEvents {
  // Execution progress — emitted per action during execute.apply
  "execute.progress": { actionId: string; status: string; percent: number; detail: string };

  // Scan progress — emitted during assess.full when hardware scan is running
  // NOTE: Rust emission wiring pending; subscribe in preload when ready.
  "scan.progress": { phase: string; percent: number; detail: string };

  // Journal progress — emitted when a reboot-resume step completes
  "journal.progress": { planId: string; completedActions: number; totalActions: number };

  // Service-level errors not tied to a specific call
  "service.error": { code: string; message: string };
}
