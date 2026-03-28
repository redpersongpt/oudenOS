// ─── Machine Intelligence Types ─────────────────────────────────────────────
// Device classification, confidence scoring, and intelligent recommendations.
// The classification engine understands the machine and generates the right
// tuning strategy for that exact hardware and usage profile.

import type { PlanPreset } from "./tuning.js";

// ─── Machine Archetypes ─────────────────────────────────────────────────────

export type MachineArchetype =
  | "gaming_desktop"
  | "budget_desktop"
  | "highend_workstation"
  | "office_laptop"
  | "gaming_laptop"
  | "low_spec_system"
  | "vm_cautious";

export const ARCHETYPE_META: Record<MachineArchetype, {
  label: string;
  tagline: string;
  icon: string;
  accentColor: string;
  suggestedPreset: PlanPreset;
}> = {
  gaming_desktop: {
    label: "Gaming Desktop",
    tagline: "High-performance stationary system built for competitive and immersive gaming",
    icon: "gamepad",
    accentColor: "red",
    suggestedPreset: "aggressive",
  },
  budget_desktop: {
    label: "Budget Desktop",
    tagline: "Efficient stationary system focused on responsiveness and resource conservation",
    icon: "monitor",
    accentColor: "blue",
    suggestedPreset: "balanced",
  },
  highend_workstation: {
    label: "High-end Workstation",
    tagline: "Precision-grade system optimized for sustained multi-threaded throughput and stability",
    icon: "server",
    accentColor: "amber",
    suggestedPreset: "balanced",
  },
  office_laptop: {
    label: "Office Laptop",
    tagline: "Mobile system optimized for reliability, battery life, and quiet operation",
    icon: "briefcase",
    accentColor: "sky",
    suggestedPreset: "conservative",
  },
  gaming_laptop: {
    label: "Gaming Laptop",
    tagline: "Thermally constrained high-performance mobile system",
    icon: "gamepad-battery",
    accentColor: "orange",
    suggestedPreset: "balanced",
  },
  low_spec_system: {
    label: "Low-spec System",
    tagline: "Resource-constrained system prioritizing cleanup, startup reduction, and memory relief",
    icon: "gauge",
    accentColor: "yellow",
    suggestedPreset: "conservative",
  },
  vm_cautious: {
    label: "Virtual Machine",
    tagline: "Virtualized environment with limited hardware access and cautious tuning posture",
    icon: "shield",
    accentColor: "green",
    suggestedPreset: "conservative",
  },
};

// ─── Classification Result ──────────────────────────────────────────────────

export interface ClassificationSignal {
  factor: string;
  value: string;
  weight: number;
  favoredArchetype: MachineArchetype;
}

export interface MachineClassification {
  primary: MachineArchetype;
  confidence: number;
  scores: Record<MachineArchetype, number>;
  signals: ClassificationSignal[];
  classifiedAt: string;
  deviceProfileId: string;
}

// ─── Recommendation Confidence ──────────────────────────────────────────────

export type RecommendationConfidence =
  | "high"
  | "medium"
  | "caution"
  | "analyze_only";

export interface IntelligentRecommendation {
  actionId: string;
  actionName: string;
  category: string;
  relevance: number;
  confidence: RecommendationConfidence;
  reason: string;
  archetypeSpecific: boolean;
  priorityOrder: number;
  tier: string;
  risk: string;
}

// ─── Full Tuning Profile ────────────────────────────────────────────────────

export interface IntelligentTuningProfile {
  classification: MachineClassification;
  recommendations: IntelligentRecommendation[];
  suggestedPreset: PlanPreset;
  warnings: string[];
  quickWins: IntelligentRecommendation[];
  archetypeMeta: typeof ARCHETYPE_META[MachineArchetype];
}
