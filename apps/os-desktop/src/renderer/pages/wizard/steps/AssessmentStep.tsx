import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Check, Monitor, Package, Rocket, Server, Clock, Briefcase, Box } from "lucide-react";
import { useWizardStore } from "@/stores/wizard-store";
import type { DetectedProfile } from "@/stores/wizard-store";
import { serviceCall } from "@/lib/service";
import { useSystemAnalysis } from "@/hooks/use-system-analysis";
import { SystemAnalysisPanel } from "@/components/wizard/SystemAnalysisPanel";

const CATEGORIES = [
  { id: "windows",  label: "Windows Version",    icon: Monitor,   desc: "Build & edition" },
  { id: "packages", label: "Installed Apps",      icon: Package,   desc: "Software inventory" },
  { id: "startup",  label: "Startup Programs",    icon: Rocket,    desc: "Boot impact" },
  { id: "services", label: "Background Services", icon: Server,    desc: "Running services" },
  { id: "tasks",    label: "Scheduled Tasks",     icon: Clock,     desc: "Recurring tasks" },
  { id: "signals",  label: "Work Environment",    icon: Briefcase, desc: "Enterprise signals" },
  { id: "vm",       label: "Virtualization",      icon: Box,       desc: "VM detection" },
] as const;

type Status = "idle" | "scanning" | "done";

const DEMO_PROFILE: DetectedProfile = {
  id: "gaming_desktop",
  label: "Gaming Desktop",
  confidence: 92,
  isWorkPc: false,
  machineName: "REDCORE-PC",
  signals: ["Steam detected", "No domain join", "NVIDIA GPU", "32 GB RAM"],
  accentColor: "text-brand-400",
};

export function AssessmentStep() {
  const { completeStep, setDetectedProfile, setDemoMode } = useWizardStore();
  const [statuses, setStatuses] = useState<Record<string, Status>>(
    Object.fromEntries(CATEGORIES.map((c) => [c.id, "idle"]))
  );
  const [showAnalysis, setShowAnalysis] = useState(false);
  const started = useRef(false);
  const { state: analysisState, isRunning: analysisRunning, run: runAnalysis, toggle: toggleRec } = useSystemAnalysis();

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    let aborted = false;

    const run = async () => {
      // Try real service — assess.full + hardware scan in parallel
      setStatuses(Object.fromEntries(CATEGORIES.map((c) => [c.id, "scanning"])));

      const [assessResult, hardwareResult] = await Promise.allSettled([
        serviceCall<DetectedProfile>("assess.full"),
        serviceCall<object>("scan.hardware"),
      ]);

      if (aborted) return;

      // If assess.full succeeded, use real profile
      if (assessResult.status === "fulfilled" && assessResult.value.ok) {
        setStatuses(Object.fromEntries(CATEGORIES.map((c) => [c.id, "done"])));
        setDetectedProfile(assessResult.value.data);
        setDemoMode(false);

        // Kick off system-analyzer pipeline with hardware data if available
        if (
          hardwareResult.status === "fulfilled" &&
          hardwareResult.value.ok &&
          hardwareResult.value.data &&
          typeof hardwareResult.value.data === "object" &&
          "cpu" in hardwareResult.value.data
        ) {
          setShowAnalysis(true);
          runAnalysis(hardwareResult.value.data as Parameters<typeof runAnalysis>[0]);
        }

        setTimeout(() => { if (!aborted) completeStep("assessment"); }, 800);
        return;
      }

      // Service unavailable — demo mode with simulated scan
      setDemoMode(true);
      for (let i = 0; i < CATEGORIES.length; i++) {
        if (aborted) return;
        const id = CATEGORIES[i].id;
        setStatuses((p) => ({ ...p, [id]: "scanning" }));
        await new Promise((r) => setTimeout(r, 280));
        if (aborted) return;
        setStatuses((p) => ({ ...p, [id]: "done" }));
        await new Promise((r) => setTimeout(r, 60));
      }
      if (aborted) return;
      setDetectedProfile(DEMO_PROFILE);
      setTimeout(() => { if (!aborted) completeStep("assessment"); }, 600);
    };
    run();

    return () => { aborted = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const done = Object.values(statuses).filter((s) => s === "done").length;
  const pct = Math.round((done / CATEGORIES.length) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.22, ease: [0.0, 0.0, 0.2, 1.0] }}
      className="flex h-full flex-col items-center justify-center gap-5 px-8 py-6"
    >
      <div className="text-center">
        <h2 className="text-[17px] font-bold text-ink">Assessing Your System</h2>
        <p className="mt-1 text-[11px] text-ink-tertiary">Scanning hardware, software, and configuration</p>
      </div>

      <div className="w-full max-w-md space-y-1">
        {CATEGORIES.map((cat, i) => {
          const st = statuses[cat.id];
          const Icon = cat.icon;
          return (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${
                st === "scanning" ? "bg-brand-500/[0.06] border border-brand-500/20" :
                st === "done" ? "bg-white/[0.02] border border-white/[0.04]" :
                "border border-transparent"
              }`}
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/[0.04]">
                <Icon className={`h-3.5 w-3.5 ${st === "done" ? "text-ink-secondary" : st === "scanning" ? "text-brand-400" : "text-ink-muted"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <span className={`text-[12px] font-medium ${st === "done" ? "text-ink" : st === "scanning" ? "text-ink" : "text-ink-muted"}`}>
                  {cat.label}
                </span>
                <span className="ml-2 text-[10px] text-ink-muted">{cat.desc}</span>
              </div>
              <div className="flex h-5 w-5 items-center justify-center">
                {st === "done" ? (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 18 }}>
                    <Check className="h-3.5 w-3.5 text-success-400" strokeWidth={2.5} />
                  </motion.div>
                ) : st === "scanning" ? (
                  <div className="h-3 w-3 rounded-full border-[2px] border-brand-500 border-t-transparent animate-spin" />
                ) : null}
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="w-full max-w-md">
        <div className="relative h-[3px] overflow-hidden rounded-full bg-white/[0.05]">
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full bg-brand-500"
            animate={{ width: `${pct}%` }}
            transition={{ type: "spring", stiffness: 260, damping: 28 }}
          />
        </div>
        <div className="mt-1.5 flex justify-between">
          <span className="text-[10px] text-ink-muted">
            {done === CATEGORIES.length ? "Assessment complete" : "Scanning..."}
          </span>
          <span className="font-mono text-[10px] text-ink-disabled">{done}/{CATEGORIES.length}</span>
        </div>
      </div>

      {/* System Analyzer pipeline panel — shown when hardware scan succeeds */}
      {showAnalysis && (
        <div className="w-full max-w-md">
          <SystemAnalysisPanel
            pipelineState={analysisState}
            isRunning={analysisRunning}
            onToggleRecommendation={toggleRec}
          />
        </div>
      )}
    </motion.div>
  );
}
