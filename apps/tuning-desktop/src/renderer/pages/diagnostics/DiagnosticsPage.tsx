// ─── Diagnostics Page ────────────────────────────────────────────────────────
// Premium multi-step system analysis and recommendation engine.
// Runs the full 6-step pipeline on the current DeviceProfile.

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, Cpu, ListChecks, TrendingUp, AlertTriangle, RefreshCw, Zap } from "lucide-react";
import { staggerContainer, staggerChild } from "@redcore/design-system";
import { runAnalysisPipeline } from "@redcore/system-analyzer";
import {
  AnalysisTimeline,
  HardwareAnalysisCard,
  SoftwareAnalysisCard,
  WorkloadAnalysisCard,
  ThermalAnalysisCard,
  NetworkAnalysisCard,
  SecurityAnalysisCard,
  RecommendationList,
  ImpactPreview,
} from "@redcore/system-analyzer/components";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { useDeviceStore } from "@/stores/device-store";
import { useAnalysisStore } from "@/stores/analysis-store";
import { serviceCall } from "@/lib/api";

// ─── Tab definitions ──────────────────────────────────────────────────────────

const TABS = [
  { id: "pipeline",    label: "Pipeline",        icon: Activity   },
  { id: "analysis",    label: "System Analysis", icon: Cpu        },
  { id: "recommend",   label: "Recommendations", icon: ListChecks },
  { id: "impact",      label: "Impact Preview",  icon: TrendingUp },
] as const;

type TabId = (typeof TABS)[number]["id"];

// ─── Profile badge ────────────────────────────────────────────────────────────

const PROFILE_LABELS: Record<string, string> = {
  gaming:   "Gaming System",
  work:     "Work Machine",
  budget:   "Budget System",
  highend:  "High-end Workstation",
  laptop:   "Laptop",
  vm:       "Virtual Machine",
};

