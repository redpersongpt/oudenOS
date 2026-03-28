// ─── System Analyzer ─────────────────────────────────────────────────────────
// Multi-step system analysis and recommendation engine.
// Usage: import { runAnalysisPipeline, createInitialPipelineState } from "@redcore/system-analyzer"
// UI:    import { SystemAnalysisCard, RecommendationList } from "@redcore/system-analyzer/components"

// Types
export type {
  HardwareAnalysis,
  CpuAnalysis,
  GpuAnalysis,
  RamAnalysis,
  StorageAnalysis,
  HardwareTier,
  SoftwareAnalysis,
  WindowsAnalysis,
  WorkloadAnalysis,
  WorkloadSignal,
  WorkloadType,
  ThermalAnalysis,
  ThermalRating,
  NetworkAnalysis,
  ConnectionQuality,
  SecurityAnalysis,
  SecurityPosture,
  SystemAnalysisResult,
  SystemProfile,
  ProfileClassification,
  RiskLevel,
  OptimizationCategory,
  Recommendation,
  RiskFactor,
  RiskAssessment,
  ImpactEstimate,
  SafetyCheck,
  AnalysisStep,
  StepStatus,
  AnalysisPipelineState,
} from "./types.js";

export { ANALYSIS_STEPS, createInitialPipelineState } from "./types.js";

// Analyzers
export { analyzeHardware } from "./analyzers/hardware-analyzer.js";
export { analyzeSoftware } from "./analyzers/software-analyzer.js";
export { analyzeWorkload } from "./analyzers/workload-analyzer.js";
export { analyzeThermal } from "./analyzers/thermal-analyzer.js";
export { analyzeNetwork } from "./analyzers/network-analyzer.js";
export { analyzeSecurity } from "./analyzers/security-analyzer.js";

// Engine
export { classifyProfile } from "./engine/classifier.js";
export { generateRecommendations } from "./engine/recommender.js";
export { assessRisks } from "./engine/risk-assessor.js";
export { estimateImpacts } from "./engine/impact-estimator.js";
export { validateSafety } from "./engine/safety-validator.js";

// Orchestrator
export {
  runAnalysisPipeline,
  toggleRecommendation,
  recomputePlan,
} from "./orchestrator.js";
export type { PipelineStateUpdate, OrchestratorOptions } from "./orchestrator.js";
