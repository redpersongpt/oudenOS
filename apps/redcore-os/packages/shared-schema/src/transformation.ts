// ─── OS Transformation Types ─────────────────────────────────────────────────

import type { MachineProfile, PreservationFlag } from "./profiles.js";

export type TransformCategory =
  | "cleanup"         // AppX removal, temp files, junk
  | "startup"         // Startup apps, autorun entries
  | "services"        // Windows services
  | "tasks"           // Scheduled tasks
  | "privacy"         // Telemetry, data collection
  | "performance"     // CPU, power, scheduler, timer
  | "infrastructure"  // Memory, storage, network, display, audio
  | "features"        // Optional Windows features
  | "shell"           // Context menu, default apps, explorer
  | "apps"            // App replacement / recommended installs
  | "advanced"        // Expert-only deep changes
  | "preservation";   // Work PC safety checks

export type TransformRisk = "safe" | "low" | "medium" | "high" | "extreme";

export interface TransformAction {
  id: string;
  name: string;
  category: TransformCategory;
  description: string;
  rationale: string;
  risk: TransformRisk;
  tier: "free" | "premium";
  requiresReboot: boolean;
  reversible: boolean;
  estimatedSeconds: number;

  // Profile compatibility
  allowedProfiles: MachineProfile[] | "all";
  blockedProfiles: MachineProfile[];
  preservationConflicts: PreservationFlag[];  // Work PC: if these flags are active, block this action

  // What it does
  registryChanges: RegistryChange[];
  serviceChanges: ServiceChange[];
  taskChanges: TaskChange[];
  appxRemovals: string[];         // AppX package names to remove
  featureChanges: FeatureChange[];
  powerShellCommands: string[];   // Audited PS commands (never user-input-derived)

  // Atlas-derived improvements
  isDefault: boolean;              // true = applied in default Atlas-style configuration
  expertOnly: boolean;             // true = only shown in expert mode, never in default plans
  atlasEquivalent: string | null;  // matching Atlas playbook path for transparency

  // UI
  tags: string[];
  sideEffects: string[];
  warningMessage: string | null;
}

export interface RegistryChange {
  hive: string;
  path: string;
  valueName: string;
  valueType: string;
  newValue: string | number;
}

export interface ServiceChange {
  serviceName: string;
  newStartType: "Disabled" | "Manual" | "Automatic";
}

export interface TaskChange {
  taskPath: string;        // e.g., "\\Microsoft\\Windows\\UpdateOrchestrator\\Schedule Scan"
  action: "disable" | "enable" | "delete";
}

export interface FeatureChange {
  featureName: string;     // e.g., "WindowsMediaPlayer"
  action: "enable" | "disable";
}

// ─── Transformation Plan ────────────────────────────────────────────────────

export interface TransformPlan {
  id: string;
  profile: MachineProfile;
  preset: "conservative" | "balanced" | "aggressive" | "custom";
  stages: TransformStage[];
  totalActions: number;
  rebootRequired: boolean;
  estimatedMinutes: number;
  preservedServices: PreservationFlag[];
}

export interface TransformStage {
  id: string;
  name: string;
  category: TransformCategory;
  actions: TransformAction[];
  order: number;
}

// ─── OS Health Assessment ───────────────────────────────────────────────────

export interface OSHealthAssessment {
  startupLoad: { count: number; heavyItems: string[]; estimatedDelayMs: number };
  serviceOverhead: { runningCount: number; disableableCount: number; memoryMb: number };
  scheduledTasks: { activeCount: number; disableableCount: number };
  appxPackages: { installedCount: number; removableCount: number; bloatwareCount: number };
  tempFiles: { sizeMb: number; locations: string[] };
  privacyExposure: { telemetryLevel: string; advertisingId: boolean; activityHistory: boolean };
  windowsFeatures: { enabledCount: number; unusedCount: number };
  overallScore: number;  // 0-100, higher = healthier
  recommendations: string[];
}
