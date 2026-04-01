// Security & Mitigation Module
// Speculative execution mitigation analysis and expert-only controls.
// NEVER recommend mitigation reduction in normal presets.

import type { TuningActionDefinition } from "../types.js";

export const securityActions: TuningActionDefinition[] = [
  {
    id: "security.analyze-mitigations",
    name: "Analyze Speculative Execution Mitigations",
    category: "security",
    description: "Detect and report the current state of CPU speculative execution mitigations (Spectre, Meltdown, SSBD, MDS). No changes are made — analysis only.",
    rationale: "Understanding which mitigations are active helps informed decision-making. AMD CPUs are not vulnerable to Meltdown and have hardware Spectre v2 mitigations, so disabling software mitigations provides minimal gain. Intel pre-10th gen CPUs see the largest overhead from KPTI.",
    tier: "free",
    risk: "safe",
    compatibility: { minBuild: 16299 },
    dependencies: [],
    conflicts: [],
    estimatedImpact: null,
    registryChanges: [],
    serviceChanges: [],
    powerChanges: [],
    bcdChanges: [],
    requiresReboot: false,
    sideEffects: [],
    tags: ["security", "spectre", "meltdown", "analysis"],
  },
  {
    id: "security.reduce-ssbd-mitigation",
    name: "Reduce Speculative Store Bypass (SSBD) Mitigation",
    category: "security",
    description: "Disable the SSBD mitigation via FeatureSettingsOverride registry keys. This reduces a 2-8% performance overhead on syscall-heavy workloads but exposes the system to CVE-2018-3639.",
    rationale: "SSBD mitigates Spectre Variant 4 (speculative store bypass). On dedicated gaming PCs not used for sensitive operations, the 2-8% overhead may not justify the protection. This is the lowest-risk mitigation to disable because Spectre v4 attacks require local code execution.",
    tier: "premium",
    risk: "high",
    compatibility: { minBuild: 17134 },
    dependencies: [],
    conflicts: [],
    estimatedImpact: {
      metric: "syscall_throughput",
      directionBetter: "higher",
      estimatedDelta: "2-8% improvement in syscall-heavy workloads",
      confidence: "measured",
    },
    registryChanges: [
      {
        hive: "HKEY_LOCAL_MACHINE",
        path: "SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management",
        valueName: "FeatureSettingsOverride",
        valueType: "REG_DWORD",
        newValue: 8,
      },
      {
        hive: "HKEY_LOCAL_MACHINE",
        path: "SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management",
        valueName: "FeatureSettingsOverrideMask",
        valueType: "REG_DWORD",
        newValue: 3,
      },
    ],
    serviceChanges: [],
    powerChanges: [],
    bcdChanges: [],
    requiresReboot: true,
    sideEffects: [
      "SECURITY WARNING: Disables protection against CVE-2018-3639 (Spectre Variant 4)",
      "System is exposed to speculative store bypass side-channel attacks",
      "Do NOT use on systems handling sensitive data, banking, or personal information",
      "Only recommended for isolated gaming rigs or offline benchmark systems",
      "Requires reboot to take effect",
      "AMD CPUs may see minimal gain — they have hardware SSBD support",
    ],
    tags: ["security", "spectre", "mitigation", "expert", "high-risk"],
  },
];
