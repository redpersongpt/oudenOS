// ─── System Analyzer Types ───────────────────────────────────────────────────
// Core type definitions for the multi-step analysis and recommendation pipeline.

// ─── Hardware Analysis ───────────────────────────────────────────────────────

export type HardwareTier = "entry" | "mid" | "high" | "flagship";

export interface CpuAnalysis {
  brand: string;
  cores: number;
  threads: number;
  baseClockGhz: number;
  boostClockGhz: number | null;
  tier: HardwareTier;
  hyperthreadingEnabled: boolean;
  score: number; // 0-100
  notes: string[];
}

export interface GpuAnalysis {
  name: string;
  vendor: "nvidia" | "amd" | "intel" | "unknown";
  vramGb: number;
  tier: HardwareTier;
  hasDiscreteGpu: boolean;
  resizableBar: boolean;
  driverOutdated: boolean;
  score: number; // 0-100
  notes: string[];
}

export interface RamAnalysis {
  totalGb: number;
  speedMhz: number;
  channels: number;
  type: string;
  xmpEnabled: boolean;
  isAdequate: boolean;
  isDualChannel: boolean;
  score: number; // 0-100
  notes: string[];
}

export interface StorageAnalysis {
  systemDrive: {
    type: "nvme" | "sata" | "hdd" | "unknown";
    capacityGb: number;
    freeGb: number;
    freePercent: number;
    healthPercent: number | null;
    isLowFreeSpace: boolean;
    trimEnabled: boolean;
  };
  driveCount: number;
  score: number; // 0-100
  notes: string[];
}

export interface HardwareAnalysis {
  cpu: CpuAnalysis;
  gpu: GpuAnalysis;
  ram: RamAnalysis;
  storage: StorageAnalysis;
  hasBattery: boolean;
  deviceClass: string;
  overallScore: number; // 0-100
  summaryNotes: string[];
}

// ─── Software Analysis ───────────────────────────────────────────────────────

export interface WindowsAnalysis {
  version: string;
  build: number;
  edition: string;
  displayVersion: string;
  isWindows11: boolean;
  isSupportedBuild: boolean;
  isLTSC: boolean;
  hyperVEnabled: boolean;
  wslEnabled: boolean;
}

export interface SoftwareAnalysis {
  windows: WindowsAnalysis;
  runningServicesCount: number | null;
  startupItemsCount: number | null;
  hasHyperV: boolean;
  hasDomainJoin: boolean;
  powerPlan: string;
  coreParkingEnabled: boolean | null;
  timerResolutionMs: number | null;
  win32PrioritySeparation: number | null;
  notes: string[];
}

// ─── Workload Analysis ───────────────────────────────────────────────────────

export type WorkloadType = "gaming" | "work" | "development" | "content_creation" | "general";

export interface WorkloadSignal {
  type: WorkloadType;
  indicator: string;
  strength: "strong" | "medium" | "weak";
}

export interface WorkloadAnalysis {
  primary: WorkloadType;
  secondary: WorkloadType | null;
  confidence: number; // 0-1
  signals: WorkloadSignal[];
  isEnterprise: boolean;
  isGamer: boolean;
  isDeveloper: boolean;
  installedApps?: string[]; // optional — passed in if available
}

// ─── Thermal Analysis ────────────────────────────────────────────────────────

export type ThermalRating = "cool" | "warm" | "hot" | "critical" | "unknown";

export interface ThermalAnalysis {
  cpuTempC: number | null;
  gpuTempC: number | null;
  cpuRating: ThermalRating;
  gpuRating: ThermalRating;
  cpuThrottling: boolean;
  gpuThrottling: boolean;
  isThrottling: boolean;
  fanRpm: number | null;
  thermalRisk: "none" | "low" | "medium" | "high";
  notes: string[];
}

// ─── Network Analysis ────────────────────────────────────────────────────────

export type ConnectionQuality = "excellent" | "good" | "fair" | "poor" | "unknown";

export interface NetworkAnalysis {
  primaryAdapterType: "ethernet" | "wifi" | "unknown";
  primaryAdapterName: string;
  speedDescription: string | null;
  isWifi: boolean;
  rssQueues: number | null;
  connectionQuality: ConnectionQuality;
  hasMultipleAdapters: boolean;
  notes: string[];
}

// ─── Security Analysis ───────────────────────────────────────────────────────

export type SecurityPosture = "hardened" | "standard" | "minimal" | "exposed";

