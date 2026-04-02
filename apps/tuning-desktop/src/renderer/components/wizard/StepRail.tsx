// Step Rail
// Left navigation rail for the wizard shell.
// Groups steps by category with animated status indicators.

import { motion, AnimatePresence } from "framer-motion";
import { Check, Minus } from "lucide-react";
import { LogoMark } from "@/components/brand/Logo";
import { spring, staggerContainer, staggerChild } from "@redcore/design-system";
import {
  useWizardStore,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
} from "@/stores/wizard-store";
import type { WizardStep, WizardCategory } from "@/stores/wizard-store";
import { useDeviceStore } from "@/stores/device-store";

// Step indicator

function StepIndicator({ status }: { status: WizardStep["status"] }) {
  if (status === "completed") {
    return (
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={spring.bounce}
        className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-green-500"
      >
        <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
      </motion.div>
    );
  }

  if (status === "current") {
    return (
      <div className="relative flex h-4 w-4 shrink-0 items-center justify-center">
        <motion.div
          className="absolute inset-0 rounded-full bg-brand-500/30"
          animate={{ scale: [1, 1.6, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="h-2.5 w-2.5 rounded-full bg-brand-500" />
      </div>
    );
  }

  if (status === "skipped") {
    return (
      <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-yellow-500/40 bg-yellow-500/20">
        <Minus className="h-2 w-2 text-yellow-500" strokeWidth={2.5} />
      </div>
    );
  }

  // locked
  return (
    <div className="h-4 w-4 shrink-0 rounded-full border border-neutral-700 bg-neutral-800" />
  );
}

// Single step row

interface StepRowProps {
  step: WizardStep;
  onNavigate: (id: WizardStep["id"]) => void;
}

function StepRow({ step, onNavigate }: StepRowProps) {
  const isCurrent = step.status === "current";
  const isClickable = step.status === "completed" || step.status === "current";

  const labelClass =
    isCurrent
      ? "text-neutral-200 font-semibold"
      : step.status === "completed"
      ? "text-neutral-500"
      : step.status === "skipped"
      ? "text-yellow-500/60"
      : "text-neutral-700";

  return (
    <motion.div variants={staggerChild}>
      <button
        type="button"
        disabled={!isClickable}
        onClick={() => isClickable && onNavigate(step.id)}
        className={`group relative flex w-full items-center gap-2.5 rounded-md py-1.5 pl-3 pr-2 text-left transition-colors ${
          isCurrent ? "bg-white/[0.04]" : "hover:bg-white/[0.02]"
        } disabled:pointer-events-none`}
      >
        {/* Accent left border for current step */}
        <AnimatePresence>
          {isCurrent && (
            <motion.div
              layoutId="step-rail-accent"
              className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full bg-brand-500"
              transition={spring.smooth}
            />
          )}
        </AnimatePresence>

        <StepIndicator status={step.status} />

        <span className={`text-xs transition-colors duration-200 ${labelClass}`}>
          {step.label}
        </span>
      </button>
    </motion.div>
  );
}

// Category group

interface CategoryGroupProps {
  category: WizardCategory;
  steps: WizardStep[];
  onNavigate: (id: WizardStep["id"]) => void;
}

function CategoryGroup({ category, steps, onNavigate }: CategoryGroupProps) {
  return (
    <div>
      <p className="mb-1.5 mt-4 text-[10px] font-semibold uppercase tracking-widest text-neutral-600 px-3 first:mt-0">
        {CATEGORY_LABELS[category]}
      </p>
      <motion.div variants={staggerContainer} initial="hidden" animate="visible">
        {steps.map((step) => (
          <StepRow key={step.id} step={step} onNavigate={onNavigate} />
        ))}
      </motion.div>
    </div>
  );
}

// Machine identity mini

function MachineIdentityMini() {
  const profile = useDeviceStore((s) => s.profile);

  if (!profile) return null;

  const hostname = profile.hostname ?? "Your Machine";
  const arch = profile.cpu?.microarchitecture ?? "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring.smooth}
      className="mb-4 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2.5"
    >
      <p className="truncate text-xs font-semibold text-neutral-300">{hostname}</p>
      {arch && (
        <p className="mt-0.5 truncate text-[10px] text-neutral-600">{arch}</p>
      )}
    </motion.div>
  );
}

// Step Rail

export function StepRail() {
  const steps = useWizardStore((s) => s.steps);
  const goToStep = useWizardStore((s) => s.goToStep);

  const stepsByCategory = CATEGORY_ORDER.reduce<Record<WizardCategory, WizardStep[]>>(
    (acc, cat) => {
      acc[cat] = steps.filter((s) => s.category === cat);
      return acc;
    },
    { discover: [], optimize: [], validate: [], advanced: [], execute: [] }
  );

  return (
    <div className="flex h-full flex-col overflow-hidden bg-neutral-950">
      {/* Brand mark */}
      <div className="flex h-14 shrink-0 items-center gap-2.5 px-4 drag-region">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center">
          <LogoMark size={22} />
        </div>
        <div>
          <p className="text-xs font-bold tracking-tight text-neutral-300 no-drag">
            Ouden<span className="font-normal text-neutral-600">.Tuning</span>
          </p>
          <p className="text-[9px] uppercase tracking-widest text-neutral-600 no-drag">
            Wizard
          </p>
        </div>
      </div>

      {/* Scrollable step list */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 pb-4">
        <MachineIdentityMini />

        {CATEGORY_ORDER.map((cat) => (
          <CategoryGroup
            key={cat}
            category={cat}
            steps={stepsByCategory[cat]}
            onNavigate={goToStep}
          />
        ))}
      </div>
    </div>
  );
}
