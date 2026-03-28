// ─── Risk Assessor ───────────────────────────────────────────────────────────
// Evaluates per-category risk based on system analysis and recommendations.

import type {
  SystemAnalysisResult,
  Recommendation,
  RiskAssessment,
  RiskFactor,
  RiskLevel,
  OptimizationCategory,
} from "../types.js";

function escalateRisk(current: RiskLevel, candidate: RiskLevel): RiskLevel {
  const order: RiskLevel[] = ["safe", "low", "medium", "high"];
  return order.indexOf(candidate) > order.indexOf(current) ? candidate : current;
}

export function assessRisks(
  analysis: SystemAnalysisResult,
  recommendations: Recommendation[]
): RiskAssessment[] {
  // Group recommendations by category
  const byCategory = new Map<OptimizationCategory, Recommendation[]>();
  for (const r of recommendations) {
    const group = byCategory.get(r.category) ?? [];
    group.push(r);
    byCategory.set(r.category, group);
  }

  const assessments: RiskAssessment[] = [];

  for (const [category, recs] of byCategory) {
    const factors: RiskFactor[] = [];
    let overallRisk: RiskLevel = "safe";
    const safeCount = recs.filter((r) => r.riskLevel === "safe" || r.riskLevel === "low").length;
    const riskyCount = recs.filter((r) => r.riskLevel === "medium" || r.riskLevel === "high").length;

    for (const r of recs) {
      overallRisk = escalateRisk(overallRisk, r.riskLevel);

      if (r.riskLevel === "high") {
        factors.push({
          factor: r.title,
          severity: "high",
          detail: `${r.rationale} — requires manual review before applying`,
        });
      } else if (r.riskLevel === "medium") {
        factors.push({
          factor: r.title,
          severity: "medium",
          detail: r.rationale,
        });
      }

      if (r.requiresReboot) {
        factors.push({
          factor: `${r.title} requires reboot`,
          severity: "low",
          detail: "System restart needed to apply this change",
        });
      }
    }

    // ─── Category-specific risk factors ──────────────────────────────────────

    if (category === "security") {
      factors.push({
        factor: "Security changes affect system protection",
        severity: "medium",
        detail: "Disabling security features trades protection for performance. Assess based on threat model.",
      });
      overallRisk = escalateRisk(overallRisk, "medium");
    }

    if (category === "services") {
      factors.push({
        factor: "Service changes may break functionality",
        severity: "medium",
        detail: "Disabled services cannot be easily identified as causes of issues. Create a restore point first.",
      });
    }

    if (category === "scheduler") {
      const hasLaptop = analysis.hardware.hasBattery;
      if (hasLaptop) {
        factors.push({
          factor: "Laptop scheduler tuning may impact battery life",
          severity: "low",
          detail: "Aggressive scheduler settings increase power consumption on mobile hardware.",
        });
      }
    }

    if (category === "memory") {
      if (analysis.hardware.ram.type === "DDR5") {
        factors.push({
          factor: "DDR5 XMP/EXPO compatibility varies by board",
          severity: "low",
          detail: "Some Z690/Z790 boards have DDR5 XMP stability issues. Test with memtest after enabling.",
        });
      }
    }

    if (category === "storage") {
      if (analysis.hardware.storage.systemDrive.healthPercent !== null &&
          analysis.hardware.storage.systemDrive.healthPercent < 80) {
        factors.push({
          factor: "System drive health is below 80%",
          severity: "high",
          detail: "Drive may fail soon. Take backup before any storage configuration changes.",
        });
        overallRisk = "high";
      }
    }

    assessments.push({
      category,
      overallRisk,
      factors,
      safeCount,
      riskyCount,
    });
  }

  return assessments.sort((a, b) => {
    const order: RiskLevel[] = ["high", "medium", "low", "safe"];
    return order.indexOf(a.overallRisk) - order.indexOf(b.overallRisk);
  });
}
