// ─── Reboot-Resume Journal ────────────────────────────────────────────────────
// Survives app closure, system restart, crash, and UAC interruption.
// Stored in SQLite by the Rust service. Read by the UI on launch to
// detect an in-progress transformation and offer to resume.

export type OsJournalStepType =
  | "apply_action"
  | "app_install"
  | "personalization"
  | "verification"
  | "reboot_pending"
  | "rollback_continuation";

export type OsJournalStepStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "failed"
  | "skipped"
  | "awaiting_reboot";

export interface OsJournalPackageIdentity {
  planId: string;
  packageId: string;
  packageRole: "wizard-template" | "user-resolved";
  packageVersion: string | null;
  packageSourceRef: string | null;
  actionProvenanceRef: string | null;
  executionJournalRef: string | null;
  sourceCommit: string | null;
}

export interface OsJournalStep {
  id: string;
  planId: string;
  stepType: OsJournalStepType;
  stepOrder: number;
  status: OsJournalStepStatus;
  actionId: string | null;
  description: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  error: string | null;
  phase: string | null;
  packageId: string | null;
  packageRole: string | null;
  packageSourceRef: string | null;
  provenanceRef: string | null;
  questionKeys: string[];
  selectedValues: string[];
  rollbackSnapshotId: string | null;
  requiresReboot: boolean;
  rebootBoundary: boolean;
  resultStatus: string | null;
}

export interface OsJournalState {
  planId: string;
  currentStepId: string;
  lastCompletedStepId: string | null;
  overallProgress: number;        // 0-100
  requiresReboot: boolean;
  canResume: boolean;
  completedActionIds: string[];
  failedActionIds: string[];
  package: OsJournalPackageIdentity | null;
  currentActionId: string | null;
  currentActionProvenanceRef: string | null;
  currentActionPackageSourceRef: string | null;
  currentActionQuestionKeys: string[];
  currentActionSelectedValues: string[];
  pendingRebootActionIds: string[];
  pendingRebootProvenanceRefs: string[];
  remainingActionProvenanceRefs: string[];
  lastResumeAt: string | null;
  steps: OsJournalStep[];
  // DB-backed ledger fields (present when source is DB)
  totalActions?: number;
  totalCompleted?: number;
  totalFailed?: number;
  totalRemaining?: number;
  status?: string;              // pending | running | paused_reboot | completed | failed | cancelled
  rebootReason?: string | null;
  ledgerEvents?: LedgerEvent[];
}

// ─── Execution Ledger Types (DB-backed) ───────────────────────────────────

export interface LedgerPackageIdentity {
  planId: string;
  packageId: string;
  packageRole: "wizard-template" | "user-resolved";
  packageVersion?: string | null;
  packageSourceRef?: string | null;
  actionProvenanceRef?: string | null;
  executionJournalRef?: string | null;
  sourceCommit?: string | null;
}

export interface LedgerQueuedAction {
  actionId: string;
  actionName: string;
  phase: string;
  queuePosition: number;
  inclusionReason?: string | null;
  blockedReason?: string | null;
  preservedReason?: string | null;
  riskLevel: string;
  expertOnly: boolean;
  requiresReboot: boolean;
  packageSourceRef?: string | null;
  provenanceRef?: string | null;
  questionKeys: string[];
  selectedValues: string[];
}

export interface LedgerActionResult {
  actionId: string;
  status: string;
  rollbackSnapshotId?: string | null;
  errorMessage?: string | null;
  durationMs?: number | null;
}

export interface LedgerRemainingAction {
  actionId: string;
  actionName: string;
  phase: string;
  queuePosition: number;
  packageSourceRef: string | null;
  provenanceRef: string | null;
  questionKeys: string[];
  selectedValues: string[];
  requiresReboot: boolean;
  riskLevel: string;
  expertOnly: boolean;
}

export interface LedgerEvent {
  id: string;
  actionId: string;
  eventType: string;
  status: string;
  detail: string | null;
  packageSourceRef: string | null;
  provenanceRef: string | null;
  rollbackSnapshotId: string | null;
  timestamp: string;
}
