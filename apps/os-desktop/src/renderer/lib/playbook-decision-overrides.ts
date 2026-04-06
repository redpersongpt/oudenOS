import type { QuestionnaireAnswers } from "@/stores/decisions-store";
import type { ResolvedPlaybook } from "@/stores/wizard-store";
import type { StrategyQuestionContext } from "@/lib/wizard-question-model";

export function applyDecisionOverrides(
  basePlaybook: ResolvedPlaybook,
  answers: QuestionnaireAnswers,
  _context?: StrategyQuestionContext,
): ResolvedPlaybook {
  void answers;
  return basePlaybook;
}
