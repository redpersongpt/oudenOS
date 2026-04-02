// BIOS Step
// Expert final layer — manual BIOS settings with per-setting guidance.
// Premium treatment: amber/gold accent, prestigious tone.

import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronRight, Info, Check, Cpu } from "lucide-react";
import {
  spring,
} from "@redcore/design-system";
import { useWizardStore } from "@/stores/wizard-store";
import { useDeviceStore } from "@/stores/device-store";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PremiumGate } from "@/components/ui/PremiumGate";

// BIOS recommendations

interface BiosRec {
  id: string;
  setting: string;
  action: string;
  why: string;
  risk: "safe" | "low" | "medium";
  location: string; // BIOS menu path hint
}

const BIOS_RECS: BiosRec[] = [
  {
    id: "fast_startup",
    setting: "Fast Startup (S-States)",
    action: "Disable",
    why: "Fast Startup can interfere with latency-sensitive drivers and cause inconsistent wake behaviour under load.",
    risk: "safe",
    location: "Advanced > Power Management > Fast Startup",
  },
  {
    id: "spread_spectrum",
    setting: "Spread Spectrum",
    action: "Disable",
    why: "Spread Spectrum introduces micro-jitter on the clock bus. Disabling it tightens timing consistency at the cost of marginal EMI compliance.",
    risk: "low",
    location: "Advanced > CPU Configuration > Spread Spectrum",
  },
  {
    id: "pcie_speed",
    setting: "PCIe Link Speed",
    action: "Set to maximum (Gen 4 or Gen 5)",
    why: "Auto-negotiation can drop PCIe lanes below their rated speed under certain initialization conditions.",
    risk: "safe",
    location: "Advanced > PCI Subsystem > PCIe Link Speed",
  },
  {
    id: "legacy_usb",
    setting: "Legacy USB Support",
    action: "Disable",
    why: "Legacy USB emulation in BIOS adds interrupt overhead that persists into OS operation. Safe to disable if you boot from a modern OS.",
    risk: "low",
    location: "Advanced > USB Configuration > Legacy USB Support",
  },
  {
    id: "rebar",
    setting: "Resizable BAR (ReBAR / SAM)",
    action: "Enable if supported",
    why: "Enables the CPU to access the full GPU VRAM in a single transaction, improving frame pacing in modern titles by 3-12%.",
    risk: "safe",
    location: "Advanced > PCI Subsystem > Resizable BAR",
  },
  {
    id: "xmp",
    setting: "XMP / EXPO Memory Profile",
    action: "Enable your rated profile",
    why: "Without XMP/EXPO, RAM runs at JEDEC default (2133 MHz or lower), leaving significant bandwidth on the table.",
    risk: "low",
    location: "Tweaker > Extreme Memory Profile (XMP) / EXPO",
  },
  {
    id: "onboard_devices",
    setting: "Unused Onboard Devices",
    action: "Disable (serial port, parallel port, unused NICs)",
    why: "Unused devices occupy IRQ lines and introduce idle interrupt traffic. Disable anything you do not actively use.",
    risk: "safe",
    location: "Advanced > Onboard Devices Configuration",
  },
];

// Single BIOS card

