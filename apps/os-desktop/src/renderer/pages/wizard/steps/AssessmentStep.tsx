import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWizardStore } from "@/stores/wizard-store";
import type { DetectedProfile } from "@/stores/wizard-store";

const SCAN_QUOTES = [
  "READING SYSTEM MANIFEST...",
  "CATALOGING INSTALLED PACKAGES...",
  "CHECKING ENTERPRISE SIGNALS...",
  "EVALUATING BLOAT LEVELS...",
  "SCANNING SERVICE REGISTRY...",
  "DETECTING VIRTUALIZATION...",
  "MEASURING STARTUP IMPACT...",
  "ANALYZING CONFIGURATION STATE...",
];

const CATEGORIES = [
  { id: "windows",  label: "WINDOWS VERSION",     desc: "BUILD & EDITION" },
  { id: "packages", label: "INSTALLED APPS",       desc: "SOFTWARE INVENTORY" },
  { id: "startup",  label: "STARTUP PROGRAMS",     desc: "BOOT IMPACT" },
  { id: "services", label: "BACKGROUND SERVICES",  desc: "RUNNING SERVICES" },
  { id: "tasks",    label: "SCHEDULED TASKS",       desc: "RECURRING TASKS" },
  { id: "signals",  label: "WORK ENVIRONMENT",      desc: "ENTERPRISE SIGNALS" },
  { id: "vm",       label: "VIRTUALIZATION",         desc: "VM DETECTION" },
] as const;

type Status = "idle" | "scanning" | "done";

const DEMO_PROFILE: DetectedProfile = {
  id: "gaming_desktop", label: "Gaming Desktop", confidence: 92,
  isWorkPc: false, machineName: "OUDEN-PC",
  signals: ["Steam detected", "No domain join", "NVIDIA GPU", "32 GB RAM"],
  accentColor: "text-[var(--accent)]", windowsBuild: 22631,
};

const PROFILE_LABELS: Record<string, string> = {
  gaming_desktop: "Gaming Desktop", budget_desktop: "Budget Desktop",
  highend_workstation: "High-end Workstation", office_laptop: "Office Laptop",
  gaming_laptop: "Gaming Laptop", low_spec_system: "Low-spec System",
  vm_cautious: "Virtual Machine", work_pc: "Work PC",
};

const ND_EASE = [0.25, 0.1, 0.25, 1] as const;

