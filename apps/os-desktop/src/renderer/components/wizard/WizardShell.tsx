import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useWizardStore } from "@/stores/wizard-store";
import type { WizardStepId } from "@/stores/wizard-store";
import { platform } from "@/lib/platform";

const LABELS: Record<WizardStepId, string> = {
  welcome: "WELCOME", assessment: "ASSESSMENT", profile: "PROFILE",
  preservation: "PRESERVATION", "playbook-strategy": "STRATEGY",
  "playbook-review": "PLAYBOOK", personalization: "PERSONALIZE",
  "app-setup": "APP SETUP", "final-review": "REVIEW",
  execution: "APPLY", "reboot-resume": "REBOOT",
  report: "COMPLETE", donation: "SUPPORT", handoff: "NEXT STEPS",
};

const CTA: Partial<Record<WizardStepId, string>> = {
  welcome: "BEGIN", "playbook-strategy": "REVIEW PLAYBOOK",
  "playbook-review": "PERSONALIZE", "app-setup": "REVIEW",
  "final-review": "APPLY", report: "NEXT STEPS",
  profile: "CONFIGURE",
};

const NO_BAR = new Set<WizardStepId>(["execution", "reboot-resume", "donation", "handoff"]);

const ND_EASE = [0.25, 0.1, 0.25, 1] as const;

// ── Nothing-style sidebar rail ──────────────────────────────────────────

function Rail() {
  const { currentStep, steps } = useWizardStore();
  const ci = steps.findIndex((s) => s.id === currentStep);

  return (
    <aside className="flex w-44 shrink-0 flex-col border-r border-nd-border-subtle bg-nd-bg px-4 pt-5 pb-4">
      {/* Brand mark */}
      <div className="mb-6 flex items-center gap-2">
        <div className="w-4 h-4 border border-brand-500 rounded-sm flex items-center justify-center">
          <div className="w-1.5 h-1.5 bg-brand-500" />
        </div>
        <span className="nd-label text-brand-500">SETUP</span>
      </div>

      {/* Step list */}
      <nav className="flex flex-1 flex-col gap-0">
        {steps.map((step, i) => {
          const cur = step.id === currentStep;
          const done = step.status === "completed" || step.status === "skipped" || i < ci;
          return (
            <div key={step.id} className="relative flex items-center gap-3 py-1.5 pl-1">
              {/* Segment indicator */}
              <div className="flex h-4 w-4 shrink-0 items-center justify-center">
                {done ? (
                  <div className="w-3 h-0.5 bg-brand-500" />
                ) : cur ? (
                  <motion.div
                    layoutId="rail-indicator"
                    className="w-3 h-0.5 bg-nd-text-display"
                    transition={{ duration: 0.25, ease: ND_EASE }}
                  />
                ) : (
                  <div className="w-2 h-px bg-nd-border" />
                )}
              </div>
              {/* Label */}
              <span className={`font-mono text-label tracking-label leading-none ${
                cur ? "text-nd-text-display" : done ? "text-nd-text-secondary" : "text-nd-text-disabled"
              }`}>
                {LABELS[step.id]}
              </span>
            </div>
          );
        })}
      </nav>

      {/* Progress counter */}
      <div className="border-t border-nd-border-subtle pt-3">
        <span className="font-mono text-label tracking-label text-nd-text-disabled">
          {String(ci + 1).padStart(2, "0")} / {String(steps.length).padStart(2, "0")}
        </span>
      </div>
    </aside>
  );
}

// ── Nothing-style bottom bar ────────────────────────────────────────────

function Bar() {
  const { currentStep, progress, canGoBack, canGoNext, goBack, goNext } = useWizardStore();
  if (NO_BAR.has(currentStep)) return null;

  return (
    <div className="flex h-12 shrink-0 items-center justify-between border-t border-nd-border-subtle bg-nd-bg px-5">
      {canGoBack ? (
        <button
          onClick={goBack}
          className="flex items-center gap-2 nd-label text-nd-text-secondary hover:text-nd-text-primary transition-colors duration-150 ease-nd"
        >
          <ArrowLeft className="h-3 w-3" /> BACK
        </button>
      ) : <div className="w-12" />}

      {/* Segmented progress bar */}
      <div className="flex items-center gap-2">
        <div className="flex gap-px">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className={`w-4 h-1 ${i < Math.round(progress / 10) ? "bg-brand-500" : "bg-nd-border-subtle"}`}
            />
          ))}
        </div>
        <span className="font-mono text-label tracking-label text-nd-text-disabled">
          {progress}%
        </span>
      </div>

      <button
        onClick={goNext}
        disabled={!canGoNext}
        className={`flex items-center gap-2 px-4 py-1.5 rounded-sm font-mono text-label tracking-label uppercase transition-all duration-150 ease-nd ${
          canGoNext
            ? "bg-brand-500 text-nd-text-display hover:bg-brand-400"
            : "bg-nd-surface text-nd-text-disabled cursor-not-allowed"
        }`}
      >
        {CTA[currentStep] ?? "CONTINUE"}
        <ArrowRight className="h-3 w-3" />
      </button>
    </div>
  );
}

// ── Nothing-style title bar ─────────────────────────────────────────────

function TitleBar() {
  const handleMinimize = () => platform().window.minimize();
  const handleClose = () => platform().window.close();

  return (
    <div className="flex h-8 shrink-0 items-center justify-between px-4 bg-nd-bg drag-region border-b border-nd-border-subtle">
      <span className="nd-label-sm text-nd-text-disabled no-drag">
        REDCORE · OS
      </span>
      <div className="flex items-center gap-0 no-drag">
        <button
          onClick={handleMinimize}
          className="flex h-6 w-8 items-center justify-center text-nd-text-disabled hover:text-nd-text-primary hover:bg-nd-surface transition-colors duration-150 ease-nd"
          aria-label="Minimize"
        >
          <svg width="10" height="1" viewBox="0 0 10 1" fill="currentColor"><rect width="10" height="1" /></svg>
        </button>
        <button
          onClick={handleClose}
          className="flex h-6 w-8 items-center justify-center text-nd-text-disabled hover:text-nd-text-display hover:bg-brand-500 transition-colors duration-150 ease-nd"
          aria-label="Close"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" stroke="currentColor" strokeWidth="1.2"><line x1="1" y1="1" x2="9" y2="9"/><line x1="9" y1="1" x2="1" y2="9"/></svg>
        </button>
      </div>
    </div>
  );
}

// ── Shell ────────────────────────────────────────────────────────────────

export function WizardShell({ children }: { children: ReactNode }) {
  const { currentStep } = useWizardStore();
  const welcome = currentStep === "welcome";

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-nd-bg">
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        {!welcome && <Rail />}
        <main className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin">{children}</div>
          {!welcome && <Bar />}
        </main>
      </div>
    </div>
  );
}
