// Rollback & Restore Schemas

import type { ActionChange } from "./tuning.js";

export type SnapshotScope = "full_plan" | "module" | "single_action";

export interface RollbackSnapshot {
  id: string;
  createdAt: string;
  scope: SnapshotScope;
  tuningPlanId: string | null;
  actionIds: string[];
  description: string;
  previousValues: ActionChange[]; // the "before" values
  registryExportPaths: string[];
  restorePointId: string | null;  // Windows system restore point ID
  metadata: Record<string, string>;
}

export interface RollbackOperation {
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

export interface ConfigDiff {
  snapshotId: string;
  generatedAt: string;
  changes: ConfigDiffEntry[];
}

export interface ConfigDiffEntry {
  path: string;        // registry path or config identifier
  valueName: string;
  beforeValue: string | number | null;
  afterValue: string | number | null;
  changeType: "added" | "modified" | "removed";
  actionId: string;
  actionName: string;
}

export interface AuditLogEntry {
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

export interface ActionRestoreResult {
  actionId: string;
  status: "restored" | "failed" | "skipped";
  error: string | null;
  changesReverted: number;
  requiresReboot: boolean;
}
