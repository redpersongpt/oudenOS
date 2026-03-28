import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useWizardStore } from "@/stores/wizard-store";
import type { WizardStepId } from "@/stores/wizard-store";
import { LogoMark } from "@/components/brand/Logo";

const LABELS: Record<WizardStepId, string> = {
  welcome: "Welcome", assessment: "Assessment", profile: "Profile",
  preservation: "Preservation", "playbook-strategy": "Strategy",
  "playbook-review": "Playbook", personalization: "Personalize",
  "app-setup": "App Setup", "final-review": "Review",
  execution: "Apply", "reboot-resume": "Reboot",
  report: "Complete", donation: "Support", handoff: "Next Steps",
};

const CTA: Partial<Record<WizardStepId, string>> = {
  welcome: "Begin Assessment", "playbook-strategy": "Review Playbook",
  "playbook-review": "Personalize", "app-setup": "Review Changes",
  "final-review": "Apply Changes", report: "Next Steps",
  profile: "Configure Playbook",
};

const NO_BAR = new Set<WizardStepId>(["execution", "reboot-resume", "donation", "handoff"]);

// ── Rail ────────────────────────────────────────────────────────────────────

function Rail() {
  const { currentStep, steps } = useWizardStore();
  const ci = steps.findIndex((s) => s.id === currentStep);

  return (
    <aside className="flex w-44 shrink-0 flex-col border-r border-white/[0.05] bg-surface-raised/60 px-4 pt-5 pb-4">
      <div className="mb-7 flex items-center gap-2">
        <LogoMark size={16} />
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-tertiary">Setup</span>
      </div>

      <nav className="flex flex-1 flex-col gap-px">
        {steps.map((step, i) => {
          const cur = step.id === currentStep;
          const done = step.status === "completed" || step.status === "skipped" || i < ci;
          return (
            <div key={step.id} className="relative flex items-center gap-2.5 py-[6px] pl-1">
              {/* dot / check */}
              <div className="flex h-4 w-4 shrink-0 items-center justify-center">
                {done ? (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex h-4 w-4 items-center justify-center rounded-full bg-brand-500">
                    <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                  </motion.div>
                ) : cur ? (
                  <motion.div layoutId="rail-dot" className="h-4 w-4 rounded-full border-[2px] border-brand-500 bg-brand-500/25" transition={{ type: "spring", stiffness: 380, damping: 26 }} />
                ) : (
                  <div className="h-[5px] w-[5px] rounded-full bg-white/10" />
                )}
              </div>
              {/* label */}
              <span className={`text-[11px] font-medium leading-none ${cur ? "text-ink" : done ? "text-ink-secondary" : "text-ink-muted"}`}>
                {LABELS[step.id]}
              </span>
              {/* connector */}
              {i < steps.length - 1 && (
                <div className={`absolute left-[14px] top-[26px] h-[10px] w-px ${done ? "bg-brand-500/35" : "bg-white/[0.05]"}`} />
              )}
            </div>
          );
        })}
      </nav>

      <div className="border-t border-white/[0.05] pt-3">
        <span className="text-[9px] font-semibold uppercase tracking-[0.1em] text-ink-disabled">
          {ci + 1} / {steps.length}
        </span>
      </div>
    </aside>
  );
}

// ── Bar ─────────────────────────────────────────────────────────────────────

function Bar() {
  const { currentStep, progress, canGoBack, canGoNext, goBack, goNext } = useWizardStore();
  if (NO_BAR.has(currentStep)) return null;

  return (
    <div className="flex h-12 shrink-0 items-center justify-between border-t border-white/[0.05] bg-surface-raised/60 px-5">
      {canGoBack ? (
        <motion.button
          onClick={goBack}
          whileHover={{ x: -1 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: "spring", stiffness: 500, damping: 28 }}
          className="flex items-center gap-1 text-[11px] font-medium text-ink-tertiary hover:text-ink-secondary transition-colors"
        >
          <ArrowLeft className="h-3 w-3" /> Back
        </motion.button>
      ) : <div className="w-12" />}

      <div className="flex items-center gap-2">
        <div className="relative h-[3px] w-16 overflow-hidden rounded-full bg-white/[0.06]">
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-brand-600 to-brand-400"
            animate={{ width: `${progress}%` }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        </div>
        <span className="font-mono-metric text-[9px] text-ink-disabled">{progress}%</span>
      </div>

      <motion.button
        onClick={goNext}
        disabled={!canGoNext}
        whileHover={canGoNext ? { y: -1 } : {}}
        whileTap={canGoNext ? { scale: 0.97 } : {}}
        transition={{ type: "spring", stiffness: 500, damping: 28 }}
        className={`flex items-center gap-1.5 rounded-md px-3.5 py-[6px] text-[11px] font-bold transition-all ${
          canGoNext ? "bg-brand-500 text-white hover:bg-brand-600" : "bg-white/[0.03] text-ink-disabled cursor-not-allowed"
        }`}
      >
        {CTA[currentStep] ?? "Continue"}
        <ArrowRight className="h-3 w-3" />
      </motion.button>
    </div>
  );
}

// ── Title ───────────────────────────────────────────────────────────────────

function TitleBar() {
  const handleMinimize = () => {
    const win = window as unknown as { redcore?: { window?: { minimize: () => void } } };
    win.redcore?.window?.minimize();
  };
  const handleClose = () => {
    const win = window as unknown as { redcore?: { window?: { close: () => void } } };
    win.redcore?.window?.close();
  };

  return (
    <div className="flex h-8 shrink-0 items-center justify-between px-4 bg-surface-raised/60 drag-region border-b border-white/[0.03]">
      <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-ink-disabled no-drag">
        redcore · OS
      </span>
      <div className="flex items-center gap-1 no-drag">
        <button
          onClick={handleMinimize}
          className="flex h-5 w-7 items-center justify-center rounded-sm text-ink-muted hover:text-ink hover:bg-white/[0.06] transition-colors"
          aria-label="Minimize"
        >
          <svg width="10" height="1" viewBox="0 0 10 1" fill="currentColor"><rect width="10" height="1" /></svg>
        </button>
        <button
          onClick={handleClose}
          className="flex h-5 w-7 items-center justify-center rounded-sm text-ink-muted hover:text-white hover:bg-red-500/80 transition-colors"
          aria-label="Close"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" stroke="currentColor" strokeWidth="1.2"><line x1="1" y1="1" x2="9" y2="9"/><line x1="9" y1="1" x2="1" y2="9"/></svg>
        </button>
      </div>
    </div>
  );
}

// ── Shell ───────────────────────────────────────────────────────────────────

export function WizardShell({ children }: { children: ReactNode }) {
  const { currentStep } = useWizardStore();
  const welcome = currentStep === "welcome";

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-surface-base">
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
