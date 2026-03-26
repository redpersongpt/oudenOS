// ─── Assessment Step ──────────────────────────────────────────────────────────
// Live scan screen. 7 categories with animated status cards.
// Calls window.redcore.service.call("assess.full", {}) and auto-advances.

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { useWizardStore } from "@/stores/wizard-store";
import type { DetectedProfile } from "@/stores/wizard-store";

// ─── Scan categories ──────────────────────────────────────────────────────────

interface ScanCategory {
  id: string;
  label: string;
  description: string;
}

const SCAN_CATEGORIES: ScanCategory[] = [
  { id: "windows",   label: "Windows Version",      description: "Build, edition, and patch level"    },
  { id: "packages",  label: "Installed Packages",   description: "Software inventory and bloat"       },
  { id: "startup",   label: "Startup Load",          description: "Programs that delay boot"          },
  { id: "services",  label: "Background Services",  description: "Running services and their impact"  },
  { id: "tasks",     label: "Scheduled Tasks",       description: "Recurring background operations"   },
  { id: "signals",   label: "Work Signals",          description: "Enterprise and domain indicators"  },
  { id: "vm",        label: "VM Detection",          description: "Virtualization and sandbox flags"  },
];

type ScanStatus = "pending" | "scanning" | "done";

// ─── Simulated assessment (replaces real IPC when service not present) ────────

const SCAN_INTERVAL_MS = 400;

function buildMockProfile(): DetectedProfile {
  return {
    id:          "gaming-consumer",
    label:       "Gaming Consumer",
    confidence:  88,
    isWorkPc:    false,
    machineName: "REDCORE-PC",
    signals:     ["Steam detected", "No domain join", "High-performance GPU"],
    accentColor: "text-brand-400",
  };
}

// ─── Component ───────────────────────────────────────────────────────────────

export function AssessmentStep() {
  const { completeStep, setDetectedProfile } = useWizardStore();
  const [statuses, setStatuses] = useState<Record<string, ScanStatus>>(
    Object.fromEntries(SCAN_CATEGORIES.map((c) => [c.id, "pending"]))
  );
  const [currentScanIdx, setCurrentScanIdx] = useState(-1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const started  = useRef(false);

  // Kick off simulation on mount
  useEffect(() => {
    if (started.current) return;
    started.current = true;

    // Attempt real IPC first; fall through to simulation
    const doScan = async () => {
      try {
        if (typeof window !== "undefined" && (window as unknown as { redcore?: unknown }).redcore) {
          const win = window as unknown as {
            redcore: { service: { call: (method: string, params: object) => Promise<DetectedProfile> } };
          };
          const profile = await win.redcore.service.call("assess.full", {});
          setDetectedProfile(profile);
          // Mark all as done instantly
          setStatuses(Object.fromEntries(SCAN_CATEGORIES.map((c) => [c.id, "done"])));
          setTimeout(() => completeStep("assessment"), 600);
          return;
        }
      } catch {
        // Fall through to simulation
      }

      // Simulated sequential scan
      let idx = 0;
      const step = () => {
        if (idx >= SCAN_CATEGORIES.length) {
          setDetectedProfile(buildMockProfile());
          setTimeout(() => completeStep("assessment"), 800);
          return;
        }

        const catId = SCAN_CATEGORIES[idx].id;

        // Start scanning this category
        setStatuses((prev) => ({ ...prev, [catId]: "scanning" }));
        setCurrentScanIdx(idx);

        timerRef.current = setTimeout(() => {
          // Mark done
          setStatuses((prev) => ({ ...prev, [catId]: "done" }));
          idx++;
          timerRef.current = setTimeout(step, 120);
        }, SCAN_INTERVAL_MS);
      };

      timerRef.current = setTimeout(step, 300);
    };

    doScan();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doneCount   = Object.values(statuses).filter((s) => s === "done").length;
  const progressPct = Math.round((doneCount / SCAN_CATEGORIES.length) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.22, ease: [0.0, 0.0, 0.2, 1.0] }}
      className="flex h-full flex-col items-center justify-center gap-6 px-8"
    >
      {/* Header */}
      <div className="flex flex-col items-center gap-1.5 text-center">
        <h2 className="text-lg font-semibold text-neutral-100">Assessing Your System</h2>
        <p className="text-xs text-neutral-500">
          Scanning hardware, software, and configuration signals
        </p>
      </div>

      {/* Cards grid */}
      <div className="grid w-full max-w-lg grid-cols-1 gap-1.5">
        {SCAN_CATEGORIES.map((cat, i) => {
          const status = statuses[cat.id] as ScanStatus;
          const isScanning = status === "scanning";
          const isDone     = status === "done";

          return (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.18, delay: i * 0.04, ease: [0.0, 0.0, 0.2, 1.0] }}
              className={`flex items-center gap-3 rounded-lg border px-4 py-2.5 transition-colors ${
                isScanning
                  ? "border-brand-500/30 bg-brand-500/[0.06]"
                  : isDone
                  ? "border-white/[0.06] bg-white/[0.02]"
                  : "border-white/[0.04] bg-transparent"
              }`}
            >
              {/* Status indicator */}
              <div className="flex h-5 w-5 shrink-0 items-center justify-center">
                {isDone ? (
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 340, damping: 16 }}
                  >
                    <Check className="h-3.5 w-3.5 text-success-400" />
                  </motion.div>
                ) : isScanning ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.9, ease: "linear", repeat: Infinity }}
                    className="h-3.5 w-3.5 rounded-full border-2 border-brand-500 border-t-transparent"
                  />
                ) : (
                  <div className="h-1.5 w-1.5 rounded-full bg-white/[0.12]" />
                )}
              </div>

              {/* Label */}
              <div className="flex flex-1 items-center justify-between gap-4">
                <span
                  className={`text-xs font-medium ${
                    isDone ? "text-neutral-300" : isScanning ? "text-neutral-200" : "text-neutral-600"
                  }`}
                >
                  {cat.label}
                </span>
                <span className="text-[10px] text-neutral-700">{cat.description}</span>
              </div>

              {/* Scanning pulse label */}
              {isScanning && (
                <motion.span
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.2, ease: "easeInOut", repeat: Infinity }}
                  className="shrink-0 text-[10px] font-medium text-brand-400"
                >
                  scanning
                </motion.span>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-lg">
        <div className="relative h-[3px] overflow-hidden rounded-full bg-white/[0.06]">
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full bg-brand-500"
            animate={{ width: `${progressPct}%` }}
            transition={{ type: "spring", stiffness: 280, damping: 28 }}
          />
        </div>
        <div className="mt-2 flex justify-between">
          <span className="text-[10px] text-neutral-700">
            {currentScanIdx >= 0 && currentScanIdx < SCAN_CATEGORIES.length
              ? SCAN_CATEGORIES[currentScanIdx].label
              : doneCount === SCAN_CATEGORIES.length
              ? "Complete"
              : "Preparing"}
          </span>
          <span className="font-mono-metric text-[10px] text-neutral-700">
            {doneCount}/{SCAN_CATEGORIES.length}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
