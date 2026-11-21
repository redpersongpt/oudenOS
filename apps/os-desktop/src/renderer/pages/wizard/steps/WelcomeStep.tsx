import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, RotateCcw, ShieldAlert } from "lucide-react";
import { useWizardStore } from "@/stores/wizard-store";
import { useRuntimeStore } from "@/stores/runtime-store";
import { platform } from "@/lib/platform";
import { undoRun, snapshotsForRun } from "@/lib/undo";
import { serviceCall } from "@/lib/service";
import { useT } from "@/i18n";

const RICKROLL_URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
const ND = { ease: [0.25, 0.1, 0.25, 1] as const };

const FEATURE_COUNT = 6;
const TAGLINE_COUNT = 4;

function LastRunCard() {
  const { t, lang } = useT();
  const lastRun = useWizardStore((s) => s.lastRun);
  const setLastRun = useWizardStore((s) => s.setLastRun);
  const [undoState, setUndoState] = useState<"idle" | "confirm" | "busy" | "done" | "error">("idle");
  const [undoMessage, setUndoMessage] = useState<string | null>(null);
  // Offer undo only when the service still holds snapshots for that run (e.g. an
  // older install's database is not imported — then there is nothing to undo).
  const [hasSnapshots, setHasSnapshots] = useState(false);
  useEffect(() => {
    if (!lastRun?.startedAt || lastRun.undone) return;
    let cancelled = false;
    void serviceCall<Array<{ id: string; createdAt: string }>>("rollback.list").then((r) => {
      if (cancelled || !r.ok || !Array.isArray(r.data)) return;
      setHasSnapshots(snapshotsForRun(r.data, lastRun.startedAt!).length > 0);
    });
    return () => { cancelled = true; };
  }, [lastRun?.startedAt, lastRun?.undone]);
  if (!lastRun) return null;

  const when = (() => {
    try {
      return new Intl.DateTimeFormat(lang === "tr" ? "tr-TR" : "en-US", { dateStyle: "medium", timeStyle: "short" })
        .format(new Date(lastRun.finishedAt));
    } catch {
      return lastRun.finishedAt;
    }
  })();

  const runUndo = async () => {
    if (!lastRun.startedAt) return;
    setUndoState("busy");
    const result = await undoRun(lastRun.startedAt, lastRun.personalizationSnapshotId);
    if (result.failed === 0) {
      setUndoState("done");
      setUndoMessage(t("undo.done", { count: result.restored }));
      setLastRun({ ...lastRun, undone: true });
    } else {
      setUndoState("error");
      setUndoMessage(t("undo.partial", { restored: result.restored, failed: result.failed }) + (result.errors[0] ? ` ${result.errors[0]}` : ""));
    }
  };

  return (
    <div
      className="mt-5 w-full max-w-sm rounded-sm px-4 py-3 text-left"
      style={{ border: "1px solid var(--border-visible)", background: "rgba(255,255,255,0.03)" }}
    >
      <p className="nd-label" style={{ color: "var(--text-display)" }}>{t("welcome.lastRun.title")}</p>
      <p className="mt-1 text-caption" style={{ color: "var(--text-secondary)" }}>
        {t("welcome.lastRun.body", { when, applied: lastRun.applied, failed: lastRun.failed })}
      </p>
      {lastRun.rebootRequiredCount > 0 && !lastRun.undone && (
        <p className="mt-1 text-caption" style={{ color: "var(--warning)" }}>
          {t("welcome.lastRun.reboot", { count: lastRun.rebootRequiredCount })}
        </p>
      )}
      {lastRun.undone ? (
        <p className="mt-2 text-caption" style={{ color: "var(--text-secondary)" }}>{t("welcome.lastRun.undone")}</p>
      ) : lastRun.startedAt && lastRun.applied > 0 && hasSnapshots ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {undoState === "confirm" ? (
            <>
              <button onClick={() => void runUndo()} className="rounded-sm px-3 py-1.5 text-[11px] font-medium" style={{ background: "var(--text-display)", color: "var(--black)" }}>
                {t("undo.confirm")}
              </button>
              <button onClick={() => setUndoState("idle")} className="rounded-sm px-3 py-1.5 text-[11px]" style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                {t("undo.cancel")}
              </button>
            </>
          ) : (
            <button
              onClick={() => setUndoState("confirm")}
              disabled={undoState === "busy"}
              className="flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-[11px] disabled:opacity-40"
              style={{ border: "1px solid var(--border-visible)", color: "var(--text-primary)" }}
            >
              <RotateCcw className="h-3 w-3" /> {undoState === "busy" ? t("undo.busy") : t("undo.button")}
            </button>
          )}
        </div>
      ) : null}
      {undoMessage && (
        <p role="status" className="mt-2 text-caption" style={{ color: undoState === "error" ? "#FF6B6B" : "var(--success)" }}>{undoMessage}</p>
      )}
    </div>
  );
}

