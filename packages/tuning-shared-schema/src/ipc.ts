// ─── IPC Contract ───────────────────────────────────────────────────────────
// Typed JSON-RPC messages between Electron main process and Rust service.
// The renderer NEVER talks to the service directly — always through main.

import type { DeviceProfile, CpuPowerConfig, SchedulerConfig, ServiceStateMap, FilesystemConfig, MemMgmtConfig } from "./device.js";
import type { TuningPlan, TuningAction, ActionOutcome, PlanPreset } from "./tuning.js";
import type { BenchmarkConfig, BenchmarkResult, BenchmarkComparison, BottleneckAnalysis } from "./benchmark.js";
import type { RollbackSnapshot, RollbackOperation, AuditLogEntry, ConfigDiff, ActionRestoreResult } from "./rollback.js";
import type { JournalState } from "./journal.js";
import type { LicenseState } from "./license.js";
import type { MachineClassification, IntelligentTuningProfile, IntelligentRecommendation, MachineArchetype } from "./device-intelligence.js";

// ─── IPC Error types ─────────────────────────────────────────────────────────

export interface IpcError {
  code: string;                  // Machine-readable error code, e.g. "SCAN_FAILED"
  message: string;               // Human-readable message for logging
  detail?: string;               // Additional context or stack trace excerpt
}

// Generic IPC response wrapper for explicit ok/err branching.
export type IpcResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: IpcError };

// ─── Request/Response pairs ─────────────────────────────────────────────────

export interface IpcMethods {
  // System scan
  "scan.hardware": { params: {}; result: DeviceProfile };
  "scan.quick": { params: {}; result: DeviceProfile };
  "scan.cpuPower": { params: {}; result: CpuPowerConfig };
  "scan.scheduler": { params: {}; result: SchedulerConfig };
  "scan.serviceStates": { params: {}; result: ServiceStateMap };
  "scan.filesystem": { params: {}; result: FilesystemConfig };
  "scan.memMgmt": { params: {}; result: MemMgmtConfig };

  // Tuning engine
  "tuning.generatePlan": { params: { deviceProfileId: string; preset: PlanPreset }; result: TuningPlan };
  "tuning.getActions": { params: { category?: string }; result: TuningAction[] };
  "tuning.previewAction": { params: { actionId: string }; result: TuningAction };
  "tuning.applyPlan": { params: { planId: string }; result: void };
  "tuning.applyAction": { params: { actionId: string }; result: ActionOutcome };
  "tuning.skipAction": { params: { actionId: string }; result: void };

  // Benchmark
  "benchmark.run": { params: { config: BenchmarkConfig; tags: string[] }; result: BenchmarkResult };
  "benchmark.list": { params: { deviceProfileId?: string }; result: BenchmarkResult[] };
  "benchmark.compare": { params: { baselineId: string; comparisonId: string }; result: BenchmarkComparison };
  "benchmark.analyzeBottlenecks": { params: { deviceProfileId: string }; result: BottleneckAnalysis };

  // Rollback
  "rollback.listSnapshots": { params: {}; result: RollbackSnapshot[] };
  "rollback.createSnapshot": { params: { description: string }; result: RollbackSnapshot };
  "rollback.restore": { params: { snapshotId: string }; result: RollbackOperation };
  "rollback.getDiff": { params: { snapshotId: string }; result: ConfigDiff };
  "rollback.getAuditLog": { params: { limit: number; offset: number }; result: AuditLogEntry[] };
  "rollback.restoreActions": { params: { actionIds: string[] }; result: ActionRestoreResult[] };

  // Journal (reboot-resume)
  "journal.getState": { params: {}; result: JournalState | null };
  "journal.resume": { params: {}; result: void };
  "journal.cancel": { params: {}; result: void };

  // License
  "license.getState": { params: {}; result: LicenseState };
  "license.activate": { params: { token: string }; result: LicenseState };
  "license.deactivate": { params: {}; result: void };
  "license.refresh": { params: {}; result: LicenseState };

  // App hub
  "apphub.getCatalog": { params: {}; result: AppCatalogEntry[] };
  "apphub.install": { params: { appId: string }; result: AppInstallResult };
  "apphub.checkUpdates": { params: {}; result: AppUpdateCheck[] };

  // System
  "system.requestReboot": { params: { reason: string }; result: void };
  "system.getServiceStatus": { params: {}; result: ServiceStatus };

  // Machine Intelligence
  "intelligence.classify": { params: { deviceProfileId: string }; result: MachineClassification };
  "intelligence.getProfile": { params: { deviceProfileId: string }; result: IntelligentTuningProfile };
  "intelligence.getRecommendations": { params: { deviceProfileId: string; archetype?: MachineArchetype }; result: IntelligentRecommendation[] };
}

// ─── Events (push-based) ─────────────────────────────────────────────────────
// Events ACTUALLY emitted today — add to preload ALLOWED_EVENTS to subscribe.

export interface IpcEvents {
  "license.changed": { state: LicenseState };
  "service.error": { code: string; message: string };

  // Scan progress — emitted during scan.hardware / scan.quick
  // NOTE: Rust emission wiring pending. Add to preload ALLOWED_EVENTS when ready.
  "scan.progress": { phase: string; percent: number; detail: string };

  // Tuning execution progress — emitted per-action during tuning.applyPlan
  // NOTE: Rust emission wiring pending. Add to preload ALLOWED_EVENTS when ready.
  "tuning.actionProgress": { actionId: string; status: string; detail: string };
  "tuning.phaseComplete": { phaseId: string; nextPhaseId: string | null };

  // Benchmark progress — emitted during benchmark.run
  // NOTE: Rust emission wiring pending. Add to preload ALLOWED_EVENTS when ready.
  "benchmark.progress": { percent: number; currentMetric: string };
  "benchmark.complete": { resultId: string };

  // Rollback progress — emitted during rollback.restore
  // NOTE: Rust emission wiring pending. Add to preload ALLOWED_EVENTS when ready.
  "rollback.progress": { percent: number; currentAction: string };

  // Journal updates — emitted when a reboot-resume step completes
  // NOTE: Rust emission wiring pending. Add to preload ALLOWED_EVENTS when ready.
  "journal.updated": { state: JournalState };

  // Thermal monitoring — emitted periodically during benchmarks
  // NOTE: Rust emission wiring pending. Add to preload ALLOWED_EVENTS when ready.
  "thermal.update": { cpuTempC: number | null; gpuTempC: number | null; throttling: boolean };
}

// ─── Supporting types ───────────────────────────────────────────────────────
// AppCatalogEntry is the lighter IPC-level type returned by apphub.getCatalog.
// It differs from AppCatalogItem in app-catalog.ts which is the rich local type
// used by the download center. Both are intentionally separate.

export interface AppCatalogEntry {
  id: string;
  name: string;
  category: string;
  description: string;
  version: string;
  downloadUrl: string;
  checksum: string;
  checksumAlgo: "sha256";
  silentInstallArgs: string | null;
  trusted: boolean;
  iconUrl: string | null;
}

export interface AppInstallResult {
  appId: string;
  success: boolean;
  installedVersion: string | null;
  error: string | null;
}

export interface AppUpdateCheck {
  appId: string;
  currentVersion: string;
  latestVersion: string;
  updateAvailable: boolean;
}

export interface ServiceStatus {
  version: string;
  uptime: number;
  dbPath: string;
  logLevel: string;
  licenseTier: string;
}
