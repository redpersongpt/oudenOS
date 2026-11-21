// Quick setups — recommended answer sets delivered by the service as part of
// `questionnaire.resolve` (field `quickSetups`). The Rust resolver stays the
// source of truth: the renderer only copies these answers into the decisions
// store; it never computes recommendations itself.
//
// Contract:
//   quickSetups: Array<{ id: string; preset: string;
//                        answers: Record<string, unknown>;
//                        optionalQuestionKeys: string[] }>
// When the field is absent (older service), every helper degrades to "no
// quick setups" and the UI hides the quick-setup cards.

export type QuickSetupAnswer = string | boolean;

export interface QuickSetup {
  id: string;
  preset: string;
  answers: Record<string, QuickSetupAnswer>;
  optionalQuestionKeys: string[];
}

function isAnswer(value: unknown): value is QuickSetupAnswer {
  return typeof value === "string" || typeof value === "boolean";
}

export function readQuickSetups(schema: unknown): QuickSetup[] {
  if (typeof schema !== "object" || schema === null) return [];
  const raw = (schema as { quickSetups?: unknown }).quickSetups;
  if (!Array.isArray(raw)) return [];
  const out: QuickSetup[] = [];
  for (const entry of raw) {
    if (typeof entry !== "object" || entry === null) continue;
    const e = entry as Record<string, unknown>;
    if (typeof e.id !== "string" || typeof e.preset !== "string") continue;
    const answers: Record<string, QuickSetupAnswer> = {};
    if (typeof e.answers === "object" && e.answers !== null) {
      for (const [key, value] of Object.entries(e.answers as Record<string, unknown>)) {
        if (isAnswer(value)) answers[key] = value;
      }
    }
    const optionalQuestionKeys = Array.isArray(e.optionalQuestionKeys)
      ? e.optionalQuestionKeys.filter((k): k is string => typeof k === "string")
      : [];
    out.push({ id: e.id, preset: e.preset, answers, optionalQuestionKeys });
  }
  return out;
}

/** The setup whose recommendations should guide the questionnaire for a preset. */
export function setupForPreset(setups: QuickSetup[], preset: string | null | undefined): QuickSetup | null {
  return (
    setups.find((s) => s.preset === preset) ??
    setups.find((s) => s.id === "recommended") ??
    null
  );
}

/**
 * Answers to apply for "Use recommended for the rest": only keys that are
 * visible and still unanswered, and only values that exist as options.
 */
export function fillUnanswered(
  visibleQuestions: Array<{ key: string; options: Array<{ value: unknown }> }>,
  answers: Record<string, unknown>,
  setup: QuickSetup,
): Record<string, QuickSetupAnswer> {
  const patch: Record<string, QuickSetupAnswer> = {};
  for (const question of visibleQuestions) {
    const current = answers[question.key];
    if (current !== null && current !== undefined) continue;
    const recommended = setup.answers[question.key];
    if (recommended === undefined) continue;
    if (!question.options.some((o) => o.value === recommended)) continue;
    patch[question.key] = recommended;
  }
  return patch;
}

/**
 * The value an optional opt-in toggle sets: the option flagged `danger`, else
 * boolean `true` when the question is a yes/no question, else null (no toggle).
 */
export function optInValue(question: { options: Array<{ value: unknown; danger?: boolean | null }> }): QuickSetupAnswer | null {
  const danger = question.options.find((o) => o.danger === true && isAnswer(o.value));
  if (danger) return danger.value as QuickSetupAnswer;
  if (question.options.some((o) => o.value === true)) return true;
  return null;
}

/**
 * Final answer set for a quick setup: the setup's answers plus the preset,
 * with each explicitly opted-in optional question set to its opt-in value.
 * Optional questions the user did not opt into keep the setup's own (safe) value.
 */
export function buildQuickSetupAnswers(
  setup: QuickSetup,
  optedIn: Record<string, QuickSetupAnswer>,
): Record<string, QuickSetupAnswer> {
  const answers: Record<string, QuickSetupAnswer> = { ...setup.answers, aggressionPreset: setup.preset };
  for (const key of setup.optionalQuestionKeys) {
    const value = optedIn[key];
    if (value !== undefined) answers[key] = value;
  }
  return answers;
}