function BiosCard({ rec, checked, onToggle }: {
  rec: BiosRec;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
      className={`rounded-lg border p-4 transition-colors ${
        checked
          ? "border-amber-700/40 bg-amber-900/10"
          : "border-white/[0.07] bg-white/[0.04]"
      }`}
    >
      <div className="flex items-start gap-4">
        {/* Checkbox */}
        <button
          onClick={onToggle}
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
            checked
              ? "border-amber-500 bg-amber-500/20 text-amber-300"
              : "border-white/20 bg-white/[0.04] text-transparent"
          }`}
          aria-label={`Mark "${rec.setting}" as done`}
        >
          <Check className="h-3 w-3" strokeWidth={2.5} />
        </button>

        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-ink">{rec.setting}</p>
              <p className="mt-0.5 text-xs font-medium text-amber-400">{rec.action}</p>
            </div>
            <Badge variant={rec.risk === "safe" ? "success" : "warning"}>{rec.risk}</Badge>
          </div>
          <p className="text-xs leading-relaxed text-ink-secondary">{rec.why}</p>
          <p className="text-[10px] font-mono text-ink-tertiary">{rec.location}</p>
        </div>
      </div>
    </motion.div>
  );
}

// Component

export function BiosStep() {
  const { goNext, skipStep, currentStep } = useWizardStore();
  const deviceProfile = useDeviceStore((s) => s.profile);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());

  function toggleCheck(id: string) {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const doneCount = checkedIds.size;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="flex min-h-full flex-col px-10 py-12"
    >
      <motion.div
        
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl mx-auto space-y-8"
      >
        {/* Header with premium amber accent */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-tertiary">
            Step 11 — Advanced
          </p>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-[26px] font-bold tracking-tight text-ink">
                BIOS Optimization
              </h1>
              <p className="text-[14px] leading-relaxed text-ink-secondary">
                Advanced hardware-level refinements for your motherboard.
              </p>
            </div>
            <Badge variant="premium" className="shrink-0 mt-1">Expert</Badge>
          </div>
        </motion.div>

        <PremiumGate feature="bios_guidance">
          {/* Motherboard info */}
          {deviceProfile?.motherboard && (
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
              className="flex items-center gap-3 rounded-lg border border-amber-700/30 bg-amber-900/10 px-4 py-3"
            >
              <Cpu className="h-4 w-4 text-amber-400 shrink-0" strokeWidth={1.5} />
              <div>
                <p className="text-xs font-medium text-amber-300">
                  {deviceProfile.motherboard.manufacturer} {deviceProfile.motherboard.product}
                </p>
                <p className="text-[11px] text-amber-600">
                  BIOS {deviceProfile.motherboard.biosVersion} — {deviceProfile.motherboard.biosDate}
                </p>
              </div>
            </motion.div>
          )}

          {/* Info banner */}
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
            className="flex items-start gap-3 rounded-lg border border-white/[0.07] bg-white/[0.04] px-4 py-3.5"
          >
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" strokeWidth={1.5} />
            <p className="text-xs leading-relaxed text-ink-secondary">
              These are manual BIOS settings. Ouden.Tuning will guide you through each one.
              Reboot into your BIOS setup utility and work through the checklist below.
              Check each item off as you complete it.
            </p>
          </motion.div>

          {/* Progress */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="flex items-center gap-3">
            <div className="flex-1 h-1.5 rounded-full bg-white/[0.07] overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-amber-500"
                animate={{ width: `${(doneCount / BIOS_RECS.length) * 100}%` }}
                transition={spring.smooth}
              />
            </div>
            <span className="font-mono text-xs text-amber-400 shrink-0">
              {doneCount}/{BIOS_RECS.length}
            </span>
          </motion.div>

          {/* BIOS cards */}
          <motion.div
            
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            {BIOS_RECS.map((rec) => (
              <BiosCard
                key={rec.id}
                rec={rec}
                checked={checkedIds.has(rec.id)}
                onToggle={() => toggleCheck(rec.id)}
              />
            ))}
          </motion.div>

          {/* Footer note */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="rounded-lg border border-white/[0.05] bg-white/[0.02] px-4 py-3">
            <p className="text-xs text-ink-tertiary">
              You can return to this guide anytime from the main menu under Advanced Tools.
            </p>
          </motion.div>
        </PremiumGate>

        {/* CTAs */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="flex items-center justify-between gap-3">
          <Button variant="secondary" size="md" onClick={() => skipStep(currentStep)}>
            Skip BIOS Step
          </Button>
          <Button
            size="md"
            onClick={() => goNext()}
            icon={<ChevronRight className="h-4 w-4" />}
            iconPosition="right"
          >
            Continue to Prepare
          </Button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
