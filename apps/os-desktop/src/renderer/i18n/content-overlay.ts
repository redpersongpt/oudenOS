// Data overlays for content that arrives from the service (Windows) or the
// bundled fallback (demo): the questionnaire schema and the playbook actions.
// Rather than editing every question/action, we keep Turkish strings in
// key-addressed maps and overlay them at render time. Source-agnostic: works
// whether the content came over IPC or from a fallback JSON.

import { useMemo } from "react";
import { useLangStore, type Lang } from "@/stores/lang-store";
import type { QuestionnaireSchema } from "@/lib/wizard-question-model";
import questionnaireTrRaw from "@/lib/questionnaire-tr.json";
import playbookTrRaw from "@/lib/playbook-tr.json";

interface QChapterTr { title?: string; description?: string }
interface QQuestionTr { label?: string; title?: string; desc?: string; note?: string }
interface QOptionTr { title?: string; desc?: string; badge?: string }
interface QuestionnaireTr {
  meta?: { title?: string; shortDescription?: string; description?: string; details?: string };
  chapters?: Record<string, QChapterTr>;
  questions?: Record<string, QQuestionTr>;
  options?: Record<string, QOptionTr>;
}
const questionnaireTr = questionnaireTrRaw as QuestionnaireTr;

interface ActionTr { name?: string; description?: string; warningMessage?: string }
const playbookTr = playbookTrRaw as Record<string, ActionTr>;

const pick = <T,>(localized: T | undefined | null, fallback: T): T =>
  localized === undefined || localized === null || localized === "" ? fallback : localized;

/** Overlay Turkish onto a resolved questionnaire schema. Returns it unchanged for English. */
export function localizeQuestionnaire(
  schema: QuestionnaireSchema | null,
  lang: Lang,
): QuestionnaireSchema | null {
  if (lang !== "tr" || !schema) return schema;
  const o = questionnaireTr;
  return {
    ...schema,
    title: pick(o.meta?.title, schema.title),
    shortDescription: pick(o.meta?.shortDescription, schema.shortDescription),
    description: pick(o.meta?.description, schema.description),
    details: pick(o.meta?.details, schema.details),
    chapters: schema.chapters.map((c) => {
      const co = o.chapters?.[c.id];
      return {
        ...c,
        title: pick(co?.title, c.title),
        description: pick(co?.description, c.description),
        questions: c.questions.map((q) => {
          const qo = o.questions?.[q.key];
          return {
            ...q,
            label: pick(qo?.label, q.label),
            title: pick(qo?.title, q.title),
            desc: pick(qo?.desc, q.desc),
            note: pick(qo?.note, q.note ?? null),
            options: q.options.map((opt) => {
              const oo = o.options?.[`${q.key}::${String(opt.value)}`];
              return {
                ...opt,
                title: pick(oo?.title, opt.title),
                desc: pick(oo?.desc, opt.desc),
                badge: pick(oo?.badge, opt.badge ?? null),
              };
            }),
          };
        }),
      };
    }),
  };
}

/** Overlay Turkish onto a single playbook action (matched by id). */
export function localizeAction<
  T extends { id: string; name?: string; description?: string; warningMessage?: string | null },
>(action: T, lang: Lang): T {
  if (lang !== "tr" || !action) return action;
  const a = playbookTr[action.id];
  if (!a) return action;
  return {
    ...action,
    name: pick(a.name, action.name as string),
    description: pick(a.description, action.description as string),
    warningMessage: pick(a.warningMessage, (action.warningMessage ?? null) as string),
  };
}

/** Hook: localized questionnaire that re-renders when the language toggles. */
export function useLocalizedQuestionnaire(schema: QuestionnaireSchema | null): QuestionnaireSchema | null {
  const lang = useLangStore((s) => s.lang);
  return useMemo(() => localizeQuestionnaire(schema, lang), [schema, lang]);
}

/** Hook returning a stable per-action localizer bound to the active language. */
export function useActionLocalizer(): <
  T extends { id: string; name?: string; description?: string; warningMessage?: string | null },
>(action: T) => T {
  const lang = useLangStore((s) => s.lang);
  return useMemo(() => <T extends { id: string; name?: string; description?: string; warningMessage?: string | null }>(action: T) => localizeAction(action, lang), [lang]);
}
