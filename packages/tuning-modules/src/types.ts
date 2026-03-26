import type { TuningCategory, RiskLevel, TierGate, CompatibilityPredicate } from "@redcore/shared-schema/tuning";

export interface RegistryChangeDefinition {
  hive: string;
  path: string;
  valueName: string;
  valueType: "REG_DWORD" | "REG_SZ" | "REG_BINARY" | "REG_QWORD" | "REG_MULTI_SZ" | "REG_DELETE";
  newValue: string | number | number[];
}

export interface TuningActionDefinition {
  id: string;
  name: string;
  category: TuningCategory;
  description: string;
  rationale: string;
  tier: TierGate;
  risk: RiskLevel;
  compatibility: CompatibilityPredicate;
  dependencies: string[];
  conflicts: string[];
  estimatedImpact: {
    metric: string;
    directionBetter: "lower" | "higher";
    estimatedDelta: string;
    confidence: "measured" | "estimated" | "theoretical";
  } | null;
  registryChanges: RegistryChangeDefinition[];
  serviceChanges: Array<{ serviceName: string; newStartType: string }>;
  powerChanges: Array<{ settingPath: string; newValue: string }>;
  bcdChanges: Array<{ element: string; newValue: string }>;
  requiresReboot: boolean;
  sideEffects: string[];
  tags: string[];
}