// ── Helpers (unchanged logic) ───────────────────────────────────────────

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}
function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
function readInt(value: unknown): number | null {
  const num = readNumber(value);
  if (num !== null) return Math.trunc(num);
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}
function readBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}
function normalizeConfidence(value: unknown): number {
  const num = readNumber(value);
  if (num === null) return 80;
  return num <= 1 ? Math.round(num * 100) : Math.round(num);
}
function normalizeSignals(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((entry) => {
      if (typeof entry === "string") return entry;
      if (isObject(entry)) {
        return readString(entry.factor) ?? readString(entry.detail) ?? readString(entry.indicator) ?? readString(entry.value) ?? null;
      }
      return null;
    }).filter((entry): entry is string => Boolean(entry));
  }
  if (isObject(value)) {
    return Object.entries(value)
      .filter(([, v]) => v !== null && v !== undefined && v !== false)
      .map(([key, v]) => (typeof v === "string" || typeof v === "number" || typeof v === "boolean") ? `${key}: ${String(v)}` : key);
  }
  return [];
}
function deriveSignalsFromAssessment(assessment: Record<string, unknown>, isWorkPc: boolean): string[] {
  const signals: string[] = [];
  const hardware = isObject(assessment.hardware) ? assessment.hardware : {};
  const workSignals = isObject(assessment.workSignals) ? assessment.workSignals : {};
  const cpu = isObject(hardware.cpu) ? hardware.cpu : {};
  const gpuValue = hardware.gpu;
  const firstGpu = Array.isArray(gpuValue) ? gpuValue[0] : gpuValue;
  const gpu = isObject(firstGpu) ? firstGpu : {};
  const gpuName = readString(gpu.Name) ?? readString(gpu.name);
  if (gpuName) signals.push(`${gpuName} detected`);
  const ramGb = readNumber(hardware.ramGb);
  if (ramGb !== null) signals.push(`${Math.round(ramGb)} GB RAM`);
  const domainJoined = readBoolean(workSignals.domainJoined);
  if (domainJoined === true) signals.push("Domain joined");
  if (domainJoined === false) signals.push("No domain join");
  const cpuCores = readNumber(cpu.NumberOfCores) ?? readNumber(cpu.cores);
  if (cpuCores !== null) signals.push(`${Math.round(cpuCores)}-core CPU`);
  if (isWorkPc) signals.push("Enterprise safeguards enabled");
  return signals.slice(0, 6);
}
function readWindowsBuild(assessmentValue: Record<string, unknown>): number {
  const hardware = isObject(assessmentValue.hardware) ? assessmentValue.hardware : {};
  const windows = isObject(assessmentValue.windows) ? assessmentValue.windows : {};
  return readInt(hardware.windowsBuild) ?? readInt(assessmentValue.windowsBuild) ?? readInt(windows.buildNumber) ?? 22631;
}
function normalizeDetectedProfileFromService(assessmentValue: unknown, classificationValue?: unknown): DetectedProfile | null {
  if (!isObject(assessmentValue)) return null;
  if (typeof assessmentValue.label === "string" && Array.isArray(assessmentValue.signals)) {
    return {
      id: readString(assessmentValue.id) ?? "gaming_desktop",
      label: readString(assessmentValue.label) ?? "Gaming Desktop",
      confidence: normalizeConfidence(assessmentValue.confidence),
      isWorkPc: readBoolean(assessmentValue.isWorkPc) ?? false,
      machineName: readString(assessmentValue.machineName) ?? "OUDEN-PC",
      signals: normalizeSignals(assessmentValue.signals),
      accentColor: readString(assessmentValue.accentColor) ?? "text-[var(--accent)]",
      windowsBuild: readWindowsBuild(assessmentValue),
    };
  }
  const classification = isObject(classificationValue) ? classificationValue : {};
  const hardware = isObject(assessmentValue.hardware) ? assessmentValue.hardware : {};
  const workIndicators = isObject(assessmentValue.workIndicators) ? assessmentValue.workIndicators : {};
  const workSignals = isObject(assessmentValue.workSignals) ? assessmentValue.workSignals : {};
  const profileId = readString(classification.primary) ?? "gaming_desktop";
  const isWorkPc = profileId === "work_pc" || readBoolean(workIndicators.isWorkPc) === true || readBoolean(workSignals.domainJoined) === true;
  const machineName = readString(hardware.hostname) ?? readString(assessmentValue.machineName) ?? readString(assessmentValue.hostname) ?? "OUDEN-PC";
  const signals = [...normalizeSignals(classification.signals), ...normalizeSignals(workIndicators.indicators), ...deriveSignalsFromAssessment(assessmentValue, isWorkPc)];
  return {
    id: profileId,
    label: PROFILE_LABELS[profileId] ?? profileId.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    confidence: normalizeConfidence(classification.confidence), isWorkPc, machineName,
    signals: Array.from(new Set(signals)).slice(0, 6),
    accentColor: "text-[var(--accent)]", windowsBuild: readWindowsBuild(assessmentValue),
  };
}

// ── Component ───────────────────────────────────────────────────────────

