// ─── Analysis Step ────────────────────────────────────────────────────────────
// Live system scan with animated status cards per category.
// Triggers real hardware scan via IPC, stores result in device-store,
// then auto-classifies via intelligence-store.

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Cpu,
  MonitorCheck,
  MemoryStick,
  HardDrive,
  Settings2,
  Thermometer,
  CheckCircle2,
  Loader2,
  AlertCircle,
} from "lucide-react";
import {
  spring,
} from "@redcore/design-system";
import { useWizardStore } from "@/stores/wizard-store";
import { useDeviceStore } from "@/stores/device-store";
import { useIntelligenceStore } from "@/stores/intelligence-store";
import { serviceCall } from "@/lib/api";
import { ProgressBar } from "@/components/ui/ProgressBar";

// ─── Scan category config ─────────────────────────────────────────────────────

const SCAN_CATEGORIES = [
  { id: "cpu",     label: "CPU & Scheduler",  icon: Cpu,          mockDelay: 600  },
  { id: "gpu",     label: "GPU & Display",    icon: MonitorCheck, mockDelay: 1100 },
  { id: "memory",  label: "Memory & XMP",     icon: MemoryStick,  mockDelay: 1600 },
  { id: "storage", label: "Storage Health",   icon: HardDrive,    mockDelay: 2100 },
  { id: "windows", label: "Windows Config",   icon: Settings2,    mockDelay: 2600 },
  { id: "thermal", label: "Thermal Profile",  icon: Thermometer,  mockDelay: 3100 },
] as const;

type CategoryId = (typeof SCAN_CATEGORIES)[number]["id"];
type CategoryStatus = "pending" | "scanning" | "done" | "error";

// ─── Category card ────────────────────────────────────────────────────────────

interface CategoryCardProps {
  label: string;
  icon: React.ElementType;
  status: CategoryStatus;
}

