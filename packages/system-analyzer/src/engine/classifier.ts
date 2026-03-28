// ─── Profile Classifier ──────────────────────────────────────────────────────
// Classifies a system into a primary SystemProfile from analysis results.

import type { SystemAnalysisResult, ProfileClassification, SystemProfile } from "../types.js";

export function classifyProfile(analysis: SystemAnalysisResult): ProfileClassification {
  const { hardware, software, workload, thermal } = analysis;
  const scores: Record<SystemProfile, number> = {
    gaming: 0,
    work: 0,
    budget: 0,
    highend: 0,
    laptop: 0,
    vm: 0,
  };
  const allSignals: string[] = [];

  // ─── VM detection (highest priority) ──────────────────────────────────────
  const isVM = hardware.deviceClass === "vm" || software.hasHyperV;
  if (isVM) {
    scores.vm += 0.9;
    allSignals.push("Virtualized environment or Hyper-V detected");
  }

  // ─── Laptop detection ─────────────────────────────────────────────────────
  const isLaptop = hardware.hasBattery || hardware.deviceClass === "laptop";
  if (isLaptop) {
    scores.laptop += 0.7;
    if (workload.isGamer) {
      scores.gaming += 0.4;
      allSignals.push("Gaming laptop — battery + gaming signals");
    } else {
      scores.work += 0.3;
      allSignals.push("Laptop detected — office/mobile workload assumed");
    }
  }

  // ─── Budget detection ─────────────────────────────────────────────────────
  const isBudget =
    hardware.cpu.tier === "entry" &&
    (hardware.gpu.tier === "entry" || !hardware.gpu.hasDiscreteGpu) &&
    hardware.ram.totalGb <= 16 &&
    hardware.overallScore < 40;

  if (isBudget) {
    scores.budget += 0.8;
    allSignals.push("Entry-tier CPU + GPU + limited RAM — budget classification");
  }

  // ─── High-end workstation ─────────────────────────────────────────────────
  const isHighEnd =
    hardware.cpu.tier === "flagship" &&
    hardware.ram.totalGb >= 32 &&
    hardware.overallScore >= 75;

  if (isHighEnd) {
    scores.highend += 0.8;
    allSignals.push(`Flagship-tier hardware — ${hardware.ram.totalGb}GB RAM, ${hardware.cpu.cores}-core CPU`);
    if (workload.isDeveloper) {
      scores.highend += 0.1;
      allSignals.push("Development tools detected on high-end hardware");
    }
  }

  // ─── Gaming desktop ────────────────────────────────────────────────────────
  if (!isLaptop && workload.isGamer) {
    scores.gaming += 0.5;
    allSignals.push("Gaming workload signals detected");
  }
  if (hardware.gpu.hasDiscreteGpu && hardware.gpu.tier !== "entry") {
    scores.gaming += 0.2;
    allSignals.push(`Discrete ${hardware.gpu.vendor.toUpperCase()} GPU: ${hardware.gpu.name}`);
  }
  if (analysis.software.windows.version === "11" && !isLaptop) {
    scores.gaming += 0.05;
  }

  // ─── Work desktop ──────────────────────────────────────────────────────────
  if (workload.isEnterprise) {
    scores.work += 0.6;
    allSignals.push("Enterprise Windows edition detected");
  }
  if (workload.primary === "work") {
    scores.work += 0.3;
    allSignals.push("Work-oriented signals: office apps, productivity tools");
  }

  // ─── Thermal context adjustments ─────────────────────────────────────────
  if (thermal.isThrottling) {
    // Throttling system — conservative profile
    scores.budget += 0.1;
    allSignals.push("Active thermal throttling — conservative tuning recommended");
  }

  // ─── Resolve final classification ─────────────────────────────────────────
  const ranked = (Object.entries(scores) as Array<[SystemProfile, number]>)
    .sort(([, a], [, b]) => b - a);

  const primary = ranked[0][0];
  const maxScore = ranked[0][1];

  // Normalize scores to 0-1 range for display
  const normalizedScores = Object.fromEntries(
    ranked.map(([p, s]) => [p, maxScore > 0 ? Math.round((s / maxScore) * 100) / 100 : 0])
  ) as Record<SystemProfile, number>;

  return {
    primary,
    confidence: Math.min(maxScore, 1),
    scores: normalizedScores,
    signals: allSignals,
  };
}