export function AssessmentStep() {
  const { completeStep, setDetectedProfile, setDemoMode, setStepReady } = useWizardStore();
  const [statuses, setStatuses] = useState<Record<string, Status>>(
    Object.fromEntries(CATEGORIES.map((c) => [c.id, "idle"]))
  );
  const started = useRef(false);

  useEffect(() => {
    setStepReady("assessment", false);
    if (started.current) return;
    started.current = true;
    let aborted = false;

    const run = async () => {
      const { serviceCall } = await import("@/lib/service");
      setStatuses(Object.fromEntries(CATEGORIES.map((c) => [c.id, "scanning"])));
      const assessResult = await serviceCall<unknown>("assess.full");
      if (aborted) return;
      if (assessResult.ok) {
        const assessment = assessResult.data;
        const assessmentId = isObject(assessment) ? readString(assessment.id) : null;
        const classifyParams = assessmentId ? { assessmentId } : { assessment };
        const classificationResult = await serviceCall<unknown>("classify.machine", classifyParams);
        if (aborted) return;
        const detectedProfile = normalizeDetectedProfileFromService(assessment, classificationResult.ok ? classificationResult.data : undefined);
        if (detectedProfile) {
          setStatuses(Object.fromEntries(CATEGORIES.map((c) => [c.id, "done"])));
          setDetectedProfile(detectedProfile);
          setDemoMode(false);
          setTimeout(() => { if (!aborted) completeStep("assessment"); }, 800);
          return;
        }
      }
      setDemoMode(true);
      for (let i = 0; i < CATEGORIES.length; i++) {
        if (aborted) return;
        setStatuses((p) => ({ ...p, [CATEGORIES[i].id]: "scanning" }));
        await new Promise((r) => setTimeout(r, 280));
        if (aborted) return;
        setStatuses((p) => ({ ...p, [CATEGORIES[i].id]: "done" }));
        await new Promise((r) => setTimeout(r, 60));
      }
      if (aborted) return;
      setDetectedProfile(DEMO_PROFILE);
      setTimeout(() => { if (!aborted) completeStep("assessment"); }, 600);
    };
    run();
    return () => { aborted = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setStepReady]);

  const done = Object.values(statuses).filter((s) => s === "done").length;
  const isScanning = done < CATEGORIES.length;

  const [quoteIdx, setQuoteIdx] = useState(() => Math.floor(Math.random() * SCAN_QUOTES.length));
  useEffect(() => {
    if (!isScanning) return;
    const interval = setInterval(() => {
      setQuoteIdx((prev) => {
        let next: number;
        do { next = Math.floor(Math.random() * SCAN_QUOTES.length); } while (next === prev && SCAN_QUOTES.length > 1);
        return next;
      });
    }, 2500);
    return () => clearInterval(interval);
  }, [isScanning]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: ND_EASE }}
      className="flex h-full flex-col items-center justify-center gap-6 px-8 py-6 bg-[var(--black)]"
    >
      {/* Header */}
      <div className="text-center">
        <h2 className="font-display text-title text-[var(--text-display)]">
          {isScanning ? "SCANNING" : "COMPLETE"}
        </h2>
        <p className="mt-2 nd-label text-[var(--text-secondary)]">
          {isScanning ? "ANALYZING HARDWARE, SOFTWARE, AND CONFIGURATION" : "SYSTEM PROFILE READY"}
        </p>

        {/* Status text */}
        {isScanning && (
          <div className="mt-3 h-4">
            <AnimatePresence mode="wait">
              <motion.p
                key={quoteIdx}
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: ND_EASE }}
                className="nd-status text-[var(--text-disabled)]"
              >
                [{SCAN_QUOTES[quoteIdx]}]
              </motion.p>
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Scan items — Nothing terminal style */}
      <div className="w-full max-w-md space-y-0">
        {CATEGORIES.map((cat, i) => {
          const st = statuses[cat.id];
          return (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.03, duration: 0.2, ease: ND_EASE }}
              className={`flex items-center gap-4 border-b border-[var(--border)] px-4 py-2.5 transition-colors duration-150 ease-nd ${
                st === "scanning" ? "bg-[var(--surface)]" : ""
              }`}
            >
              {/* Status indicator */}
              <div className="w-3 flex justify-center">
                {st === "done" ? (
                  <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.2, ease: ND_EASE }}
                    className="w-3 h-0.5 bg-[var(--accent)]"
                  />
                ) : st === "scanning" ? (
                  <div className="w-1.5 h-1.5 bg-[var(--accent)] nd-pulse" />
                ) : (
                  <div className="w-1.5 h-px bg-nd-border" />
                )}
              </div>

              {/* Label */}
              <div className="flex-1 min-w-0">
                <span className={`font-mono text-caption tracking-label ${
                  st === "done" ? "text-[var(--text-primary)]" : st === "scanning" ? "text-[var(--text-display)]" : "text-[var(--text-disabled)]"
                }`}>
                  {cat.label}
                </span>
              </div>

              {/* Desc */}
              <span className="nd-label-sm text-[var(--text-disabled)]">
                {cat.desc}
              </span>
            </motion.div>
          );
        })}
      </div>

      {/* Segmented progress bar */}
      <div className="w-full max-w-md">
        <div className="flex gap-0.5">
          {CATEGORIES.map((cat) => (
            <div
              key={cat.id}
              className={`flex-1 h-1 transition-colors duration-250 ease-nd ${
                statuses[cat.id] === "done" ? "bg-[var(--accent)]" : "bg-nd-border-subtle"
              }`}
            />
          ))}
        </div>
        <div className="mt-2 flex justify-between">
          <span className="nd-label-sm text-[var(--text-disabled)]">
            {isScanning ? "[SCANNING...]" : "[COMPLETE]"}
          </span>
          <span className="font-mono text-label tracking-label text-[var(--text-disabled)]">
            {done}/{CATEGORIES.length}
          </span>
        </div>
      </div>

      {/* Completion indicator */}
      {!isScanning && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, ease: ND_EASE }}
          className="flex items-center gap-3 border border-success-400/20 bg-[var(--success)]/[0.04] px-4 py-2 rounded-sm"
        >
          <div className="w-3 h-0.5 bg-[var(--success)]" />
          <span className="nd-label text-[var(--success)]">SYSTEM SCANNED — BUILDING PROFILE</span>
        </motion.div>
      )}
    </motion.div>
  );
}
