// Reboot-Resume Journal
// Survives app closure, system restart, crash, UAC interruption.
// Stored in SQLite by the Rust service, read by the UI on launch.

export type JournalStepType =
  | "apply_action"
  | "reboot_pending"
  | "bios_verification"
  | "benchmark_pre"
  | "benchmark_post"
  | "rollback_continuation"
  | "validation";

export type JournalStepStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "failed"
  | "awaiting_reboot"
  | "awaiting_bios_return"
  | "skipped";

export interface JournalEntry {
  id: string;
  planId: string;
  phaseId: string;
  stepType: JournalStepType;
  stepOrder: number;
  status: JournalStepStatus;
  actionId: string | null;
  description: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  error: string | null;
  metadata: Record<string, string>;
}

export interface JournalState {
  planId: string;
  currentPhaseId: string;
  currentStepId: string;
  lastCompletedStepId: string | null;
  nextStepId: string | null;
  overallProgress: number; // 0-100
  requiresReboot: boolean;
  requiresBiosReturn: boolean;
  canResume: boolean;
  entries: JournalEntry[];
}
