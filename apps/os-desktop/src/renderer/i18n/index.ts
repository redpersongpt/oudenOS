import { useLangStore, type Lang } from "@/stores/lang-store";
import { en } from "./en";
import { tr } from "./tr";

export type { Lang };

// Flat, dot-namespaced string maps. `en` is the source of truth and the
// fallback: any key missing from `tr` falls back to English (never to a raw
// key), so a partially-translated screen degrades gracefully instead of
// showing "wizard.bar.back".
const DICTS: Record<Lang, Record<string, string>> = { en, tr };

export type TFunction = (key: string, vars?: Record<string, string | number>) => string;

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (whole, name) =>
    name in vars ? String(vars[name]) : whole,
  );
}

/**
 * Translation hook. Subscribes to the active language so components re-render
 * when the user flips the toggle.
 *
 *   const { t, lang } = useT();
 *   <span>{t("wizard.bar.back")}</span>
 *   <span>{t("wizard.bar.progress", { value: 40 })}</span>
 */
export function useT(): { t: TFunction; lang: Lang } {
  const lang = useLangStore((s) => s.lang);
  const dict = DICTS[lang] ?? en;
  const t: TFunction = (key, vars) =>
    interpolate(dict[key] ?? en[key] ?? key, vars);
  return { t, lang };
}