const PROFILE_COLORS: Record<string, string> = {
  gaming:  "text-brand-400 bg-brand-500/10 border-brand-500/20",
  work:    "text-sky-400 bg-sky-500/10 border-sky-500/20",
  budget:  "text-amber-400 bg-amber-500/10 border-amber-500/20",
  highend: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  laptop:  "text-green-400 bg-green-500/10 border-green-500/20",
  vm:      "text-ink-secondary bg-white/[0.04] border-white/[0.08]",
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export function DiagnosticsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("pipeline");
  const { profile: deviceProfile, setProfile, setScanning } = useDeviceStore();
  const {
    pipeline,
    isRunning,
    setPipeline,
    setRunning,
    toggleRecommendation,
    toggleAll,
    reset,
  } = useAnalysisStore();

  const runPipeline = useCallback(async (scanFirst = false) => {
    let profile = deviceProfile;

    // If no profile yet, scan first
    if (!profile || scanFirst) {
      setScanning(true);
      try {
        profile = await serviceCall("scan.hardware", {});
        setProfile(profile);
      } catch (err) {
        console.error("[Diagnostics] Hardware scan failed:", err);
        setScanning(false);
        return;
      }
    }

    reset();
    setRunning(true);
    setActiveTab("pipeline");

    try {
      await runAnalysisPipeline(profile, setPipeline);
    } catch (err) {
      console.error("[Diagnostics] Pipeline failed:", err);
    } finally {
      setRunning(false);
    }
  }, [deviceProfile, setProfile, setScanning, reset, setRunning, setPipeline]);

  // Auto-run if we have a device profile and no results yet
  useEffect(() => {
    if (deviceProfile && pipeline.completedAt === null && !isRunning) {
      runPipeline(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceProfile]);

  // Auto-advance to analysis tab when pipeline completes
  useEffect(() => {
    if (pipeline.completedAt !== null && activeTab === "pipeline") {
      const t = setTimeout(() => setActiveTab("recommend"), 1200);
      return () => clearTimeout(t);
    }
  }, [pipeline.completedAt, activeTab]);

  const isDone = pipeline.completedAt !== null;
  const hasAnalysis = pipeline.analysis !== null;
  const profileInfo = pipeline.profile;

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={staggerChild} className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink">System Diagnostics</h1>
          <p className="mt-1 text-sm text-ink-tertiary">
            Multi-step analysis engine · 6 analyzers · prioritized recommendations
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Profile badge */}
          {profileInfo && (
            <motion.span
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`px-3 py-1.5 rounded-lg border text-[12px] font-semibold ${PROFILE_COLORS[profileInfo.primary] ?? ""}`}
            >
              {PROFILE_LABELS[profileInfo.primary] ?? profileInfo.primary} · {Math.round(profileInfo.confidence * 100)}%
            </motion.span>
          )}

          {/* Scan / Re-run button */}
          <Button
            onClick={() => runPipeline(true)}
            disabled={isRunning}
            size="sm"
            variant={deviceProfile ? "secondary" : "primary"}
            icon={<RefreshCw className={`h-3.5 w-3.5 ${isRunning ? "animate-spin" : ""}`} />}
          >
            {isRunning ? "Analyzing…" : deviceProfile ? "Re-scan" : "Scan & Analyze"}
          </Button>
        </div>
      </motion.div>

      {/* No device — prompt to scan */}
      {!deviceProfile && !isRunning && (
        <motion.div variants={staggerChild}>
          <Card>
            <CardContent>
              <div className="flex flex-col items-center gap-5 py-12 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500/10 border border-brand-500/20">
                  <Activity className="h-7 w-7 text-brand-500" strokeWidth={1.5} />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-ink">Run System Diagnostics</h2>
                  <p className="mt-1.5 max-w-sm text-sm text-ink-tertiary">
                    The diagnostic engine will scan your hardware and software configuration,
                    classify your system profile, and generate prioritized recommendations.
                  </p>
                </div>
                <Button
                  onClick={() => runPipeline(true)}
                  icon={<Zap className="h-3.5 w-3.5" />}
                >
                  Start Diagnostic
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Main content */}
      {(isRunning || isDone) && (
        <motion.div variants={staggerChild} className="space-y-4">
          {/* Tab bar */}
          <div className="flex gap-1 border-b border-border pb-0">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              const isAvailable =
                tab.id === "pipeline" ||
                (tab.id === "analysis" && hasAnalysis) ||
                ((tab.id === "recommend" || tab.id === "impact") && isDone);

              return (
                <button
                  key={tab.id}
                  onClick={() => isAvailable && setActiveTab(tab.id)}
                  disabled={!isAvailable}
                  className={`relative flex items-center gap-1.5 px-3 py-2.5 text-[12px] font-medium transition-colors ${
                    isActive
                      ? "text-ink"
                      : isAvailable
                      ? "text-ink-tertiary hover:text-ink-secondary"
                      : "text-ink-disabled cursor-not-allowed"
                  }`}
                >
                  <tab.icon className="h-3.5 w-3.5" strokeWidth={isActive ? 2 : 1.5} />
                  {tab.label}
                  {isActive && (
                    <motion.div
                      layoutId="tab-indicator"
                      className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-brand-500"
                      transition={{ type: "spring", stiffness: 500, damping: 35 }}
                    />
                  )}
                  {/* Recommendation count badge */}
                  {tab.id === "recommend" && isDone && pipeline.recommendations.length > 0 && (
                    <span className="ml-0.5 rounded-full bg-brand-500/15 px-1.5 py-0.5 text-[9px] font-bold text-brand-400">
                      {pipeline.recommendations.filter((r) => r.isEnabled).length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
            >
              {/* Pipeline Tab */}
              {activeTab === "pipeline" && (
                <Card>
                  <CardContent>
                    <AnalysisTimeline state={pipeline} />
                  </CardContent>
                </Card>
              )}

              {/* System Analysis Tab */}
              {activeTab === "analysis" && hasAnalysis && pipeline.analysis && (
                <div className="grid grid-cols-2 gap-4">
                  <HardwareAnalysisCard analysis={pipeline.analysis.hardware} delay={0} />
                  <SoftwareAnalysisCard analysis={pipeline.analysis.software} delay={0.04} />
                  <WorkloadAnalysisCard analysis={pipeline.analysis.workload} delay={0.08} />
                  <ThermalAnalysisCard  analysis={pipeline.analysis.thermal}  delay={0.12} />
                  <NetworkAnalysisCard  analysis={pipeline.analysis.network}  delay={0.16} />
                  <SecurityAnalysisCard analysis={pipeline.analysis.security} delay={0.20} />
                </div>
              )}

              {/* Recommendations Tab */}
              {activeTab === "recommend" && isDone && (
                <Card>
                  <CardContent>
                    {/* Safety check banner */}
                    {pipeline.safetyCheck && !pipeline.safetyCheck.passed && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-4 rounded-lg border border-red-500/20 bg-red-500/[0.04] px-4 py-3"
                      >
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" strokeWidth={1.5} />
                          <div>
                            <p className="text-sm font-medium text-red-300">Safety check failed</p>
                            <ul className="mt-1 space-y-0.5">
                              {pipeline.safetyCheck.blockers.map((b, i) => (
                                <li key={i} className="text-xs text-red-400/80">{b}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* Safety warnings */}
                    {pipeline.safetyCheck && pipeline.safetyCheck.warnings.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-4 rounded-lg border border-amber-500/20 bg-amber-500/[0.04] px-4 py-3"
                      >
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" strokeWidth={1.5} />
                          <div>
                            <p className="text-sm font-medium text-amber-300">Heads up</p>
                            <ul className="mt-1 space-y-0.5">
                              {pipeline.safetyCheck.warnings.map((w, i) => (
                                <li key={i} className="text-xs text-amber-400/70">{w}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    <RecommendationList
                      recommendations={pipeline.recommendations}
                      onToggle={toggleRecommendation}
                      onToggleAll={toggleAll}
                    />
                  </CardContent>
                </Card>
              )}

              {/* Impact Preview Tab */}
              {activeTab === "impact" && isDone && (
                <ImpactPreview estimates={pipeline.impactEstimates} />
              )}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      )}
    </motion.div>
  );
}
