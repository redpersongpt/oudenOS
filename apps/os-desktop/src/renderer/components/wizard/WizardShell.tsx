import { useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Settings } from "lucide-react";
import { useWizardStore } from "@/stores/wizard-store";
import type { WizardStepId } from "@/stores/wizard-store";
import { platform } from "@/lib/platform";
import { LogoMark } from "@/components/brand/Logo";
import { useT } from "@/i18n";
import { SettingsPanel } from "@/components/settings/SettingsPanel";

const ND = { ease: [0.25, 0.1, 0.25, 1] as const };

// Steps with a custom primary-button label (key `cta.<step>` in the dictionaries).
// Everything else uses `cta.default`. Nav labels live under `nav.<step>`.
const CTA_STEPS = new Set<WizardStepId>([
  "welcome", "playbook-strategy", "playbook-review", "final-review", "report", "profile",
]);

// Steps that render their own primary controls (no generic bottom bar).
const NO_BAR = new Set<WizardStepId>(["playbook-strategy", "execution", "reboot-resume", "donation", "handoff"]);
// Steps you can't go back from — once applied/reported, BACK must not re-enter
// execution and re-run actions.
const NO_BACK = new Set<WizardStepId>(["reboot-resume", "report", "handoff"]);

/* ── Sidebar rail — bracket-style nav, divider rows ─────────────────── */

function Rail() {
  const { currentStep, steps } = useWizardStore();
  const { t } = useT();
  // currentStep can be a side-trip not in the ordered list (donation) → clamp to
  // the end so the counter doesn't read "00 / NN" with nothing highlighted.
  const rawCi = steps.findIndex((s) => s.id === currentStep);
  const ci = rawCi < 0 ? steps.length - 1 : rawCi;

  return (
    <aside
      className="flex w-44 shrink-0 flex-col px-4 pt-5 pb-4"
      style={{ background: "var(--black)", borderRight: "1px solid var(--border)" }}
    >
      {/* Brand mark */}
      <div className="mb-6 flex items-center gap-2">
        <LogoMark size={16} />
        <span className="nd-label" style={{ color: "var(--accent)" }}>{t("rail.setup")}</span>
      </div>

      <nav className="flex flex-1 flex-col">
        {steps.map((step, i) => {
          const cur = step.id === currentStep;
          const done = step.status === "completed" || step.status === "skipped" || i < ci;
          return (
            <div
              key={step.id}
              className="flex items-center gap-3 py-1.5 pl-1"
              style={{ borderBottom: "1px solid var(--border)" }}
            >
              {/* Indicator: done=accent bar, current=white bar, pending=dim dot */}
              <div className="w-4 flex justify-center shrink-0">
                {done ? (
                  <div className="w-3 h-px" style={{ background: "var(--accent)" }} />
                ) : cur ? (
                  <motion.div
                    layoutId="rail-bar"
                    className="w-3 h-px"
                    style={{ background: "var(--text-display)" }}
                    transition={{ duration: 0.25, ease: ND.ease }}
                  />
                ) : (
                  <div className="w-1 h-px" style={{ background: "var(--border-visible)" }} />
                )}
              </div>
              <span
                className="font-mono text-label tracking-[0.08em]"
                style={{
                  color: cur ? "var(--text-display)" : done ? "var(--text-secondary)" : "var(--text-disabled)",
                }}
              >
                {t(`nav.${step.id}`)}
              </span>
            </div>
          );
        })}
      </nav>

      {/* Counter */}
      <div style={{ borderTop: "1px solid var(--border)" }} className="pt-3">
        <span className="font-mono text-label tracking-[0.08em]" style={{ color: "var(--text-disabled)" }}>
          {String(ci + 1).padStart(2, "0")} / {String(steps.length).padStart(2, "0")}
        </span>
      </div>
    </aside>
  );
}

/* ── Bottom bar — segmented progress, pill CTA ──────────────────────── */

