// ─── OS Rollback & Audit Types ────────────────────────────────────────────────

export type OsSnapshotScope = "full_plan" | "stage" | "single_action";

export interface OsRollbackSnapshot {
  id: string;
  createdAt: string;
  scope: OsSnapshotScope;
  planId: string | null;
  actionIds: string[];
  description: string;
  registryExportPaths: string[];
  restorePointId: string | null;    // Windows system restore point ID if created
  metadata: Record<string, string>;
}

export interface OsRollbackOperation {
  id: string;
  snapshotId: string;
  initiatedAt: string;
  completedAt: string | null;
  status: "pending" | "in_progress" | "completed" | "failed" | "partial";
  actionsRolledBack: string[];
  actionsFailed: string[];
  error: string | null;
  requiresReboot: boolean;
}

export interface OsAuditLogEntry {
  id: string;
  timestamp: string;
  category: string;
  action: string;
  detail: string;
  actionId: string | null;
  planId: string | null;
  snapshotId: string | null;
  severity: "info" | "warn" | "error";
}
