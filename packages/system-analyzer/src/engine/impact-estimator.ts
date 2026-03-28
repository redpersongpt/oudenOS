// ─── Impact Estimator ────────────────────────────────────────────────────────
// Estimates the potential performance improvement per optimization category.

import type {
  SystemAnalysisResult,
  ProfileClassification,
  Recommendation,
  ImpactEstimate,
  OptimizationCategory,
} from "../types.js";

type ConfidenceLevel = "high" | "medium" | "low";

const CATEGORY_METRICS: Record<OptimizationCategory, string[]> = {
  cpu: ["CPU latency", "frame time consistency", "task throughput"],
  gpu: ["GPU frame rate", "VRAM throughput", "render latency"],
  memory: ["memory bandwidth", "CPU cache efficiency", "multitasking"],
  storage: ["load times", "file I/O speed", "system responsiveness"],
  network: ["ping latency", "throughput", "packet loss reduction"],
  security: ["CPU overhead reduction", "kernel latency"],
  startup: ["boot time", "background CPU usage"],
  services: ["idle RAM usage", "background CPU usage"],
  power: ["sustained CPU frequency", "boost clock duration"],
  scheduler: ["frame time variance", "input latency", "DPC latency"],
};

function estimateCategoryImpact(
  category: OptimizationCategory,
  categoryRecs: Recommendation[],
  analysis: SystemAnalysisResult,
  profile: ProfileClassification
): ImpactEstimate {
  // Sum weighted impact from recommendations in this category
  const enabledRecs = categoryRecs.filter((r) => r.isEnabled);
  const totalImpact = enabledRecs.reduce((sum, r) => sum + r.impactEstimate * r.confidence, 0);
  const avgConfidence = enabledRecs.length > 0
    ? enabledRecs.reduce((sum, r) => sum + r.confidence, 0) / enabledRecs.length
    : 0;

  const confidence: ConfidenceLevel =
    avgConfidence >= 0.85 ? "high" :
    avgConfidence >= 0.65 ? "medium" : "low";

  // Build before/after descriptions
  const beforeAfter = getBeforeAfterDesc(category, analysis, profile);

  return {
    category,
    estimatedGainPercent: Math.round(Math.min(totalImpact, 50)), // cap at 50% for credibility
    confidence,
    metrics: CATEGORY_METRICS[category],
    beforeDesc: beforeAfter.before,
    afterDesc: beforeAfter.after,
  };
}

function getBeforeAfterDesc(
  category: OptimizationCategory,
  analysis: SystemAnalysisResult,
  _profile: ProfileClassification
): { before: string; after: string } {
  const { hardware, software, network } = analysis;

  switch (category) {
    case "cpu":
      return {
        before: software.coreParkingEnabled
          ? "Core parking causes 2-10ms wake latency spikes"
          : "Default scheduler with variable clock states",
        after: "Consistent clock frequencies, minimal scheduling jitter",
      };
    case "gpu":
      return {
        before: hardware.gpu.resizableBar
          ? "256MB VRAM BAR window (PCIe default)"
          : "Full VRAM accessible (BAR enabled)",
        after: hardware.gpu.resizableBar
          ? "Full VRAM accessible — reduced CPU-GPU stalls"
          : "GPU scheduling offloaded to dedicated hardware",
      };
    case "memory":
      return {
        before: hardware.ram.xmpEnabled
          ? `${hardware.ram.speedMhz}MHz (XMP active)`
          : `${hardware.ram.speedMhz}MHz stock speed — below rated frequency`,
        after: hardware.ram.xmpEnabled
          ? "Optimal bandwidth configuration"
          : "Full rated speed — maximum memory bandwidth",
      };
    case "storage":
      return {
        before: hardware.storage.systemDrive.trimEnabled
          ? "TRIM active, normal SSD maintenance"
          : "TRIM disabled — write amplification increases over time",
        after: "Consistent SSD performance, optimal wear leveling",
      };
    case "power":
      return {
        before: `'${software.powerPlan}' plan — CPU may throttle frequency`,
        after: "Maximum sustained frequencies — no power-saving interruptions",
      };
    case "scheduler":
      return {
        before: "Default Win32 scheduler — balanced for general use",
        after: "Optimized for foreground app priority — lower input latency",
      };
    case "network":
      return {
        before: network.isWifi
          ? "Wi-Fi connection — variable 10-50ms jitter"
          : `RSS at ${network.rssQueues ?? "default"} queues`,
        after: network.isWifi
          ? "Ethernet — consistent sub-5ms latency"
          : "Multi-queue RSS — distributed network processing",
      };
    case "security":
      return {
        before: "HVCI enabled — kernel integrity at ~5-15% CPU overhead",
        after: "Reduced kernel overhead — more CPU headroom for apps",
      };
    case "services":
      return {
        before: `${software.runningServicesCount ?? "Many"} background services running`,
        after: "Lean service set — recovered RAM and reduced CPU background load",
      };
    case "startup":
      return {
        before: "Unoptimized startup — delayed ready-to-use time",
        after: "Streamlined startup — faster boot to desktop",
      };
    default:
      return { before: "Current configuration", after: "Optimized configuration" };
  }
}

export function estimateImpacts(
  analysis: SystemAnalysisResult,
  profile: ProfileClassification,
  recommendations: Recommendation[]
): ImpactEstimate[] {
  const byCategory = new Map<OptimizationCategory, Recommendation[]>();
  for (const r of recommendations) {
    const group = byCategory.get(r.category) ?? [];
    group.push(r);
    byCategory.set(r.category, group);
  }

  return Array.from(byCategory.entries())
    .map(([category, recs]) => estimateCategoryImpact(category, recs, analysis, profile))
    .filter((e) => e.estimatedGainPercent > 0)
    .sort((a, b) => b.estimatedGainPercent - a.estimatedGainPercent);
}
