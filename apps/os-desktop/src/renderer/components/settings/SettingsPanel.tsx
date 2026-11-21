// Settings panel — modal dialog opened from the title-bar gear.
// Sections: app update, language, start over, links.

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, Check, RefreshCw, Heart, Github, Youtube, Loader2, RotateCcw } from "lucide-react";
import { platform } from "@/lib/platform";
import { useT } from "@/i18n";
import { useLangStore, type Lang } from "@/stores/lang-store";
import { useUpdateStore } from "@/stores/update-store";
import { useWizardStore } from "@/stores/wizard-store";
import { startOver } from "@/stores/session";

const DONATE_URL = "https://ouden.cc/donate";
const GITHUB_URL = "https://github.com/redpersongpt/oudenOS";
const YOUTUBE_URL = "https://www.youtube.com/@redpersonfps";

function UpdateSection() {
  const { t } = useT();
  const state = useUpdateStore((s) => s.state);
  const check = useUpdateStore((s) => s.check);
  const install = useUpdateStore((s) => s.install);
  const executing = useWizardStore((s) => s.executing);

  useEffect(() => {
    // Opening Settings runs a visible check unless one already produced a result.
    if (state.kind === "idle" || state.kind === "error") void check();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section aria-labelledby="settings-update-heading">
      <p id="settings-update-heading" className="nd-label mb-2" style={{ color: "var(--accent)" }}>{t("settings.update.heading")}</p>
      <div
        className="flex items-center justify-between gap-4 rounded-sm px-4 py-3"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        aria-live="polite"
      >
        <div className="min-w-0">
          {(state.kind === "checking" || state.kind === "idle") && (
            <p className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> {t("settings.update.checking")}
            </p>
          )}
          {state.kind === "uptodate" && (
            <>
              <p className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
                <Check className="h-3.5 w-3.5" style={{ color: "var(--success)" }} /> {t("settings.update.uptodate")}
              </p>
              <p className="nd-label-sm mt-0.5 text-[var(--text-disabled)]">v{__APP_VERSION__}</p>
            </>
          )}
          {state.kind === "available" && (
            <>
              <p className="text-sm font-medium text-[var(--text-display)]">
                {t("settings.update.available", { version: state.version })}
              </p>
              <p className="nd-label-sm mt-0.5 text-[var(--text-disabled)]">
                {executing ? t("settings.update.blockedWhileApplying") : t("settings.update.current", { version: state.current })}
              </p>
            </>
          )}
          {state.kind === "downloading" && (
            <>
              <p className="text-sm text-[var(--text-primary)]">{t("settings.update.downloading")}</p>
              <div
                className="mt-1.5 h-1 w-40 overflow-hidden rounded-full"
                style={{ background: "var(--border)" }}
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={state.percent}
              >
                <div className="h-full rounded-full transition-all" style={{ width: `${state.percent}%`, background: "var(--accent)" }} />
              </div>
            </>
          )}
          {state.kind === "error" && (
            <>
              <p className="text-sm text-[var(--text-secondary)]">{t("settings.update.error")}</p>
              <p className="nd-label-sm mt-0.5 text-[var(--text-disabled)]">v{__APP_VERSION__}</p>
            </>
          )}
        </div>

        {state.kind === "available" ? (
          <button
            onClick={() => void install()}
            disabled={executing}
            className="flex shrink-0 items-center gap-2 rounded-sm px-4 py-2 font-mono text-[12px] uppercase tracking-[0.06em] transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-40"
            style={{ background: "var(--text-display)", color: "var(--black)" }}
          >
            <Download className="h-3.5 w-3.5" /> {t("settings.update.button")}
          </button>
        ) : state.kind === "downloading" ? (
          <span className="shrink-0 font-mono text-[12px] text-[var(--text-secondary)]">{state.percent}%</span>
        ) : (
          <button
            onClick={() => void check()}
            disabled={state.kind === "checking"}
            className="flex shrink-0 items-center gap-2 rounded-sm px-3 py-2 font-mono text-[11px] uppercase tracking-[0.06em] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
            style={{ border: "1px solid var(--border)" }}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${state.kind === "checking" ? "animate-spin" : ""}`} /> {t("settings.update.recheck")}
          </button>
        )}
      </div>
    </section>
  );
}

function LanguageSection() {
  const { t, lang } = useT();
  const setLang = useLangStore((s) => s.setLang);
  const options: { id: Lang; label: string }[] = [
    { id: "en", label: "English" },
    { id: "tr", label: "Türkçe" },
  ];
  return (
    <section aria-labelledby="settings-language-heading">
      <p id="settings-language-heading" className="nd-label mb-2" style={{ color: "var(--accent)" }}>{t("settings.language.heading")}</p>
      <div className="flex gap-2" role="radiogroup" aria-labelledby="settings-language-heading">
        {options.map((o) => {
          const active = lang === o.id;
          return (
            <button
              key={o.id}
              role="radio"
              aria-checked={active}
              lang={o.id}
              onClick={() => setLang(o.id)}
              className="flex-1 rounded-sm px-4 py-2.5 text-sm font-medium transition-colors"
              style={{
                background: active ? "var(--surface-raised)" : "var(--surface)",
                border: active ? "1px solid var(--accent)" : "1px solid var(--border)",
                color: active ? "var(--text-display)" : "var(--text-secondary)",
              }}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function StartOverSection({ onDone }: { onDone: () => void }) {
  const { t } = useT();
  const executing = useWizardStore((s) => s.executing);
  const [confirming, setConfirming] = useState(false);
  return (
    <section aria-labelledby="settings-startover-heading">
      <p id="settings-startover-heading" className="nd-label mb-2" style={{ color: "var(--accent)" }}>{t("settings.startOver.heading")}</p>
      <div className="rounded-sm px-4 py-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <p className="text-[12px] text-[var(--text-secondary)]">
          {executing ? t("settings.startOver.blocked") : t("settings.startOver.body")}
        </p>
        <div className="mt-3 flex gap-2">
          {!confirming ? (
            <button
              disabled={executing}
              onClick={() => setConfirming(true)}
              className="flex items-center gap-2 rounded-sm px-3 py-2 text-[12px] text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-40"
              style={{ border: "1px solid var(--border-visible)" }}
            >
              <RotateCcw className="h-3.5 w-3.5" /> {t("settings.startOver.button")}
            </button>
          ) : (
            <>
              <button
                onClick={() => {
                  startOver();
                  onDone();
                }}
                className="rounded-sm px-3 py-2 text-[12px] font-medium"
                style={{ background: "var(--text-display)", color: "var(--black)" }}
              >
                {t("settings.startOver.confirm")}
              </button>
              <button
                onClick={() => setConfirming(false)}
                className="rounded-sm px-3 py-2 text-[12px] text-[var(--text-secondary)]"
                style={{ border: "1px solid var(--border)" }}
              >
                {t("settings.startOver.cancel")}
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function LinksSection() {
  const { t } = useT();
  const open = (url: string) => platform().shell.openExternal(url);
  return (
    <section aria-labelledby="settings-links-heading">
      <p id="settings-links-heading" className="nd-label mb-2" style={{ color: "var(--accent)" }}>{t("settings.links.heading")}</p>
      <button
        onClick={() => open(DONATE_URL)}
        className="flex w-full items-center justify-center gap-2 rounded-sm px-4 py-2.5 text-sm font-medium transition-opacity hover:opacity-85"
        style={{ background: "var(--text-display)", color: "var(--black)" }}
      >
        <Heart className="h-4 w-4" /> {t("settings.donate")}
      </button>
      <div className="mt-2 flex gap-2">
        <button
          onClick={() => open(GITHUB_URL)}
          className="flex flex-1 items-center justify-center gap-2 rounded-sm px-4 py-2.5 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
          style={{ border: "1px solid var(--border)" }}
        >
          <Github className="h-4 w-4" /> GitHub
        </button>
        <button
          onClick={() => open(YOUTUBE_URL)}
          className="flex flex-1 items-center justify-center gap-2 rounded-sm px-4 py-2.5 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
          style={{ border: "1px solid var(--border)" }}
        >
          <Youtube className="h-4 w-4" /> YouTube
        </button>
      </div>
    </section>
  );
}

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const { t } = useT();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    dialog?.querySelector<HTMLElement>(FOCUSABLE)?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      // Focus trap: Tab / Shift+Tab cycle inside the dialog.
      if (e.key === "Tab" && dialog) {
        const items = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE));
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      previouslyFocused?.focus?.();
    };
  }, [onClose]);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[1000] flex items-center justify-center p-6"
        style={{ background: "rgba(0,0,0,0.55)" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="settings-title"
          className="w-full max-w-md overflow-y-auto rounded-md p-5 scrollbar-thin"
          style={{ background: "var(--black)", border: "1px solid var(--border-visible)", maxHeight: "calc(100vh - 96px)" }}
          initial={{ opacity: 0, scale: 0.97, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 8 }}
          transition={{ duration: 0.18, ease: [0.0, 0.0, 0.2, 1.0] }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 id="settings-title" className="font-display text-[18px] text-[var(--text-display)]">{t("settings.title")}</h2>
            <button
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-sm text-[var(--text-disabled)] transition-colors hover:text-[var(--text-primary)]"
              aria-label={t("settings.close")}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-5">
            <UpdateSection />
            <LanguageSection />
            <StartOverSection onDone={onClose} />
            <LinksSection />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
