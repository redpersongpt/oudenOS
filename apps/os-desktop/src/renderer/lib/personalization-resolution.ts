import type { QuestionnaireAnswers } from "@/stores/decisions-store";
import type { PersonalizationPreferences } from "@/stores/wizard-store";
import { getProfilePersonalizationDefaults } from "@/stores/wizard-store";

export function resolveEffectivePersonalization(
  profileId: string | null | undefined,
  preferences: PersonalizationPreferences,
  answers: QuestionnaireAnswers,
): PersonalizationPreferences {
  const defaults = getProfilePersonalizationDefaults(profileId);
  const resolved: PersonalizationPreferences = {
    ...preferences,
  };

  if (profileId === "work_pc") {
    resolved.taskbarCleanup = false;
    resolved.explorerCleanup = false;
  }

  if (profileId === "low_spec_system" || profileId === "low_spec") {
    resolved.transparency = false;
  }

  if (answers.disableTransparency === true) {
    resolved.transparency = false;
  } else if (answers.disableTransparency === false && preferences.transparency === defaults.transparency) {
    resolved.transparency = defaults.transparency;
  }

  return resolved;
}
