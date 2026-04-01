// Tuning Action & Plan Schemas
// The core contract for the adaptive tuning engine.


export type RiskLevel = "safe" | "low" | "medium" | "high" | "extreme";
export type TuningCategory =
  | "cpu"
  | "gpu"
  | "memory"
  | "storage"
  | "network"
  | "power"
  | "display"
  | "audio"
  | "privacy"
  | "startup"
  | "services"
  | "scheduler"
  | "gaming"
  | "thermal"
  | "drivers"
  | "debloat"
  | "security";

export type ActionStatus =
  | "pending"
  | "previewing"
  | "applying"
  | "applied"
  | "validating"
  | "validated"
  | "failed"
  | "rolled_back"
  | "skipped";

export type PlanPreset =
  | "conservative"
  | "balanced"
  | "aggressive"
  | "competitive_fps"
  | "aaa_smoothness"
  | "low_latency"
  | "creator_workstation"
  | "streaming"
  | "laptop_balanced"
  | "quiet_cool"
  | "benchmark_mode"
  | "clean_lean"
  | "privacy_focused"
  | "custom";

export type TierGate = "free" | "premium";

export interface CompatibilityPredicate {
  minBuild?: number;
  maxBuild?: number;
  editions?: string[];
  cpuVendors?: string[];
  gpuVendors?: string[];
  deviceClasses?: string[];
  requiresFeature?: string; // e.g., "tpm", "secure_boot"
  excludesFeature?: string;
  requiresAdmin?: boolean;
  requiresTrustedInstaller?: boolean;
}

export interface RegistryChange {
  hive: string;
  path: string;
  valueName: string;
  valueType: "REG_DWORD" | "REG_SZ" | "REG_BINARY" | "REG_QWORD" | "REG_MULTI_SZ" | "REG_DELETE";
  newValue: string | number | number[];
  previousValue?: string | number | number[] | null;
}

export interface ServiceChange {
  serviceName: string;
  displayName: string;
  previousStartType: string;
  newStartType: string;
}

export interface PowerChange {
  settingPath: string;
  previousValue: string;
  newValue: string;
}

export interface BcdChange {
  element: string;
  previousValue: string | null;
  newValue: string;
}

export type ActionChange = RegistryChange | ServiceChange | PowerChange | BcdChange;

export interface TuningAction {
  id: string;
  name: string;
  category: TuningCategory;
  description: string;
  rationale: string;
  tier: TierGate;
  risk: RiskLevel;
  compatibility: CompatibilityPredicate;
  dependencies: string[]; // action IDs that must apply first
  conflicts: string[];    // action IDs that cannot coexist
  estimatedImpact: {
    metric: string;       // "input_latency", "fps_1pct_low", "boot_time", etc.
    directionBetter: "lower" | "higher";
    estimatedDelta: string; // "~5-15%", "~2ms"
    confidence: "measured" | "estimated" | "theoretical";
  } | null;
  changes: ActionChange[];
  requiresReboot: boolean;
  sideEffects: string[];
  tags: string[];
  expertOnly: boolean;
  warningMessage: string | null;
}

export interface TuningPlan {
  id: string;
  createdAt: string;
  deviceProfileId: string;
  preset: PlanPreset;
  actions: TuningPlanAction[];
  estimatedTotalRisk: RiskLevel;
  rebootsRequired: number;
  phases: TuningPhase[];
}

export interface TuningPlanAction {
  actionId: string;
  action: TuningAction;
  status: ActionStatus;
  userOverride: "include" | "exclude" | null;
  appliedAt: string | null;
  validatedAt: string | null;
  outcome: ActionOutcome | null;
}

export interface TuningPhase {
  id: string;
  name: string;
  order: number;
  actionIds: string[];
  requiresReboot: boolean;
  requiresBiosVisit: boolean;
  description: string;
}

export interface ActionOutcome {
  actionId: string;
  status: "success" | "partial" | "failed" | "rolled_back";
  appliedAt: string;
  changesApplied: ActionChange[];
  validationPassed: boolean;
  validationDetails: string | null;
  error: string | null;
}
