import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useWizardStore } from "@/stores/wizard-store";
import type { WizardStepId } from "@/stores/wizard-store";
import { platform } from "@/lib/platform";
import { LogoMark } from "@/components/brand/Logo";

const ND = { ease: [0.25, 0.1, 0.25, 1] as const };

const LABELS: Record<WizardStepId, string> = {
  welcome: "WELCOME", assessment: "ASSESSMENT", profile: "PROFILE",
  preservation: "PRESERVATION", "playbook-strategy": "STRATEGY",
  "playbook-review": "PLAN", personalization: "PERSONALIZE",
  "final-review": "REVIEW",
  execution: "APPLY", "reboot-resume": "REBOOT",
  report: "COMPLETE", donation: "SUPPORT", handoff: "NEXT STEPS",
};

const CTA: Partial<Record<WizardStepId, string>> = {
  welcome: "BEGIN", "playbook-strategy": "REVIEW",
  "playbook-review": "PERSONALIZE",
  "final-review": "APPLY", report: "NEXT STEPS", profile: "CONFIGURE",
};

const NO_BAR = new Set<WizardStepId>(["playbook-strategy", "execution", "donation", "handoff"]);

/* ── Sidebar rail — bracket-style nav, divider rows ─────────────────── */

function Rail() {
  const { currentStep, steps } = useWizardStore();
  const ci = steps.findIndex((s) => s.id === currentStep);

  return (
    <aside
      className="flex w-44 shrink-0 flex-col px-4 pt-5 pb-4"
      style={{ background: "var(--black)", borderRight: "1px solid var(--border)" }}
    >
      {/* Brand mark */}
      <div className="mb-6 flex items-center gap-2">
        <LogoMark size={16} />
        <span className="nd-label" style={{ color: "var(--accent)" }}>SETUP</span>
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
                {LABELS[step.id]}
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
  if (NO_BAR.has(currentStep) || currentStep === "execution") return null;

  return (
    <div
      className="flex h-12 shrink-0 items-center justify-between px-5"
      style={{ background: "var(--black)", borderTop: "1px solid var(--border)" }}
    >
      {canGoBack ? (
        <button
          onClick={goBack}
          className="flex items-center gap-2 nd-label transition-opacity duration-150 hover:opacity-80"
          style={{ color: "var(--text-secondary)" }}
        >
          <ArrowLeft className="h-3 w-3" /> BACK
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
        {CTA[currentStep] ?? "CONTINUE"}
        <ArrowRight className="h-3 w-3" />
      </button>
    </div>
  );
}

/* ── Title bar — minimal, --black bg ─────────────────────────────────── */

function TitleBar() {
  return (
    <div
      className="flex h-8 shrink-0 items-center justify-between px-4 drag-region"
      style={{ background: "var(--black)", borderBottom: "1px solid var(--border)" }}
    >
      <span className="nd-label-sm no-drag" style={{ color: "var(--text-disabled)" }}>
        OUDEN · OS
      </span>
      <div className="flex items-center no-drag">
        <button
          onClick={() => platform().window.minimize()}
          className="flex h-6 w-8 items-center justify-center transition-opacity duration-150 hover:opacity-80"
          style={{ color: "var(--text-disabled)" }}
          aria-label="Minimize"
        >
          <svg width="10" height="1" viewBox="0 0 10 1" fill="currentColor"><rect width="10" height="1" /></svg>
        </button>
        <button
          onClick={() => platform().window.close()}
          className="flex h-6 w-8 items-center justify-center transition-colors duration-150"
          style={{ color: "var(--text-disabled)" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--accent)"; e.currentTarget.style.color = "var(--text-display)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-disabled)"; }}
          aria-label="Close"
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

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden" style={{ background: "var(--black)" }}>
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        {!welcome && <Rail />}
        <main className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-hidden">{children}</div>
          {!welcome && <Bar />}
        </main>
      </div>
    </div>
  );
}
