import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Monitor, Package, Rocket, Server, Clock, Briefcase, Box } from "lucide-react";
import { useWizardStore } from "@/stores/wizard-store";
import type { DetectedProfile } from "@/stores/wizard-store";

const SCAN_QUOTES = [
  "reading your PC's diary...",
  "counting how many Bing apps Microsoft snuck in...",
  "checking if your PC needs therapy...",
  "evaluating bloat levels... yikes...",
  "scanning for symptoms of Windows-itis...",
  "diagnosing your system's trust issues...",
  "how did 287 services get in here?",
  "your PC has... opinions...",
  "finding all the things you didn't install...",
  "measuring the bloat damage...",
  "cataloging Microsoft's greatest hits...",
  "oh wow, that's a lot of telemetry...",
  "your startup folder is... ambitious...",
  "discovery phase: finding what hurts...",
  "scanning... scanning... still scanning...",
];

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
  windowsBuild: 22631,
};

const PROFILE_LABELS: Record<string, string> = {
  gaming_desktop: "Gaming Desktop",
  budget_desktop: "Budget Desktop",
  highend_workstation: "High-end Workstation",
  office_laptop: "Office Laptop",
  gaming_laptop: "Gaming Laptop",
  low_spec_system: "Low-spec System",
  vm_cautious: "Virtual Machine",
  work_pc: "Work PC",
};

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
    return value
      .map((entry) => {
        if (typeof entry === "string") return entry;
        if (isObject(entry)) {
          const factor = readString(entry.factor);
          const detail = readString(entry.detail);
          const indicator = readString(entry.indicator);
          const val = readString(entry.value);
          return factor ?? detail ?? indicator ?? val ?? null;
        }
        return null;
      })
      .filter((entry): entry is string => Boolean(entry));
  }

  if (isObject(value)) {
    return Object.entries(value)
      .filter(([, v]) => v !== null && v !== undefined && v !== false)
      .map(([key, v]) => {
        if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
          return `${key}: ${String(v)}`;
        }
        return key;
      });
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

  return (
    readInt(hardware.windowsBuild) ??
    readInt(assessmentValue.windowsBuild) ??
    readInt(windows.buildNumber) ??
    22631
  );
}

function normalizeDetectedProfileFromService(
  assessmentValue: unknown,
  classificationValue?: unknown,
): DetectedProfile | null {
  if (!isObject(assessmentValue)) return null;

  if (typeof assessmentValue.label === "string" && Array.isArray(assessmentValue.signals)) {
    return {
      id: readString(assessmentValue.id) ?? "gaming_desktop",
      label: readString(assessmentValue.label) ?? "Gaming Desktop",
      confidence: normalizeConfidence(assessmentValue.confidence),
      isWorkPc: readBoolean(assessmentValue.isWorkPc) ?? false,
      machineName: readString(assessmentValue.machineName) ?? "REDCORE-PC",
      signals: normalizeSignals(assessmentValue.signals),
      accentColor: readString(assessmentValue.accentColor) ?? "text-brand-400",
      windowsBuild: readWindowsBuild(assessmentValue),
    };
  }

  const classification = isObject(classificationValue) ? classificationValue : {};
  const hardware = isObject(assessmentValue.hardware) ? assessmentValue.hardware : {};
  const workIndicators = isObject(assessmentValue.workIndicators) ? assessmentValue.workIndicators : {};
  const workSignals = isObject(assessmentValue.workSignals) ? assessmentValue.workSignals : {};

  const profileId = readString(classification.primary) ?? "gaming_desktop";
  const isWorkPc =
    profileId === "work_pc" ||
    readBoolean(workIndicators.isWorkPc) === true ||
    readBoolean(workSignals.domainJoined) === true;

  const machineName =
    readString(hardware.hostname) ??
    readString(assessmentValue.machineName) ??
    readString(assessmentValue.hostname) ??
    "REDCORE-PC";

  const signals = [
    ...normalizeSignals(classification.signals),
    ...normalizeSignals(workIndicators.indicators),
    ...deriveSignalsFromAssessment(assessmentValue, isWorkPc),
  ];

  return {
    id: profileId,
    label: PROFILE_LABELS[profileId] ?? profileId.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    confidence: normalizeConfidence(classification.confidence),
    isWorkPc,
    machineName,
    signals: Array.from(new Set(signals)).slice(0, 6),
    accentColor: "text-brand-400",
    windowsBuild: readWindowsBuild(assessmentValue),
  };
}

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

        const detectedProfile = normalizeDetectedProfileFromService(
          assessment,
          classificationResult.ok ? classificationResult.data : undefined,
        );

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
  }, [setStepReady]);

  const done = Object.values(statuses).filter((s) => s === "done").length;
  const pct = Math.round((done / CATEGORIES.length) * 100);
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
    }, 3000);
    return () => clearInterval(interval);
  }, [isScanning]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.22, ease: [0.0, 0.0, 0.2, 1.0] }}
      className="flex h-full flex-col items-center justify-center gap-5 px-8 py-6"
    >
      <div className="text-center">
        <motion.h2
          initial={{ opacity: 0, y: 8, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="text-[17px] font-bold text-ink"
        >
          {isScanning ? "Assessing Your System" : "Assessment Complete"}
        </motion.h2>
        <p className="mt-1 text-[11px] text-ink-tertiary">
          {isScanning ? "Scanning hardware, software, and configuration" : "Your system profile is ready"}
        </p>
        {/* Scan quote */}
        {isScanning && (
          <div className="mt-1.5 h-4">
            <AnimatePresence mode="wait">
              <motion.p
                key={quoteIdx}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 0.45, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.25 }}
                className="text-[10px] italic text-ink-muted"
              >
                {SCAN_QUOTES[quoteIdx]}
              </motion.p>
            </AnimatePresence>
          </div>
        )}
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

      {/* Completion flash */}
      {done === CATEGORIES.length && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 18 }}
          className="flex items-center gap-2 rounded-lg border border-success-500/20 bg-success-500/[0.06] px-4 py-2"
        >
          <Check className="h-3.5 w-3.5 text-success-400" />
          <span className="text-[11px] font-medium text-success-300">System scanned — building your profile</span>
        </motion.div>
      )}
    </motion.div>
  );
}
