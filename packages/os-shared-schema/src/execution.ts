// ─── Execution Result Types ───────────────────────────────────────────────────
// Returned by execute.apply and execute.applyAction.

export type ActionExecutionStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "skipped"
  | "preserved";    // blocked by a preservation flag, intentionally not applied

export interface ActionExecutionResult {
  actionId: string;
  status: ActionExecutionStatus;
  completedAt: string;             // ISO 8601
  changesApplied: number;
  error: string | null;
  requiresReboot: boolean;
}

export interface ExecutionStartResult {
  planId: string;
  startedAt: string;
  totalActions: number;
  estimatedMinutes: number;
}

export interface ExecutionSummary {
  planId: string;
  startedAt: string;
  completedAt: string;
  applied: number;
  failed: number;
  skipped: number;
  preserved: number;
  requiresReboot: boolean;
  rollbackSnapshotId: string | null;
  results: ActionExecutionResult[];
}
