import type { QuestionAnswer, QuestionnaireAnswers } from "@/stores/decisions-store";
import type { PersonalizationPreferences } from "@/stores/wizard-store";

export type StrategyIconName = string;
export type StrategyRiskLevel = "safe" | "mixed" | "aggressive" | "expert";

export interface StrategyQuestionBehavior {
  value?: QuestionAnswer;
  includeActions?: string[];
  blockActions?: string[];
  blockReason?: string | null;
  warnings?: string[];
  requiresReboot?: boolean;
  estimatedActions?: number;
  estimatedBlocked?: number;
  estimatedPreserved?: number;
  riskLevel?: StrategyRiskLevel | string;
}

export interface StrategyQuestionOption {
  value: QuestionAnswer;
  title: string;
  desc: string;
  badge?: string | null;
  badgeColor?: string | null;
  danger?: boolean | null;
  behavior?: StrategyQuestionBehavior | null;
}

export interface StrategyQuestionVisibility {
  minPreset?: string | null;
  onlyPreset?: string | null;
  minWindowsBuild?: number | null;
  excludeLaptop?: boolean | null;
  excludeWorkPc?: boolean | null;
}

export interface StrategyQuestionDefinition {
  key: string;
  icon: StrategyIconName;
  label: string;
  title: string;
  desc: string;
  note?: string | null;
  kind: string;
  required: boolean;
  requiredValue?: QuestionAnswer | null;
  visibility?: StrategyQuestionVisibility | null;
  options: StrategyQuestionOption[];
}

export interface StrategyQuestionContext {
  isLaptop: boolean;
  isWorkPc: boolean;
  windowsBuild: number;
}

export interface QuestionnaireChapter {
  id: string;
  title: string;
  description: string;
  kind: string;
  sourcePrompt: string;
  sourceSections: string[];
  callouts: string[];
  questions: StrategyQuestionDefinition[];
}

export interface QuestionnaireSchema {
  packageId: string;
  title: string;
  shortDescription: string;
  description: string;
  details: string;
  version: string;
  supportedBuilds: number[];
  profile?: string;
  windowsBuild?: number;
  chapters: QuestionnaireChapter[];
}

export interface PlaybookImpactSummary {
  estimatedActions: number;
  estimatedBlocked: number;
  estimatedPreserved: number;
  rebootRequired: boolean;
  riskLevel: StrategyRiskLevel;
  warnings: string[];
}

const RISK_ORDER: StrategyRiskLevel[] = ["safe", "mixed", "aggressive", "expert"];
const PRESET_ORDER = ["conservative", "balanced", "aggressive", "expert"];

function currentPreset(answers: QuestionnaireAnswers): string {
  const preset = answers.aggressionPreset;
  return typeof preset === "string" ? preset : "balanced";
}

function normalizeRisk(value?: string | null): StrategyRiskLevel {
  const lowered = value?.trim().toLowerCase();
  if (lowered === "expert") return "expert";
  if (lowered === "high" || lowered === "aggressive") return "aggressive";
  if (lowered === "medium" || lowered === "mixed") return "mixed";
  return "safe";
}

function mergeRisk(current: StrategyRiskLevel, next?: string | null): StrategyRiskLevel {
  const normalized = normalizeRisk(next);
  return RISK_ORDER[Math.max(RISK_ORDER.indexOf(current), RISK_ORDER.indexOf(normalized))] ?? current;
}

export function derivePlaybookPreset(answers: QuestionnaireAnswers): string {
  const preset = currentPreset(answers);
  if (preset === "conservative") return "conservative";
  if (preset === "balanced") return "balanced";
  return "aggressive";
}

export function isQuestionVisible(
  question: StrategyQuestionDefinition,
  answers: QuestionnaireAnswers,
  context: StrategyQuestionContext,
): boolean {
  const visibility = question.visibility;
  if (!visibility) return true;

  const preset = currentPreset(answers);
  if (visibility.onlyPreset && preset !== visibility.onlyPreset) return false;
  if (visibility.minPreset) {
    const currentRank = PRESET_ORDER.indexOf(preset);
    const requiredRank = PRESET_ORDER.indexOf(visibility.minPreset);
    if (currentRank < requiredRank) return false;
  }
  if (visibility.minWindowsBuild && context.windowsBuild < visibility.minWindowsBuild) return false;
  if (visibility.excludeLaptop && context.isLaptop) return false;
  if (visibility.excludeWorkPc && context.isWorkPc) return false;
  return true;
}

export function getVisibleChapters(
  schema: QuestionnaireSchema | null,
  answers: QuestionnaireAnswers,
  context: StrategyQuestionContext,
): QuestionnaireChapter[] {
  if (!schema) return [];
  return schema.chapters
    .map((chapter) => ({
      ...chapter,
      questions: chapter.questions.filter((question) => isQuestionVisible(question, answers, context)),
    }))
    .filter((chapter) => chapter.questions.length > 0);
}

export function isQuestionSatisfied(
  question: StrategyQuestionDefinition,
  answers: QuestionnaireAnswers,
): boolean {
  const value = answers[question.key];
  if (!question.required) return true;
  if (value === null || value === undefined) return false;
  if (question.requiredValue === undefined || question.requiredValue === null) return true;
  return value === question.requiredValue;
}

export function computeQuestionnaireImpact(
  schema: QuestionnaireSchema | null,
  answers: QuestionnaireAnswers,
  context: StrategyQuestionContext,
): PlaybookImpactSummary {
  if (!schema) {
    return {
      estimatedActions: 0,
      estimatedBlocked: 0,
      estimatedPreserved: 0,
      rebootRequired: false,
      riskLevel: "safe",
      warnings: [],
    };
  }

  let estimatedActions = 0;
  let estimatedBlocked = 0;
  let estimatedPreserved = 0;
  let rebootRequired = false;
  let riskLevel: StrategyRiskLevel = "safe";
  const warnings = new Set<string>();

  for (const chapter of getVisibleChapters(schema, answers, context)) {
    for (const question of chapter.questions) {
      const answer = answers[question.key];
      if (answer === null || answer === undefined) continue;
      const option = question.options.find((entry) => entry.value === answer);
      const behavior = option?.behavior;
      if (!behavior) continue;

      estimatedActions += behavior.estimatedActions ?? behavior.includeActions?.length ?? 0;
      estimatedBlocked += behavior.estimatedBlocked ?? behavior.blockActions?.length ?? 0;
      estimatedPreserved += behavior.estimatedPreserved ?? 0;
      rebootRequired ||= behavior.requiresReboot ?? false;
      riskLevel = mergeRisk(riskLevel, behavior.riskLevel);
      for (const warning of behavior.warnings ?? []) warnings.add(warning);
    }
  }

  return {
    estimatedActions,
    estimatedBlocked,
    estimatedPreserved,
    rebootRequired,
    riskLevel,
    warnings: [...warnings],
  };
}

export function resolveQuestionnairePersonalization(
  preferences: PersonalizationPreferences,
  defaults: PersonalizationPreferences,
  answers: QuestionnaireAnswers,
): PersonalizationPreferences {
  const resolved = { ...preferences };
  if (answers.disableTransparency === true) {
    resolved.transparency = false;
  } else if (resolved.transparency !== defaults.transparency) {
    resolved.transparency = preferences.transparency;
  }
  return resolved;
}