export interface SecurityAnalysis {
  secureBoot: boolean;
  tpmPresent: boolean;
  bitlockerEnabled: boolean;
  vbsEnabled: boolean;
  hvciEnabled: boolean;
  memoryIntegrityEnabled: boolean;
  virtualizationEnabled: boolean;
  posture: SecurityPosture;
  // Performance impact flags
  vbsPerformanceImpact: boolean;
  hvciPerformanceImpact: boolean;
  score: number; // 0-100
  notes: string[];
}

// ─── Aggregate System Analysis ───────────────────────────────────────────────

export interface SystemAnalysisResult {
  hardware: HardwareAnalysis;
  software: SoftwareAnalysis;
  workload: WorkloadAnalysis;
  thermal: ThermalAnalysis;
  network: NetworkAnalysis;
  security: SecurityAnalysis;
  analyzedAt: string;
}

// ─── Profile Classification ──────────────────────────────────────────────────

export type SystemProfile =
  | "gaming"
  | "work"
  | "budget"
  | "highend"
  | "laptop"
  | "vm";

export interface ProfileClassification {
  primary: SystemProfile;
  confidence: number; // 0-1
  scores: Record<SystemProfile, number>;
  signals: string[];
}

// ─── Recommendation Types ─────────────────────────────────────────────────────

export type RiskLevel = "safe" | "low" | "medium" | "high";

export type OptimizationCategory =
  | "cpu"
  | "gpu"
  | "memory"
  | "storage"
  | "network"
  | "security"
  | "startup"
  | "services"
  | "power"
  | "scheduler";

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  category: OptimizationCategory;
  priority: number; // 1-10, higher = more important
  confidence: number; // 0-1
  riskLevel: RiskLevel;
  impactEstimate: number; // estimated % improvement
  profiles: SystemProfile[]; // which profiles benefit most
  rationale: string;
  safeToApply: boolean;
  requiresReboot: boolean;
  isEnabled: boolean; // user can toggle
  tags: string[];
}

// ─── Risk Assessment ─────────────────────────────────────────────────────────

export interface RiskFactor {
  factor: string;
  severity: RiskLevel;
  detail: string;
}

export interface RiskAssessment {
  category: OptimizationCategory;
  overallRisk: RiskLevel;
  factors: RiskFactor[];
  safeCount: number;
  riskyCount: number;
}

// ─── Impact Estimation ───────────────────────────────────────────────────────

export interface ImpactEstimate {
  category: OptimizationCategory;
  estimatedGainPercent: number;
  confidence: "high" | "medium" | "low";
  metrics: string[];
  beforeDesc: string;
  afterDesc: string;
}

// ─── Safety Validation ───────────────────────────────────────────────────────

export interface SafetyCheck {
  passed: boolean;
  blockers: string[];
  warnings: string[];
  checkedAt: string;
}

// ─── Pipeline State ──────────────────────────────────────────────────────────

export type AnalysisStep =
  | "scan"
  | "classify"
  | "risk"
  | "recommend"
  | "impact"
  | "validate";

export type StepStatus = "pending" | "running" | "done" | "error";

export const ANALYSIS_STEPS: Array<{ id: AnalysisStep; label: string; desc: string }> = [
  { id: "scan",      label: "System Scan",           desc: "Collecting hardware & software data" },
  { id: "classify",  label: "Profile Classification", desc: "Identifying system archetype" },
  { id: "risk",      label: "Risk Assessment",        desc: "Evaluating optimization risks" },
  { id: "recommend", label: "Recommendations",        desc: "Generating prioritized actions" },
  { id: "impact",    label: "Impact Estimation",      desc: "Calculating expected improvements" },
  { id: "validate",  label: "Safety Validation",      desc: "Confirming compatibility" },
];

export interface AnalysisPipelineState {
  stepStatuses: Record<AnalysisStep, StepStatus>;
  currentStep: AnalysisStep | null;
  profile: ProfileClassification | null;
  analysis: SystemAnalysisResult | null;
  recommendations: Recommendation[];
  riskAssessments: RiskAssessment[];
  impactEstimates: ImpactEstimate[];
  safetyCheck: SafetyCheck | null;
  completedAt: string | null;
  error: string | null;
}

export function createInitialPipelineState(): AnalysisPipelineState {
  return {
    stepStatuses: {
      scan: "pending",
      classify: "pending",
      risk: "pending",
      recommend: "pending",
      impact: "pending",
      validate: "pending",
    },
    currentStep: null,
    profile: null,
    analysis: null,
    recommendations: [],
    riskAssessments: [],
    impactEstimates: [],
    safetyCheck: null,
    completedAt: null,
    error: null,
  };
}
