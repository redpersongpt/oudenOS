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
  steps: OsJournalStep[];
}
