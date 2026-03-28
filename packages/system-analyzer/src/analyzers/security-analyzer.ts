// ─── Security Analyzer ───────────────────────────────────────────────────────
// Analyzes Windows security posture, VBS/HVCI impact, and firewall config.

import type { DeviceProfile } from "@redcore/shared-schema/device";
import type { SecurityAnalysis, SecurityPosture } from "../types.js";

function classifyPosture(security: DeviceProfile["security"]): SecurityPosture {
  const score =
    (security.secureBoot ? 1 : 0) +
    (security.tpmVersion !== null ? 1 : 0) +
    (security.vbsEnabled ? 1 : 0) +
    (security.hvciEnabled ? 1 : 0) +
    (security.memoryIntegrity ? 1 : 0);

  if (score >= 4) return "hardened";
  if (score >= 2) return "standard";
  if (score >= 1) return "minimal";
  return "exposed";
}

export function analyzeSecurity(profile: DeviceProfile): SecurityAnalysis {
  const sec = profile.security;
  const notes: string[] = [];

  const posture = classifyPosture(sec);

  // VBS/HVCI performance impact flags
  // These features protect against kernel exploits but add CPU overhead
  // For gaming systems, this can cost 5-15% performance
  const vbsPerformanceImpact = sec.vbsEnabled && !sec.hvciEnabled;
  const hvciPerformanceImpact = sec.hvciEnabled || sec.memoryIntegrity;

  if (hvciPerformanceImpact) {
    notes.push("Memory Integrity (HVCI) is enabled — provides strong protection but may reduce performance 5-15% on older CPUs");
  }

  if (!sec.secureBoot) {
    notes.push("Secure Boot is disabled — consider enabling for improved boot security");
  }

  if (sec.tpmVersion === null) {
    notes.push("TPM not detected or disabled — required for BitLocker and Windows 11 baseline security");
  }

  if (!sec.bitlockerEnabled && posture === "hardened") {
    notes.push("BitLocker disabled on a hardened system — consider enabling for data protection");
  }

  if (sec.virtualizationEnabled && !sec.vbsEnabled) {
    notes.push("VT-x/AMD-V is enabled but VBS is disabled — consider enabling for added kernel protection");
  }

  if (posture === "exposed") {
    notes.push("Security posture is minimal — Secure Boot, TPM, and VBS are recommended");
  }

  // Score: 20 pts each for secureBoot, TPM, bitlocker, VBS+HVCI, memory integrity
  const score =
    (sec.secureBoot ? 20 : 0) +
    (sec.tpmVersion !== null ? 20 : 0) +
    (sec.bitlockerEnabled ? 20 : 0) +
    (sec.vbsEnabled ? 10 : 0) +
    (sec.hvciEnabled ? 15 : 0) +
    (sec.memoryIntegrity ? 15 : 0);

  return {
    secureBoot: sec.secureBoot,
    tpmPresent: sec.tpmVersion !== null,
    bitlockerEnabled: sec.bitlockerEnabled,
    vbsEnabled: sec.vbsEnabled,
    hvciEnabled: sec.hvciEnabled,
    memoryIntegrityEnabled: sec.memoryIntegrity,
    virtualizationEnabled: sec.virtualizationEnabled,
    posture,
    vbsPerformanceImpact,
    hvciPerformanceImpact,
    score: Math.min(score, 100),
    notes,
  };
}
