import type { QuestionnaireAnswers } from "@/stores/decisions-store";
import type { ResolvedPlaybook } from "@/stores/wizard-store";
import type { StrategyQuestionContext } from "@/lib/wizard-question-model";
import { applyQuestionnaireOverrides } from "@/lib/wizard-question-model";

export function applyDecisionOverrides(
  basePlaybook: ResolvedPlaybook,
  answers: QuestionnaireAnswers,
  context?: StrategyQuestionContext,
): ResolvedPlaybook {
  return applyQuestionnaireOverrides(basePlaybook, answers, context);
}
