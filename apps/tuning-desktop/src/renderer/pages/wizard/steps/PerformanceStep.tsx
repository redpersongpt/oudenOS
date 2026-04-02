// Performance Step
// CPU / Power / Timer / Scheduler tuning. Machine-archetype aware intro.

import { useState } from "react";
import { motion } from "framer-motion";
import { Lock, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { useIntelligenceStore } from "@/stores/intelligence-store";
import type { RiskLevel } from "@redcore/shared-schema/tuning";

// Action definitions

interface PerfAction {
  id: string;
  name: string;
  description: string;
  risk: RiskLevel;
  tier: "free" | "premium";
  requiresReboot: boolean;
  defaultSelected: boolean;
}

const CPU_ACTIONS: PerfAction[] = [
  {
    id: "cpu.win32-priority-separation",
    name: "Win32PrioritySeparation",
    description: "Set scheduler quantum to Short/Variable 2:1 foreground boost. Gives your active game more frequent CPU slices.",
    risk: "low",
    tier: "premium",
    requiresReboot: false,
    defaultSelected: false,
  },
  {
    id: "cpu.disable-core-parking",
    name: "Disable CPU Core Parking",
    description: "Prevent Windows from powering down idle cores. Eliminates 1–5 ms wake latency when a game thread demands more cores.",
    risk: "low",
    tier: "premium",
    requiresReboot: false,
    defaultSelected: false,
  },
  {
    id: "cpu.reduce-parking-aggressiveness",
    name: "Reduce Parking Aggressiveness",
    description: "Lower the threshold at which cores get parked. A softer compromise between power savings and responsiveness.",
    risk: "low",
    tier: "free",
    requiresReboot: false,
    defaultSelected: true,
  },
  {
    id: "cpu.aggressive-boost-mode",
    name: "Aggressive Processor Boost",
    description: "Keep turbo boost sustained as long as thermals allow. Targets ~100–300 MHz higher sustained clock speed.",
    risk: "low",
    tier: "premium",
    requiresReboot: false,
    defaultSelected: false,
  },
  {
    id: "cpu.min-processor-state-100",
    name: "Minimum Processor State 100%",
    description: "Lock the CPU floor at full speed to eliminate frequency-scaling micro-stutter.",
    risk: "low",
    tier: "premium",
    requiresReboot: false,
    defaultSelected: false,
  },
];

const TIMER_ACTIONS: PerfAction[] = [
  {
    id: "cpu.disable-dynamic-tick",
    name: "Disable Dynamic Tick",
    description: "Force fixed timer interrupts via BCD. Removes up to 15 ms of timer coalescing jitter.",
    risk: "medium",
    tier: "premium",
    requiresReboot: true,
    defaultSelected: false,
  },
  {
    id: "cpu.global-timer-resolution",
    name: "Global Timer Resolution Requests",
    description: "Restore Windows 10 2003-era global timer behavior on Win 11+. Sleep(1) achieves ~1.5 ms vs ~15.6 ms default.",
    risk: "low",
    tier: "premium",
    requiresReboot: true,
    defaultSelected: false,
  },
];

const POWER_ACTIONS: PerfAction[] = [
  {
    id: "power.high-performance-plan",
    name: "High Performance Power Plan",
    description: "Switch to the High Performance plan, keeping CPU at maximum frequency during gaming.",
    risk: "safe",
    tier: "free",
    requiresReboot: false,
    defaultSelected: true,
  },
  {
    id: "power.disable-fast-startup",
    name: "Disable Fast Startup",
    description: "Disable Windows hybrid boot to ensure a full cold boot and prevent driver issues after updates.",
    risk: "safe",
    tier: "free",
    requiresReboot: false,
    defaultSelected: true,
  },
  {
    id: "power.disable-usb-selective-suspend",
    name: "Disable USB Selective Suspend",
    description: "Prevent Windows from suspending USB devices. Eliminates USB peripheral latency spikes.",
    risk: "safe",
    tier: "free",
    requiresReboot: false,
    defaultSelected: true,
  },
  {
    id: "power.disable-hibernation",
    name: "Disable Hibernation",
    description: "Remove hiberfil.sys and free disk space. Hibernation interacts poorly with kernel-level tweaks.",
    risk: "low",
    tier: "free",
    requiresReboot: false,
    defaultSelected: false,
  },
  {
    id: "power.disable-pcie-link-state-pm",
    name: "Disable PCIe Link State Power Management",
    description: "Keep PCIe lanes always active. Prevents GPU throttle stutter on link state transitions.",
    risk: "safe",
    tier: "free",
    requiresReboot: false,
    defaultSelected: true,
  },
];

// Helpers

const riskLabel: Record<RiskLevel, string> = {
  safe: "Safe", low: "Low", medium: "Medium", high: "High", extreme: "Extreme",
};

const ARCHETYPE_LABELS: Record<string, string> = {
  gaming_desktop: "Gaming Desktop",
  gaming_laptop: "Gaming Laptop",
  highend_workstation: "High-End Workstation",
  budget_desktop: "Budget Desktop",
  office_laptop: "Office Laptop",
  low_spec_system: "Low Spec System",
  vm_cautious: "Virtual Machine",
};

// Action row

function ActionRow({
  action,
  selected,
  onToggle,
}: {
  action: PerfAction;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
      className="flex items-start gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3.5 transition-colors hover:bg-white/[0.04]"
    >
      <button
        onClick={onToggle}
        className={`mt-0.5 h-4 w-4 shrink-0 rounded border transition-colors ${
          selected ? "border-brand-500 bg-brand-500" : "border-white/20 bg-transparent"
        }`}
        aria-label={selected ? "Deselect" : "Select"}
      >
        {selected && (
          <svg viewBox="0 0 10 8" fill="none" className="h-full w-full p-[2px]">
            <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-ink">{action.name}</span>
          <Badge variant="risk" risk={action.risk}>{riskLabel[action.risk]}</Badge>
          {action.requiresReboot && (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-800/60 bg-amber-900/20 px-2 py-0.5 text-[10px] font-medium text-amber-400">
              <RotateCcw className="h-2.5 w-2.5" />
              Reboot required
            </span>
          )}
          {action.tier === "premium" && (
            <span className="inline-flex items-center gap-1 rounded-full border border-brand-800 bg-brand-950/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand-400">
              <Lock className="h-2.5 w-2.5" />
              PRO
            </span>
          )}
        </div>
        <p className="mt-1 text-xs leading-relaxed text-ink-secondary">{action.description}</p>
      </div>
    </motion.div>
  );
}

// Section block

function SectionBlock({
  label,
  actions,
  selected,
  onToggle,
}: {
  label: string;
  actions: PerfAction[];
  selected: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-tertiary">
        {label}
      </p>
      <motion.div
        
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        {actions.map((action) => (
          <ActionRow
            key={action.id}
            action={action}
            selected={selected.has(action.id)}
            onToggle={() => onToggle(action.id)}
          />
        ))}
      </motion.div>
    </div>
  );
}

// Step

const ALL_ACTIONS = [...CPU_ACTIONS, ...TIMER_ACTIONS, ...POWER_ACTIONS];

function buildDefault(): Set<string> {
  return new Set(ALL_ACTIONS.filter((a) => a.defaultSelected).map((a) => a.id));
}

export function PerformanceStep() {
  const [selected, setSelected] = useState<Set<string>>(buildDefault);
  const classification = useIntelligenceStore((s) => s.classification);
  const archetype = classification?.primary ?? null;
  const archetypeLabel = archetype ? (ARCHETYPE_LABELS[archetype] ?? archetype) : null;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const rebootCount = ALL_ACTIONS.filter(
    (a) => a.requiresReboot && selected.has(a.id),
  ).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="flex min-h-full flex-col px-12 py-12"
    >
      <motion.div
        
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto w-full max-w-2xl space-y-8"
      >
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="space-y-2">
          <h1 className="text-[26px] font-bold leading-tight tracking-tight text-ink">
            Performance Tuning
          </h1>
          <p className="text-[14px] leading-relaxed text-ink-secondary max-w-lg">
            Optimize CPU scheduling, power delivery, and timer resolution for your hardware.
            {archetypeLabel && (
              <span className="ml-1 text-ink">
                Based on your <span className="font-medium">{archetypeLabel}</span> profile,
                we recommend the pre-selected actions below.
              </span>
            )}
          </p>
        </motion.div>

        {/* Sections */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="space-y-8">
          <SectionBlock
            label="CPU Optimization"
            actions={CPU_ACTIONS}
            selected={selected}
            onToggle={toggle}
          />
          <SectionBlock
            label="Timer & Latency"
            actions={TIMER_ACTIONS}
            selected={selected}
            onToggle={toggle}
          />
          <SectionBlock
            label="Power Management"
            actions={POWER_ACTIONS}
            selected={selected}
            onToggle={toggle}
          />
        </motion.div>

        {/* Summary */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/[0.06] bg-white/[0.03] px-5 py-4"
        >
          <span className="text-sm text-ink-secondary">
            <span className="font-semibold text-ink">{selected.size}</span>
            {" "}performance action{selected.size !== 1 ? "s" : ""} selected
          </span>
          <div className="flex items-center gap-2">
            {rebootCount > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-800/60 bg-amber-900/20 px-2.5 py-1 text-xs text-amber-400">
                <RotateCcw className="h-3 w-3" />
                {rebootCount} reboot{rebootCount !== 1 ? "s" : ""} required
              </span>
            )}
            <Badge variant="success">Ready to include in plan</Badge>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
