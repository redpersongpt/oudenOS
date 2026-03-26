// ─── Setup Wizard Shell ──────────────────────────────────────────────────────
// Installer-style contained wizard. NOT a full-screen app canvas.
//
// Structure:
//   ┌─────────────────────────────────────────────────┐
//   │ [logo] redcore · OS Setup              [─ □ ×]  │  ← Thin title bar (drag region)
//   ├──────────┬──────────────────────────────────────┤
//   │          │                                      │
//   │  STEP    │                                      │
//   │  RAIL    │       STEP CONTENT                   │
//   │          │       (centered, contained)          │
//   │  1 ●──── │                                      │
//   │  2 ○     │                                      │
//   │  3 ○     │                                      │
//   │  ...     │                                      │
//   │          │                                      │
//   │          │                                      │
//   ├──────────┴──────────────────────────────────────┤
//   │  ‹ Back              ████░░░░       Continue ›  │  ← Installer action bar
//   └─────────────────────────────────────────────────┘
//
// This is NOT the same shell as redcore · Tuning.
// It is a compact, contained, installer-feel setup wizard.

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useWizardStore } from "@/stores/wizard-store";
import type { WizardStepId } from "@/stores/wizard-store";
import { LogoMark } from "@/components/brand/Logo";

// ─── Step metadata ──────────────────────────────────────────────────────────

const STEP_LABELS: Record<WizardStepId, string> = {
  welcome:          "Welcome",
  assessment:       "Assessment",
  profile:          "Profile",
  preservation:     "Preservation",
  "playbook-review": "Playbook",
  personalization:  "Personalization",
  "app-setup":      "App Setup",
  "final-review":   "Review",
  execution:        "Apply",
  report:           "Complete",
};

const NEXT_LABELS: Partial<Record<WizardStepId, string>> = {
  welcome:         "Begin",
  "playbook-review": "Personalize",
  "final-review":  "Apply Changes",
  report:          "Finish",
};

// ─── Step Rail ──────────────────────────────────────────────────────────────

function StepRail() {
  const { currentStep, steps } = useWizardStore();
  const currentIdx = steps.findIndex((s) => s.id === currentStep);

  return (
    <div className="flex w-[180px] shrink-0 flex-col border-r border-white/[0.06] bg-[#0c0c11] px-5 py-6">
      {/* Brand */}
      <div className="mb-8 flex items-center gap-2">
        <LogoMark size={18} />
        <span className="text-[11px] font-semibold tracking-tight text-neutral-400">
          Setup
        </span>
      </div>

      {/* Step list */}
      <nav className="flex flex-1 flex-col gap-0.5">
        {steps.map((step, i) => {
          const isCurrent = step.id === currentStep;
          const isCompleted = step.status === "completed" || step.status === "skipped";
          const isPast = i < currentIdx;
          const isFuture = i > currentIdx && !isCompleted;

          return (
            <div
              key={step.id}
              className="flex items-center gap-3 py-2"
            >
              {/* Step indicator */}
              <div className="relative flex h-5 w-5 shrink-0 items-center justify-center">
                {isCompleted || isPast ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-500"
                  >
                    <Check className="h-3 w-3 text-white" strokeWidth={2.5} />
                  </motion.div>
                ) : isCurrent ? (
                  <motion.div
                    layoutId="step-indicator"
                    className="h-5 w-5 rounded-full border-2 border-brand-500 bg-brand-500/20"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                ) : (
                  <div className="h-2 w-2 rounded-full bg-white/[0.12]" />
                )}

                {/* Connector line */}
                {i < steps.length - 1 && (
                  <div
                    className={`absolute left-[9px] top-5 h-[18px] w-[2px] rounded-full ${
                      isPast || isCompleted ? "bg-brand-500/40" : "bg-white/[0.06]"
                    }`}
                  />
                )}
              </div>

              {/* Label */}
              <span
                className={`text-[12px] font-medium transition-colors ${
                  isCurrent
                    ? "text-neutral-100"
                    : isPast || isCompleted
                    ? "text-neutral-400"
                    : "text-neutral-600"
                }`}
              >
                {STEP_LABELS[step.id]}
              </span>
            </div>
          );
        })}
      </nav>

      {/* Phase indicator */}
      <div className="mt-auto pt-4 border-t border-white/[0.06]">
        <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-neutral-600">
          Phase {currentIdx + 1} of {steps.length}
        </p>
      </div>
    </div>
  );
}

// ─── Installer Action Bar ───────────────────────────────────────────────────

function ActionBar() {
  const { currentStep, progress, canGoBack, canGoNext, goBack, goNext } =
    useWizardStore();

  const nextLabel = NEXT_LABELS[currentStep] ?? "Next";

  // Execution step owns the full content — no action bar
  if (currentStep === "execution") return null;

  return (
    <div className="flex h-[52px] shrink-0 items-center justify-between border-t border-white/[0.06] bg-[#0c0c11] px-5">
      {/* Back */}
      {canGoBack ? (
        <button
          onClick={goBack}
          className="flex items-center gap-1.5 text-[13px] font-medium text-neutral-500 hover:text-neutral-300 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </button>
      ) : (
        <div className="w-16" />
      )}

      {/* Progress */}
      <div className="flex items-center gap-3">
        <div className="relative h-1 w-24 overflow-hidden rounded-full bg-white/[0.08]">
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full bg-brand-500"
            animate={{ width: `${progress}%` }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        </div>
        <span className="text-[11px] font-mono text-neutral-600 tabular-nums">
          {progress}%
        </span>
      </div>

      {/* Next */}
      <button
        onClick={goNext}
        disabled={!canGoNext}
        className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-[13px] font-semibold transition-all ${
          canGoNext
            ? "bg-brand-500 text-white hover:bg-brand-600 shadow-sm shadow-brand-500/20"
            : "bg-white/[0.04] text-neutral-600 cursor-not-allowed"
        }`}
      >
        {nextLabel}
        {currentStep !== "report" && <ArrowRight className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

// ─── Title Bar ──────────────────────────────────────────────────────────────

function SetupTitleBar() {
  return (
    <div className="flex h-8 shrink-0 items-center px-4 bg-[#0c0c11] drag-region">
      <span className="text-[10px] font-medium text-neutral-600 tracking-tight no-drag">
        redcore · OS Setup
      </span>
    </div>
  );
}

// ─── Shell ──────────────────────────────────────────────────────────────────

export function WizardShell({ children }: { children: ReactNode }) {
  const { currentStep } = useWizardStore();
  const isWelcome = currentStep === "welcome";

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#08080d]">
      <SetupTitleBar />

      <div className="flex flex-1 overflow-hidden">
        {/* Step rail — hidden on welcome for clean hero */}
        {!isWelcome && <StepRail />}

        {/* Content area */}
        <main className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            {children}
          </div>

          {/* Action bar — inside content column, not full width */}
          {!isWelcome && <ActionBar />}
        </main>
      </div>
    </div>
  );
}
