// ─── Questionnaire Decisions Store ──────────────────────────────────────────
// Stores the expanded playbook strategy answers. These answers are later
// projected onto the resolved playbook so the Apply step executes exactly what
// the user chose instead of a fixed preset.

import { create } from "zustand";

export type AggressionPreset = "conservative" | "balanced" | "aggressive" | "expert";
export type EdgeBehavior = "keep" | "suppress" | "suppress-and-freeze";
export type TelemetryLevel = "keep" | "reduce" | "aggressive";

export interface QuestionnaireAnswers {
  aggressionPreset: AggressionPreset | null;
  highPerformancePlan: boolean | null;
  aggressiveBoostMode: boolean | null;
  minProcessorState100: boolean | null;
  optimizeThreadPriority: boolean | null;
  globalTimerResolution: boolean | null;
  disableDynamicTick: boolean | null;
  disableCoreParking: boolean | null;
  gamingMmcss: boolean | null;
  disableMemoryCompression: boolean | null;
  disableHags: boolean | null;
  disableGpuTelemetry: boolean | null;
  disableGameDvr: boolean | null;
  disableFullscreenOptimizations: boolean | null;
  disableIndexing: boolean | null;
  stripSearchWebNoise: boolean | null;
  keepPrinterSupport: boolean | null;
  keepRemoteAccess: boolean | null;
  edgeBehavior: EdgeBehavior | null;
  removeEdge: boolean | null;
  preserveWebView2: boolean | null;
  disableCopilot: boolean | null;
  disableRecall: boolean | null;
  disableClickToDo: boolean | null;
  disableAiApps: boolean | null;
  telemetryLevel: TelemetryLevel | null;
  disableClipboardHistory: boolean | null;
  disableActivityFeed: boolean | null;
  disableLocation: boolean | null;
  disableTailoredExperiences: boolean | null;
  disableSpeechPersonalization: boolean | null;
  disableSmartScreen: boolean | null;
  reduceMitigations: boolean | null;
  disableHvci: boolean | null;
  disableLlmnr: boolean | null;
  disableIpv6: boolean | null;
  disableTeredo: boolean | null;
  disableNetbios: boolean | null;
  disableNagle: boolean | null;
  disableNicOffloading: boolean | null;
  disableDeliveryOptimization: boolean | null;
  disableFastStartup: boolean | null;
  disableHibernation: boolean | null;
  disableUsbSelectiveSuspend: boolean | null;
  disablePcieLinkStatePm: boolean | null;
  disableAudioEnhancements: boolean | null;
  enableAudioExclusiveMode: boolean | null;
  restoreClassicContextMenu: boolean | null;
  enableEndTask: boolean | null;
  disableBackgroundApps: boolean | null;
  disableAutomaticMaintenance: boolean | null;
  enableGameMode: boolean | null;
  disableTransparency: boolean | null;
}

export interface PlaybookImpact {
  estimatedActions: number;
  estimatedBlocked: number;
  estimatedPreserved: number;
  rebootRequired: boolean;
  riskLevel: "safe" | "mixed" | "aggressive" | "expert";
  warnings: string[];
}

interface DecisionsState {
  answers: QuestionnaireAnswers;
  impact: PlaybookImpact;
  setAnswer: (
    key: keyof QuestionnaireAnswers,
    value: QuestionnaireAnswers[keyof QuestionnaireAnswers],
  ) => void;
  reset: () => void;
}

export const DEFAULT_QUESTIONNAIRE_ANSWERS: QuestionnaireAnswers = {
  aggressionPreset: null,
  highPerformancePlan: null,
  aggressiveBoostMode: null,
  minProcessorState100: null,
  optimizeThreadPriority: null,
  globalTimerResolution: null,
  disableDynamicTick: null,
  disableCoreParking: null,
  gamingMmcss: null,
  disableMemoryCompression: null,
  disableHags: null,
  disableGpuTelemetry: null,
  disableGameDvr: null,
  disableFullscreenOptimizations: null,
  disableIndexing: null,
  stripSearchWebNoise: null,
  keepPrinterSupport: null,
  keepRemoteAccess: null,
  edgeBehavior: null,
  removeEdge: null,
  preserveWebView2: null,
  disableCopilot: null,
  disableRecall: null,
  disableClickToDo: null,
  disableAiApps: null,
  telemetryLevel: null,
  disableClipboardHistory: null,
  disableActivityFeed: null,
  disableLocation: null,
  disableTailoredExperiences: null,
  disableSpeechPersonalization: null,
  disableSmartScreen: null,
  reduceMitigations: null,
  disableHvci: null,
  disableLlmnr: null,
  disableIpv6: null,
  disableTeredo: null,
  disableNetbios: null,
  disableNagle: null,
  disableNicOffloading: null,
  disableDeliveryOptimization: null,
  disableFastStartup: null,
  disableHibernation: null,
  disableUsbSelectiveSuspend: null,
  disablePcieLinkStatePm: null,
  disableAudioEnhancements: null,
  enableAudioExclusiveMode: null,
  restoreClassicContextMenu: null,
  enableEndTask: null,
  disableBackgroundApps: null,
  disableAutomaticMaintenance: null,
  enableGameMode: null,
  disableTransparency: null,
};