function CategoryCard({ label, icon: Icon, status }: CategoryCardProps) {
  const isDone   = status === "done";
  const isActive = status === "scanning";
  const isError  = status === "error";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
      className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-all duration-300 ${
        isDone
          ? "border-green-500/20 bg-green-500/[0.04]"
          : isError
          ? "border-red-500/20 bg-red-500/[0.04]"
          : isActive
          ? "border-brand-500/30 bg-brand-500/[0.04]"
          : "border-white/[0.06] bg-white/[0.02]"
      }`}
    >
      {/* Icon */}
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors duration-300 ${
          isDone
            ? "bg-green-500/10"
            : isError
            ? "bg-red-500/10"
            : isActive
            ? "bg-brand-500/10"
            : "bg-white/[0.04]"
        }`}
      >
        <Icon
          className={`h-4 w-4 transition-colors duration-300 ${
            isDone
              ? "text-green-400"
              : isError
              ? "text-red-400"
              : isActive
              ? "text-brand-400"
              : "text-ink-tertiary"
          }`}
          strokeWidth={1.5}
        />
      </div>

      {/* Label */}
      <span
        className={`flex-1 text-sm font-medium transition-colors duration-300 ${
          isDone
            ? "text-ink-secondary"
            : isActive
            ? "text-ink"
            : isError
            ? "text-red-400"
            : "text-ink-tertiary"
        }`}
      >
        {label}
      </span>

      {/* Status icon */}
      <AnimatePresence mode="wait">
        {isDone && (
          <motion.div
            key="done"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={spring.bounce}
          >
            <CheckCircle2 className="h-4 w-4 text-green-500" strokeWidth={1.5} />
          </motion.div>
        )}
        {isActive && (
          <motion.div
            key="scanning"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Loader2 className="h-4 w-4 animate-spin text-brand-400" strokeWidth={1.5} />
          </motion.div>
        )}
        {isError && (
          <motion.div
            key="error"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={spring.bounce}
          >
            <AlertCircle className="h-4 w-4 text-red-400" strokeWidth={1.5} />
          </motion.div>
        )}
        {status === "pending" && (
          <motion.div
            key="pending"
            className="h-3 w-3 rounded-full border border-white/[0.12] bg-white/[0.04]"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Analysis Step ────────────────────────────────────────────────────────────

export function AnalysisStep() {
  const [categoryStatus, setCategoryStatus] = useState<Record<CategoryId, CategoryStatus>>(
    Object.fromEntries(SCAN_CATEGORIES.map((c) => [c.id, "pending"])) as Record<CategoryId, CategoryStatus>
  );
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanComplete, setScanComplete] = useState(false);

  const setProfile    = useDeviceStore((s) => s.setProfile);
  const setScanning   = useDeviceStore((s) => s.setScanning);
  const classify      = useIntelligenceStore((s) => s.classify);
  const setProfileId  = useWizardStore((s) => s.setMachineProfileId);
  const completeStep  = useWizardStore((s) => s.completeStep);

  const doneCount = Object.values(categoryStatus).filter((s) => s === "done").length;
  const progressPct = Math.round((doneCount / SCAN_CATEGORIES.length) * 100);

  useEffect(() => {
    let cancelled = false;
    setScanError(null);
    setScanComplete(false);
    setScanning(true);

    // Stagger mock category progress for visual feedback while real scan runs
    const timers: ReturnType<typeof setTimeout>[] = [];

    SCAN_CATEGORIES.forEach((cat) => {
      timers.push(
        setTimeout(() => {
          if (cancelled) return;
          setCategoryStatus((prev) => ({ ...prev, [cat.id]: "scanning" }));
        }, cat.mockDelay - 200)
      );
      timers.push(
        setTimeout(() => {
          if (cancelled) return;
          setCategoryStatus((prev) => ({ ...prev, [cat.id]: "done" }));
        }, cat.mockDelay)
      );
    });

    const lastDelay = Math.max(...SCAN_CATEGORIES.map((c) => c.mockDelay)) + 400;

    timers.push(
      setTimeout(async () => {
        if (cancelled) return;
        try {
          const result = await serviceCall("scan.hardware", {});
          if (cancelled) return;

          setProfile(result);
          setProfileId(result.id);
          await classify(result.id);

          if (!cancelled) {
            setScanComplete(true);
            setScanning(false);
          }
        } catch (err) {
          if (cancelled) return;
          const message = err instanceof Error ? err.message : "Scan failed";
          setScanError(message);
          setScanning(false);
        }
      }, lastDelay)
    );

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, []);

  // Auto-advance when complete
  useEffect(() => {
    if (scanComplete) {
      const t = setTimeout(() => completeStep("analysis"), 600);
      return () => clearTimeout(t);
    }
  }, [scanComplete, completeStep]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="flex min-h-full flex-col items-center justify-center px-12 py-16"
    >
      <motion.div
        
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xl space-y-8"
      >
        {/* Heading */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="space-y-2">
          <h1 className="text-[26px] font-bold leading-tight tracking-tight text-ink">
            Analyzing Your System
          </h1>
          <p className="text-[14px] leading-relaxed text-ink-secondary max-w-lg">
            We are profiling your hardware to generate machine-specific
            recommendations. This takes about 5 seconds.
          </p>
        </motion.div>

        {/* Scan category cards */}
        <motion.div  className="space-y-2.5">
          {SCAN_CATEGORIES.map((cat) => (
            <CategoryCard
              key={cat.id}
              label={cat.label}
              icon={cat.icon}
              status={categoryStatus[cat.id]}
            />
          ))}
        </motion.div>

        {/* Progress bar */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          <ProgressBar
            value={progressPct}
            variant="brand"
            size="xs"
            label="Scan progress"
            showValue
          />
        </motion.div>

        {/* Error state */}
        <AnimatePresence>
          {scanError && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/[0.04] px-4 py-3"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" strokeWidth={1.5} />
              <div>
                <p className="text-sm font-medium text-red-300">Scan failed</p>
                <p className="mt-0.5 text-xs text-red-400/80">{scanError}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Completion note */}
        <AnimatePresence>
          {scanComplete && (
            <motion.p
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center text-xs text-green-400"
            >
              Scan complete. Building your machine profile...
            </motion.p>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
