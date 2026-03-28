// ─── Safety Validator ────────────────────────────────────────────────────────
// Pre-apply compatibility and safety checks for the recommendation plan.

import type {
  SystemAnalysisResult,
  Recommendation,
  SafetyCheck,
} from "../types.js";

export function validateSafety(
  analysis: SystemAnalysisResult,
  recommendations: Recommendation[]
): SafetyCheck {
  const blockers: string[] = [];
  const warnings: string[] = [];

  const enabled = recommendations.filter((r) => r.isEnabled);

  // ─── Hard blockers ────────────────────────────────────────────────────────

  // Drive health check before storage ops
  const storageRecs = enabled.filter((r) => r.category === "storage");
  const driveHealth = analysis.hardware.storage.systemDrive.healthPercent;
  if (storageRecs.length > 0 && driveHealth !== null && driveHealth < 60) {
    blockers.push(
      `System drive health is critically low (${driveHealth}%) — storage changes are blocked until drive is replaced or backed up`
    );
  }

  // Thermal throttling + aggressive CPU changes
  const aggressiveCpuRecs = enabled.filter(
    (r) => r.category === "cpu" && (r.id.includes("parking") || r.id.includes("scheduler"))
  );
  if (aggressiveCpuRecs.length > 0 && analysis.thermal.isThrottling) {
    blockers.push(
      "System is currently throttling — CPU optimizations are blocked until thermal issues are resolved"
    );
  }

  // VM-specific block
  if (analysis.hardware.deviceClass === "vm") {
    const dangerousInVM = enabled.filter((r) =>
      ["gpu.enable-resizable-bar", "gpu.enable-smart-access", "memory.dual-channel"].includes(r.id)
    );
    for (const r of dangerousInVM) {
      blockers.push(
        `'${r.title}' cannot be applied in a virtual machine environment`
      );
    }
  }

  // ─── Warnings ─────────────────────────────────────────────────────────────

  // XMP on DDR5 — potential instability
  const xmpRec = enabled.find((r) => r.id === "memory.enable-xmp");
  if (xmpRec && analysis.hardware.ram.type === "DDR5") {
    warnings.push(
      "DDR5 XMP profiles may require BIOS updates for stability — run memory stress test after enabling"
    );
  }

  // HVCI disable warning
  const hvciRec = enabled.find((r) => r.id === "security.hvci-tradeoff");
  if (hvciRec) {
    warnings.push(
      "Disabling Memory Integrity reduces protection against kernel-level malware — ensure your system is trusted and up to date"
    );
  }

  // Reboot count warning
  const rebootRecs = enabled.filter((r) => r.requiresReboot);
  if (rebootRecs.length > 1) {
    warnings.push(
      `${rebootRecs.length} changes require a system reboot — plan for one restart after applying all changes`
    );
  }

  // Service changes
  const serviceRecs = enabled.filter((r) => r.category === "services");
  if (serviceRecs.length > 0) {
    warnings.push(
      "Service changes are reversible but may disable unexpected functionality — create a restore point first"
    );
  }

  // High-count enabled recs warning
  if (enabled.length > 10) {
    warnings.push(
      `Applying ${enabled.length} changes at once — consider applying in batches and testing between groups`
    );
  }

  // Low-spec warning for aggressive changes
  if (analysis.hardware.overallScore < 35) {
    const aggressiveRecs = enabled.filter((r) => r.riskLevel === "medium" || r.riskLevel === "high");
    if (aggressiveRecs.length > 0) {
      warnings.push(
        "Low-spec system detected — aggressive optimizations may have diminishing returns or stability impact"
      );
    }
  }

  return {
    passed: blockers.length === 0,
    blockers,
    warnings,
    checkedAt: new Date().toISOString(),
  };
}