const BOOLEAN_KEYS: Array<keyof QuestionnaireAnswers> = [
  "highPerformancePlan",
  "aggressiveBoostMode",
  "minProcessorState100",
  "optimizeThreadPriority",
  "globalTimerResolution",
  "disableDynamicTick",
  "disableCoreParking",
  "gamingMmcss",
  "disableMemoryCompression",
  "disableHags",
  "disableGpuTelemetry",
  "disableGameDvr",
  "disableFullscreenOptimizations",
  "disableIndexing",
  "stripSearchWebNoise",
  "keepPrinterSupport",
  "keepRemoteAccess",
  "removeEdge",
  "preserveWebView2",
  "disableCopilot",
  "disableRecall",
  "disableClickToDo",
  "disableAiApps",
  "disableClipboardHistory",
  "disableActivityFeed",
  "disableLocation",
  "disableTailoredExperiences",
  "disableSpeechPersonalization",
  "disableSmartScreen",
  "reduceMitigations",
  "disableHvci",
  "disableLlmnr",
  "disableIpv6",
  "disableTeredo",
  "disableNetbios",
  "disableNagle",
  "disableNicOffloading",
  "disableDeliveryOptimization",
  "disableFastStartup",
  "disableHibernation",
  "disableUsbSelectiveSuspend",
  "disablePcieLinkStatePm",
  "disableAudioEnhancements",
  "enableAudioExclusiveMode",
  "restoreClassicContextMenu",
  "enableEndTask",
  "disableBackgroundApps",
  "disableAutomaticMaintenance",
  "enableGameMode",
  "disableTransparency",
];

function computeImpact(answers: QuestionnaireAnswers): PlaybookImpact {
  const warnings: string[] = [];
  let estimatedActions = 0;
  let estimatedBlocked = 0;
  let estimatedPreserved = 0;
  let rebootRequired = false;

  for (const key of BOOLEAN_KEYS) {
    const value = answers[key];
    if (value === true) estimatedActions += 1;
    if (key === "keepPrinterSupport" && value === true) estimatedPreserved += 1;
    if (key === "keepRemoteAccess" && value === true) estimatedPreserved += 1;
    if (key === "preserveWebView2" && value === true) estimatedPreserved += 1;
  }

  if (answers.edgeBehavior === "suppress" || answers.edgeBehavior === "suppress-and-freeze") {
    estimatedActions += answers.edgeBehavior === "suppress" ? 2 : 3;
  }
  if (answers.telemetryLevel === "reduce") estimatedActions += 3;
  if (answers.telemetryLevel === "aggressive") estimatedActions += 4;
  if (answers.aggressionPreset === "conservative") estimatedBlocked += 8;
  if (answers.aggressionPreset === "balanced") estimatedBlocked += 3;

  if (answers.disableDynamicTick || answers.globalTimerResolution || answers.reduceMitigations || answers.disableHvci) {
    rebootRequired = true;
  }
  if (answers.removeEdge) {
    rebootRequired = true;
    warnings.push("Edge removal is irreversible without a manual reinstall.");
  }
  if (answers.preserveWebView2 === false) {
    warnings.push("Removing WebView2 can break Teams, installer UIs, and embedded web surfaces.");
  }
  if (answers.reduceMitigations) {
    warnings.push("Speculation mitigation reduction trades security for latency and syscall-heavy performance.");
  }
  if (answers.disableHvci) {
    warnings.push("Disabling HVCI can break security baselines and some anti-cheat requirements.");
  }
  if (answers.disableIpv6 || answers.disableTeredo || answers.disableNetbios || answers.disableNagle || answers.disableNicOffloading) {
    warnings.push("Aggressive network tuning is hardware-sensitive. Verify games, VPNs, and voice chat after apply.");
  }
  if (answers.disableAudioEnhancements) {
    warnings.push("Audio enhancements off can change loudness, EQ, and motherboard vendor DSP behavior.");
  }

  const riskLevel: PlaybookImpact["riskLevel"] =
    answers.aggressionPreset === "expert" ? "expert"
      : answers.aggressionPreset === "aggressive" ? "aggressive"
      : warnings.length > 0 ? "mixed"
      : "safe";

  return {
    estimatedActions,
    estimatedBlocked,
    estimatedPreserved,
    rebootRequired,
    riskLevel,
    warnings,
  };
}

export const useDecisionsStore = create<DecisionsState>((set) => ({
  answers: { ...DEFAULT_QUESTIONNAIRE_ANSWERS },
  impact: computeImpact(DEFAULT_QUESTIONNAIRE_ANSWERS),

  setAnswer: (key, value) =>
    set((state) => {
      const answers = { ...state.answers, [key]: value };
      return {
        answers,
        impact: computeImpact(answers),
      };
    }),

  reset: () =>
    set({
      answers: { ...DEFAULT_QUESTIONNAIRE_ANSWERS },
      impact: computeImpact(DEFAULT_QUESTIONNAIRE_ANSWERS),
    }),
}));
