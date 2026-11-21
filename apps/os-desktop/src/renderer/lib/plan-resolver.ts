// Shared plan resolution (Plan Review step + quick setup). The Rust resolver
// (`playbook.resolve`) is the source of truth; the mock is used only in the
// non-Windows preview.

import { serviceCall } from "@/lib/service";
import { buildMockResolvedPlaybook } from "@/lib/mock-playbook";
import type { ResolvedPlaybook } from "@/stores/wizard-store";
import type { QuestionnaireAnswers } from "@/stores/decisions-store";

export interface ResolvePlanInput {
  profile: string;
  preset: string;
  /**
   * Only used by the preview mock. The service detects the build itself and
   * returns it on the resolved plan (windowsBuild); the renderer never sends one.
   */
  windowsBuild: number | null;
  answers: QuestionnaireAnswers;
  demoMode: boolean;
}

export type ResolvePlanResult = { ok: true; playbook: ResolvedPlaybook } | { ok: false; error: string | null };

export async function resolvePlan(input: ResolvePlanInput): Promise<ResolvePlanResult> {
  const params: Record<string, unknown> = {
    profile: input.profile,
    preset: input.preset,
    answers: input.answers,
  };

  const result = await serviceCall<ResolvedPlaybook>("playbook.resolve", params);
  if (result.ok) return { ok: true, playbook: result.data };
  if (input.demoMode) {
    return {
      ok: true,
      playbook: buildMockResolvedPlaybook(input.profile, input.preset, input.windowsBuild ?? undefined),
    };
  }
  return { ok: false, error: result.error || null };
}
