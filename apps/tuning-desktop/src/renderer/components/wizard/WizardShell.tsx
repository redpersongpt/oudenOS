// ─── Wizard Shell ─────────────────────────────────────────────────────────────
// AME Wizard / AtlasOS-inspired: full-screen centered wizard layout.
// Each step takes the entire window. No persistent sidebar during flow.
// Navigation via bottom bar only. Clean, dark, cinematic.

import type { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, ChevronDown } from "lucide-react";
import { spring } from "@redcore/design-system";
import { useWizardStore } from "@/stores/wizard-store";
import type { WizardStepId } from "@/stores/wizard-store";
import { Button } from "@/components/ui/Button";
import { LogoMark } from "@/components/brand/Logo";
import { useEffect, useId, useRef, useState } from "react";

// ─── Step metadata ──────────────────────────────────────────────────────────

const STEP_LABELS: Record<WizardStepId, string> = {
  welcome: "Welcome",
  analysis: "System Analysis",
  profile: "Machine Profile",
  cleanup: "Windows Cleanup",
  services: "Background Services",
  performance: "Performance Tuning",
  infrastructure: "System Infrastructure",
  apphub: "App Hub",
  benchmark: "Benchmark",
  summary: "Optimization Summary",
  bios: "BIOS Guidance",
  "apply-prep": "Apply Changes",
  execution: "Applying Optimizations",
  reboot: "System Restart",
  report: "Optimization Report",
};

const NEXT_LABELS: Partial<Record<WizardStepId, string>> = {
  welcome: "Begin Optimization",
  analysis: "View Profile",
  "apply-prep": "Apply All Changes",
  report: "Finish",
};

// ─── Step Picker Dropdown ───────────────────────────────────────────────────

function StepPicker() {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const { currentStep, steps, goToStep } = useWizardStore();
  const currentIdx = steps.findIndex(s => s.id === currentStep);
  const currentLabel = STEP_LABELS[currentStep] ?? currentStep;

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={menuId}
        className="flex min-w-0 items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium text-ink-secondary transition-colors hover:bg-white/[0.06] hover:text-ink"
      >
        <span className="text-ink-tertiary">{currentIdx + 1}/{steps.length}</span>
        <span className="max-w-[11rem] truncate">{currentLabel}</span>
        <ChevronDown className={`h-3 w-3 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            id={menuId}
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 top-full z-50 mt-1 max-h-80 w-56 overflow-y-auto rounded-lg border border-white/[0.08] bg-[#1a1a1f] py-1 shadow-2xl shadow-black/40"
          >
            {steps.map((step, i) => {
              const isCompleted = step.status === "completed";
              const isCurrent = step.id === currentStep;
              const isLocked = step.status === "locked";

              return (
                <button
                  key={step.id}
                  onClick={() => { if (!isLocked) { goToStep(step.id); setOpen(false); } }}
                  disabled={isLocked}
                  className={`flex w-full items-center gap-3 px-3 py-2 text-left text-xs transition-colors ${
                    isCurrent
                      ? "bg-white/[0.08] text-neutral-100"
                      : isLocked
                        ? "text-neutral-700 cursor-not-allowed"
                        : "text-neutral-400 hover:bg-white/[0.05] hover:text-neutral-200"
                  }`}
                >
                  <span className="w-4 shrink-0 text-right font-mono text-[10px] text-neutral-600">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate">{STEP_LABELS[step.id]}</span>
                  {isCompleted && <div className="h-1.5 w-1.5 rounded-full bg-green-500/70" />}
                  {isCurrent && <div className="h-1.5 w-1.5 rounded-full bg-brand-400" />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Title Bar ──────────────────────────────────────────────────────────────

function WizardTitleBar() {
  return (
    <div className="flex h-10 shrink-0 items-center justify-between px-4 drag-region">
      <div className="flex items-center gap-2.5 no-drag">
        <LogoMark size={16} />
        <span className="text-[11px] font-medium text-neutral-500">redcore · Tuning</span>
      </div>
      <div className="no-drag">
        <StepPicker />
      </div>
      <div className="w-20" /> {/* Balance for window controls */}
    </div>
  );
}

// ─── Bottom Bar ─────────────────────────────────────────────────────────────

function WizardBottomBar() {
  const { currentStep, progress, canGoBack, canGoNext, goBack, goNext } = useWizardStore();
  const nextLabel = NEXT_LABELS[currentStep] ?? "Continue";

  // Hide bottom bar during execution
  if (currentStep === "execution") return null;

  return (
    <div className="flex h-14 shrink-0 items-center justify-between px-8">
      {/* Back */}
      {canGoBack ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={goBack}
          icon={<ArrowLeft className="h-3.5 w-3.5" />}
          className="text-neutral-500"
        >
          Back
        </Button>
      ) : (
        <div className="w-20" />
      )}

      {/* Center progress — full-width rail */}
      <div className="flex flex-1 items-center px-8">
        <div className="relative h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full bg-brand-500"
            animate={{ width: `${progress}%` }}
            transition={spring.smooth}
          />
        </div>
        <span className="ml-3 shrink-0 text-[11px] font-mono text-ink-tertiary tabular-nums">
          {progress}%
        </span>
      </div>

      {/* Next */}
      <Button
        variant="primary"
        size="md"
        onClick={goNext}
        disabled={!canGoNext}
        icon={<ArrowRight className="h-4 w-4" />}
        iconPosition="right"
      >
        {nextLabel}
      </Button>
    </div>
  );
}

// ─── Shell ──────────────────────────────────────────────────────────────────

export function WizardShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#0a0a0f]">
      {/* Title bar */}
      <WizardTitleBar />

      {/* Full-screen content — each step owns the entire area */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        {children}
      </main>

      {/* Bottom bar */}
      <WizardBottomBar />
    </div>
  );
}