export function WelcomeStep() {
  const { goNext } = useWizardStore();
  const { t } = useT();
  const runtime = useRuntimeStore((s) => s.status);
  const runtimeChecked = useRuntimeStore((s) => s.checked);
  const refreshRuntime = useRuntimeStore((s) => s.refresh);
  const [logoClicks, setLogoClicks] = useState(0);
  const [tagIdx, setTagIdx] = useState(0);
  const [retrying, setRetrying] = useState(false);
  const [elevateMessage, setElevateMessage] = useState<string | null>(null);

  const handleLogoClick = useCallback(() => {
    const n = logoClicks + 1;
    setLogoClicks(n);
    if (n >= 7) { setLogoClicks(0); platform().shell.openExternal(RICKROLL_URL); }
  }, [logoClicks]);

  useEffect(() => {
    void refreshRuntime();
    // Elevation is resolved asynchronously after the service starts.
    const timer = window.setTimeout(() => void refreshRuntime(), 2500);
    return () => window.clearTimeout(timer);
  }, [refreshRuntime]);

  useEffect(() => {
    const i = setInterval(() => setTagIdx((p) => (p + 1) % TAGLINE_COUNT), 4000);
    return () => clearInterval(i);
  }, []);

  const onWindows = runtime.platform === "win32";
  const serviceDown = runtimeChecked && onWindows && !runtime.running;
  const notElevated = runtimeChecked && onWindows && runtime.running && runtime.isAdmin === false;

  const retryService = async () => {
    setRetrying(true);
    await platform().service.restart();
    await refreshRuntime();
    setRetrying(false);
  };

  const relaunchElevated = async () => {
    setElevateMessage(null);
    const ok = await platform().app.relaunchAsAdmin();
    if (!ok) setElevateMessage(t("welcome.admin.declined"));
  };

  return (
    <div className="relative flex min-h-full w-full overflow-hidden" style={{ background: "var(--black)" }}>
      {/* Breathing glow behind logo — absolute, centered high */}
      <motion.div
        className="absolute pointer-events-none"
        style={{
          top: "10%",
          left: "50%",
          transform: "translateX(-50%)",
          width: 220,
          height: 220,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%)",
        }}
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Dot grid bg — subtle */}
      <div className="absolute inset-0 nd-dot-grid-subtle opacity-20 pointer-events-none" />

      {/* CSS for gradient border animation */}
      <style>{`
        @keyframes gradient-shift {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .cta-gradient-border {
          position: relative;
          padding: 1px;
          border-radius: 999px;
          background: linear-gradient(
            90deg,
            rgba(255,255,255,0.55),
            rgba(255,255,255,0.15),
            rgba(255,255,255,0.7),
            rgba(255,255,255,0.15),
            rgba(255,255,255,0.55)
          );
          background-size: 200% 200%;
          animation: gradient-shift 3.5s ease infinite;
        }
        .cta-gradient-border > button {
          border-radius: 999px;
        }
      `}</style>

      <div className="relative z-10 flex min-h-full flex-1 flex-col items-center justify-center px-6 py-8">
        {/* TERTIARY — version, top-right */}
        <motion.div
          className="absolute top-6 right-6 nd-label-sm"
          style={{ color: "var(--text-disabled)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.0, duration: 0.4, ease: ND.ease }}
        >
          {`V${__APP_VERSION__}`}
        </motion.div>

        {/* PRIMARY — Logo mark: spring scale-in first */}
        <motion.div
          onClick={handleLogoClick}
          className="mb-6 cursor-default select-none"
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 320, damping: 22, delay: 0 }}
        >
          <svg width={64} height={64} viewBox="0 0 100 100" fill="none" className="h-16 w-16">
            <motion.path
              d="M 82.14 66.08 A 32 32 0 1 1 77.1 39.9"
              stroke="var(--text-primary)"
              strokeWidth={7}
              strokeLinecap="round"
              fill="none"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.5, ease: [0.25, 0.1, 0.25, 1] }}
            />
            <motion.circle
              cx="77.1" cy="39.9" r={4}
              fill="var(--text-primary)"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.5, duration: 0.3 }}
            />
          </svg>
        </motion.div>

        {/* Doto display — slides up after logo */}
        <motion.h1
          className="font-display tracking-tight leading-none text-center"
          style={{ color: "var(--text-display)", fontSize: "clamp(2.5rem, 7vw, 4.5rem)" }}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.45, ease: ND.ease }}
        >
          Ouden
        </motion.h1>

        {/* SECONDARY — fades in after title */}
        <motion.p
          className="nd-label mt-2"
          style={{ color: "var(--text-secondary)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.35, ease: ND.ease }}
        >
          {t("welcome.os")}
        </motion.p>

        {/* Divider */}
        <motion.div
          className="w-40 mt-6 mb-5"
          style={{ height: 1, background: "var(--border-visible)" }}
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ delay: 0.6, duration: 0.4, ease: ND.ease }}
        />

        {/* Rotating tagline */}
        <div className="h-4">
          <AnimatePresence mode="wait">
            <motion.p
              key={tagIdx}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: ND.ease }}
              className="nd-label-sm"
              style={{ color: "var(--text-disabled)" }}
            >
              {t(`welcome.tagline.${tagIdx}`)}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Feature chips — stagger from left */}
        <div className="mt-6 flex max-w-md flex-wrap justify-center gap-2">
          {Array.from({ length: FEATURE_COUNT }, (_, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.65 + i * 0.07, duration: 0.3, ease: ND.ease }}
              whileHover={{ scale: 1.02, filter: "brightness(1.25)" }}
              className="px-3 py-1 font-mono text-label tracking-[0.06em] cursor-default select-none"
              style={{
                border: "1px solid var(--border-visible)",
                color: "var(--text-secondary)",
                borderRadius: 4,
                transition: "filter 150ms ease",
              }}
            >
              {t(`welcome.feature.${i}`)}
            </motion.span>
          ))}
        </div>

        {/* Preview notice (macOS / browser only — never on Windows) */}
        {runtimeChecked && !onWindows && runtime.mode !== "live" && (
          <div className="mt-5 flex max-w-sm items-start gap-3 px-4 py-3" style={{ border: "1px solid rgba(96,165,250,0.45)", background: "rgba(59,130,246,0.06)" }}>
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: "var(--text-display)" }} />
            <div>
              <p className="nd-label" style={{ color: "var(--text-display)" }}>{t("welcome.preview.title")}</p>
              <p className="mt-1 text-caption" style={{ color: "var(--text-display)" }}>
                {t("welcome.preview.body")}
              </p>
            </div>
          </div>
        )}

        {/* Service failed to start on Windows: error + Retry, never a silent demo */}
        {serviceDown && (
          <div role="alert" className="mt-5 flex max-w-sm items-start gap-3 px-4 py-3" style={{ border: "1px solid rgba(255,107,107,0.45)", background: "rgba(255,107,107,0.06)" }}>
            <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: "#FF6B6B" }} />
            <div className="min-w-0">
              <p className="nd-label" style={{ color: "var(--text-display)" }}>{t("welcome.service.title")}</p>
              <p className="mt-1 text-caption" style={{ color: "var(--text-secondary)" }}>
                {t("welcome.service.body")}
              </p>
              {runtime.startError && (
                <p className="mt-1 break-words font-mono text-[10px]" style={{ color: "var(--text-disabled)" }}>{runtime.startError}</p>
              )}
              <button
                onClick={() => void retryService()}
                disabled={retrying}
                className="mt-2 rounded-sm px-3 py-1.5 text-[11px] disabled:opacity-40"
                style={{ border: "1px solid var(--border-visible)", color: "var(--text-primary)" }}
              >
                {retrying ? t("common.retrying") : t("common.retry")}
              </button>
            </div>
          </div>
        )}

        {notElevated && (
          <div className="mt-5 flex max-w-sm items-start gap-3 px-4 py-3" style={{ border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)" }}>
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: "var(--text-display)" }} />
            <div>
              <p className="nd-label" style={{ color: "var(--text-display)" }}>{t("welcome.admin.title")}</p>
              <p className="mt-1 text-caption" style={{ color: "var(--text-display)" }}>
                {t("welcome.admin.body")}
              </p>
              <button
                onClick={() => void relaunchElevated()}
                className="mt-2 rounded-sm px-3 py-1.5 text-[11px] font-medium"
                style={{ background: "var(--text-display)", color: "var(--black)" }}
              >
                {t("welcome.admin.relaunch")}
              </button>
              {elevateMessage && <p role="status" className="mt-1 text-caption" style={{ color: "var(--text-secondary)" }}>{elevateMessage}</p>}
            </div>
          </div>
        )}

        <LastRunCard />

        {/* CTA — animated gradient border wrapper */}
        <motion.div
          className="mt-8 cta-gradient-border"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.3, ease: ND.ease }}
        >
          <button
            onClick={goNext}
            disabled={serviceDown}
            className="flex items-center gap-3 px-6 py-3 font-mono text-[13px] uppercase tracking-[0.06em] transition-opacity duration-200 hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-40"
            style={{ background: "var(--text-display)", color: "var(--black)", minHeight: 44 }}
          >
            {t("welcome.cta")}
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </button>
        </motion.div>

        {/* Tertiary footer */}
        <motion.p
          className="nd-label-sm mt-6 text-center"
          style={{ color: "var(--text-disabled)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.05, duration: 0.3, ease: ND.ease }}
        >
          {t("welcome.footer")}
        </motion.p>
      </div>
    </div>
  );
}
