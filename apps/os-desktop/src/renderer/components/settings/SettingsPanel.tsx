// Settings panel — modal overlay opened from the title-bar gear.
// Three sections: app update (status + action), language, and links
// (donate / GitHub / YouTube).

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, Check, RefreshCw, Heart, Github, Youtube, Loader2 } from "lucide-react";
import { platform } from "@/lib/platform";
import type { UpdateInfo } from "@/lib/platform";
import { useT } from "@/i18n";
import { useLangStore, type Lang } from "@/stores/lang-store";

const DONATE_URL = "https://ouden.cc/donate";
const GITHUB_URL = "https://github.com/redpersongpt/oudenOS";
const YOUTUBE_URL = "https://www.youtube.com/@redpersonfps";

type UpdateState =
  | { kind: "checking" }
  | { kind: "uptodate"; current: string }
  | { kind: "available"; current: string; version: string; notes?: string }
  | { kind: "downloading"; percent: number }
  | { kind: "error"; message: string; current: string };

function UpdateSection() {
  const { t } = useT();
  const [state, setState] = useState<UpdateState>({ kind: "checking" });

  async function runCheck() {
    setState({ kind: "checking" });
    const info: UpdateInfo = await platform().updater.check();
    if (info.error) {
      setState({ kind: "error", message: info.error, current: info.currentVersion });
    } else if (info.available && info.version) {
      setState({ kind: "available", current: info.currentVersion, version: info.version, notes: info.notes });
    } else {
      setState({ kind: "uptodate", current: info.currentVersion });
    }
  }

  useEffect(() => { void runCheck(); }, []);

  async function install() {
    setState({ kind: "downloading", percent: 0 });
    try {
      await platform().updater.downloadAndInstall((percent) =>
        setState({ kind: "downloading", percent }),
      );
      // App relaunches on success; if we get here without relaunch, re-check.
      await runCheck();
    } catch (e) {
      setState({ kind: "error", message: String(e), current: `v${__APP_VERSION__}` });
    }
  }

  return (
    <section>
      <p className="nd-label mb-2" style={{ color: "var(--accent)" }}>{t("settings.update.heading")}</p>
      <div
        className="flex items-center justify-between gap-4 rounded-sm px-4 py-3"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <div className="min-w-0">
          {state.kind === "checking" && (
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
                {t("settings.update.current", { version: state.current })}
              </p>
            </>
          )}
          {state.kind === "downloading" && (
            <>
              <p className="text-sm text-[var(--text-primary)]">{t("settings.update.downloading")}</p>
              <div className="mt-1.5 h-1 w-40 overflow-hidden rounded-full" style={{ background: "var(--border)" }}>
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
            onClick={install}
            className="flex shrink-0 items-center gap-2 rounded-sm px-4 py-2 font-mono text-[12px] uppercase tracking-[0.06em] transition-opacity hover:opacity-85"
            style={{ background: "var(--text-display)", color: "var(--black)" }}
          >
            <Download className="h-3.5 w-3.5" /> {t("settings.update.button")}
          </button>
        ) : state.kind === "downloading" ? (
          <span className="shrink-0 font-mono text-[12px] text-[var(--text-secondary)]">{state.percent}%</span>
        ) : (
          <button
            onClick={runCheck}
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
    <section>
      <p className="nd-label mb-2" style={{ color: "var(--accent)" }}>{t("settings.language.heading")}</p>
      <div className="flex gap-2">
        {options.map((o) => {
          const active = lang === o.id;
          return (
            <button
              key={o.id}
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

function LinksSection() {
  const { t } = useT();
  const open = (url: string) => platform().shell.openExternal(url);
  return (
    <section>
      <p className="nd-label mb-2" style={{ color: "var(--accent)" }}>{t("settings.links.heading")}</p>
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

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const { t } = useT();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
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
          className="w-full max-w-md overflow-y-auto rounded-md p-5 scrollbar-thin"
          style={{ background: "var(--black)", border: "1px solid var(--border-visible)", maxHeight: "calc(100vh - 96px)" }}
          initial={{ opacity: 0, scale: 0.97, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 8 }}
          transition={{ duration: 0.18, ease: [0.0, 0.0, 0.2, 1.0] }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-[18px] text-[var(--text-display)]">{t("settings.title")}</h2>
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
            <LinksSection />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
