// ─── Analysis Pipeline Orchestrator ─────────────────────────────────────────
// Multi-step pipeline: scan → classify → risk → recommend → impact → validate
// Each step updates state via a callback, enabling live UI progress.

import type { DeviceProfile } from "@redcore/shared-schema/device";
import { analyzeHardware } from "./analyzers/hardware-analyzer.js";
import { analyzeSoftware } from "./analyzers/software-analyzer.js";
import { analyzeWorkload } from "./analyzers/workload-analyzer.js";
import { analyzeThermal } from "./analyzers/thermal-analyzer.js";
import { analyzeNetwork } from "./analyzers/network-analyzer.js";
import { analyzeSecurity } from "./analyzers/security-analyzer.js";
import { classifyProfile } from "./engine/classifier.js";
import { generateRecommendations } from "./engine/recommender.js";
import { assessRisks } from "./engine/risk-assessor.js";
import { estimateImpacts } from "./engine/impact-estimator.js";
import { validateSafety } from "./engine/safety-validator.js";
import type {
  AnalysisPipelineState,
  AnalysisStep,
  SystemAnalysisResult,
  Recommendation,
} from "./types.js";
export { createInitialPipelineState } from "./types.js";

export type PipelineStateUpdate = (updater: (prev: AnalysisPipelineState) => AnalysisPipelineState) => void;

export interface OrchestratorOptions {
  /** Installed apps list for workload detection (optional) */
  installedApps?: string[];
  /** If true, the pipeline will not stop on errors */
  continueOnError?: boolean;
  /** Simulated delay per step for demo/testing (ms) */
  simulatedDelay?: number;
}

// ─── Helper: set step status ──────────────────────────────────────────────────

function setStep(
  onUpdate: PipelineStateUpdate,
  step: AnalysisStep,
  status: "running" | "done" | "error"
) {
  onUpdate((prev) => ({
    ...prev,
    currentStep: status === "done" ? prev.currentStep : step,
    stepStatuses: { ...prev.stepStatuses, [step]: status },
  }));
}

async function maybeDelay(ms: number | undefined) {
  if (ms && ms > 0) await new Promise((r) => setTimeout(r, ms));
}

// ─── Main Pipeline ────────────────────────────────────────────────────────────

/**
 * Runs the full analysis pipeline on a DeviceProfile.
 * Updates state via `onUpdate` callback at each step transition.
 * Returns the final populated state.
 */
export async function runAnalysisPipeline(
  deviceProfile: DeviceProfile,
  onUpdate: PipelineStateUpdate,
  options: OrchestratorOptions = {}
): Promise<AnalysisPipelineState> {
  const { installedApps = [], continueOnError = false, simulatedDelay } = options;

  let finalState: AnalysisPipelineState = {
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

  function update(updater: (prev: AnalysisPipelineState) => AnalysisPipelineState) {
    finalState = updater(finalState);
    onUpdate(updater);
  }

  try {
    // ─── Step 1: System Scan (all analyzers in parallel) ──────────────────────
    setStep(onUpdate, "scan", "running");
    update((prev) => ({ ...prev, currentStep: "scan" }));
    await maybeDelay(simulatedDelay);

    const [hardware, software, workload, thermal, network, security] = await Promise.all([
      Promise.resolve(analyzeHardware(deviceProfile)),
      Promise.resolve(analyzeSoftware(deviceProfile)),
      Promise.resolve(analyzeWorkload({ profile: deviceProfile, installedApps })),
      Promise.resolve(analyzeThermal(deviceProfile)),
      Promise.resolve(analyzeNetwork(deviceProfile)),
      Promise.resolve(analyzeSecurity(deviceProfile)),
    ]);

    const analysis: SystemAnalysisResult = {
      hardware,
      software,
      workload,
      thermal,
      network,
      security,
      analyzedAt: new Date().toISOString(),
    };

    update((prev) => ({ ...prev, analysis, stepStatuses: { ...prev.stepStatuses, scan: "done" } }));

    // ─── Step 2: Profile Classification ───────────────────────────────────────
    setStep(onUpdate, "classify", "running");
    update((prev) => ({ ...prev, currentStep: "classify" }));
    await maybeDelay(simulatedDelay);

    const profile = classifyProfile(analysis);
    update((prev) => ({ ...prev, profile, stepStatuses: { ...prev.stepStatuses, classify: "done" } }));

    // ─── Step 3: Risk Assessment ───────────────────────────────────────────────
    setStep(onUpdate, "risk", "running");
    update((prev) => ({ ...prev, currentStep: "risk" }));
    await maybeDelay(simulatedDelay);

    // Generate recommendations first (needed for risk assessment)
    const recommendations = generateRecommendations(analysis, profile);
    const riskAssessments = assessRisks(analysis, recommendations);
    update((prev) => ({
      ...prev,
      riskAssessments,
      stepStatuses: { ...prev.stepStatuses, risk: "done" },
    }));

    // ─── Step 4: Recommendations ───────────────────────────────────────────────
    setStep(onUpdate, "recommend", "running");
    update((prev) => ({ ...prev, currentStep: "recommend" }));
    await maybeDelay(simulatedDelay);

    update((prev) => ({
      ...prev,
      recommendations,
      stepStatuses: { ...prev.stepStatuses, recommend: "done" },
    }));

    // ─── Step 5: Impact Estimation ─────────────────────────────────────────────
    setStep(onUpdate, "impact", "running");
    update((prev) => ({ ...prev, currentStep: "impact" }));
    await maybeDelay(simulatedDelay);

    const impactEstimates = estimateImpacts(analysis, profile, recommendations);
    update((prev) => ({
      ...prev,
      impactEstimates,
      stepStatuses: { ...prev.stepStatuses, impact: "done" },
    }));

    // ─── Step 6: Safety Validation ─────────────────────────────────────────────
    setStep(onUpdate, "validate", "running");
    update((prev) => ({ ...prev, currentStep: "validate" }));
    await maybeDelay(simulatedDelay);

    const safetyCheck = validateSafety(analysis, recommendations);
    update((prev) => ({
      ...prev,
      safetyCheck,
      stepStatuses: { ...prev.stepStatuses, validate: "done" },
      currentStep: null,
      completedAt: new Date().toISOString(),
    }));

  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error in analysis pipeline";
    update((prev) => ({ ...prev, error: message }));
    if (!continueOnError) throw err;
  }

  return finalState;
}

/**
 * Toggle a recommendation's enabled state.
 * Returns a new recommendations array (immutable).
 */
export function toggleRecommendation(
  recommendations: Recommendation[],
  id: string
): Recommendation[] {
  return recommendations.map((r) =>
    r.id === id ? { ...r, isEnabled: !r.isEnabled } : r
  );
}

/**
 * Re-run impact estimation and safety validation after recommendations change.
 * Lightweight re-compute — no full scan needed.
 */
export function recomputePlan(
  state: AnalysisPipelineState
): Pick<AnalysisPipelineState, "impactEstimates" | "safetyCheck"> {
  if (!state.analysis || !state.profile) {
    return { impactEstimates: [], safetyCheck: null };
  }
  return {
    impactEstimates: estimateImpacts(state.analysis, state.profile, state.recommendations),
    safetyCheck: validateSafety(state.analysis, state.recommendations),
  };
}