function Bar() {
  const { currentStep, progress, canGoBack, canGoNext, goBack, goNext } = useWizardStore();
  const { t } = useT();
  if (NO_BAR.has(currentStep) || currentStep === "execution") return null;

  return (
    <div
      className="flex h-12 shrink-0 items-center justify-between px-5"
      style={{ background: "var(--black)", borderTop: "1px solid var(--border)" }}
    >
      {canGoBack && !NO_BACK.has(currentStep) ? (
        <button
          onClick={goBack}
          className="flex items-center gap-2 nd-label transition-opacity duration-150 hover:opacity-80"
          style={{ color: "var(--text-secondary)" }}
        >
          <ArrowLeft className="h-3 w-3" /> {t("bar.back")}
        </button>
      ) : <div className="w-12" />}

      {/* Segmented progress — 10 discrete blocks, 2px gaps */}
      <div className="flex items-center gap-2">
        <div className="flex gap-0.5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="w-4 h-1"
              style={{ background: i < Math.round(progress / 10) ? "var(--text-display)" : "var(--border)" }}
            />
          ))}
        </div>
        <span className="font-mono text-label tracking-[0.08em]" style={{ color: "var(--text-disabled)" }}>
          {progress}%
        </span>
      </div>

      {/* Primary button — pill, white bg, black text */}
      <button
        onClick={goNext}
        disabled={!canGoNext}
        className="flex items-center gap-2 font-mono text-[13px] uppercase tracking-[0.06em] px-5 py-1.5 transition-opacity duration-150"
        style={{
          background: canGoNext ? "var(--text-display)" : "var(--surface)",
          color: canGoNext ? "var(--black)" : "var(--text-disabled)",
          borderRadius: 999,
          opacity: canGoNext ? 1 : 0.4,
          cursor: canGoNext ? "pointer" : "not-allowed",
        }}
      >
        {CTA_STEPS.has(currentStep) ? t(`cta.${currentStep}`) : t("cta.default")}
        <ArrowRight className="h-3 w-3" />
      </button>
    </div>
  );
}

/* ── Title bar — minimal, --black bg ─────────────────────────────────── */

function TitleBar({ onOpenSettings }: { onOpenSettings: () => void }) {
  const { t } = useT();
  return (
    <div
      className="flex h-8 shrink-0 items-center justify-between px-4 drag-region"
      style={{ background: "var(--black)", borderBottom: "1px solid var(--border)" }}
    >
      <span className="nd-label-sm no-drag" style={{ color: "var(--text-disabled)" }}>
        {t("titlebar.brand")}
      </span>
      <div className="flex items-center no-drag">
        <button
          onClick={onOpenSettings}
          className="mr-0.5 flex h-6 w-8 items-center justify-center transition-opacity duration-150 hover:opacity-80"
          style={{ color: "var(--text-disabled)" }}
          aria-label={t("settings.title")}
          title={t("settings.title")}
        >
          <Settings className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => platform().window.minimize()}
          className="flex h-6 w-8 items-center justify-center transition-opacity duration-150 hover:opacity-80"
          style={{ color: "var(--text-disabled)" }}
          aria-label={t("titlebar.minimize")}
        >
          <svg width="10" height="1" viewBox="0 0 10 1" fill="currentColor"><rect width="10" height="1" /></svg>
        </button>
        <button
          onClick={() => platform().window.close()}
          className="flex h-6 w-8 items-center justify-center transition-colors duration-150"
          style={{ color: "var(--text-disabled)" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--accent)"; e.currentTarget.style.color = "var(--text-display)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-disabled)"; }}
          aria-label={t("titlebar.close")}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" stroke="currentColor" strokeWidth="1.2"><line x1="1" y1="1" x2="9" y2="9"/><line x1="9" y1="1" x2="1" y2="9"/></svg>
        </button>
      </div>
    </div>
  );
}

/* ── Shell ────────────────────────────────────────────────────────────── */

export function WizardShell({ children }: { children: ReactNode }) {
  const { currentStep } = useWizardStore();
  const welcome = currentStep === "welcome";
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden" style={{ background: "var(--black)" }}>
      <TitleBar onOpenSettings={() => setSettingsOpen(true)} />
      <div className="flex flex-1 overflow-hidden">
        {!welcome && <Rail />}
        <main className="flex flex-1 flex-col overflow-hidden min-h-0">
          {/* Step content scrolls when it's taller than the window — the rail and
              the bottom bar stay fixed. min-h-0 is required so this flex child can
              shrink below its content height and actually scroll. */}
          <div className="flex-1 min-h-0 overflow-y-auto">{children}</div>
          {!welcome && <Bar />}
        </main>
      </div>
      {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}
