import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWizardStore } from "@/stores/wizard-store";
import type { DetectedProfile } from "@/stores/wizard-store";
import { platform } from "@/lib/platform";
import { serviceCall } from "@/lib/service";
import { demoProfileAllowed } from "@/lib/runtime";
import { useRuntimeStore } from "@/stores/runtime-store";
import { readHealthChecks, readWindowsBuild } from "@/lib/assessment";
import { useT } from "@/i18n";

const SCAN_QUOTE_KEYS = [
  "assessment.quote.systemDetails",
  "assessment.quote.installedApps",
  "assessment.quote.workProfile",
  "assessment.quote.backgroundSoftware",
  "assessment.quote.services",
  "assessment.quote.virtualization",
  "assessment.quote.startupItems",
  "assessment.quote.systemSettings",
] as const;

const CATEGORIES = [
  { id: "windows",  labelKey: "assessment.cat.windows.label",  descKey: "assessment.cat.windows.desc" },
  { id: "packages", labelKey: "assessment.cat.packages.label", descKey: "assessment.cat.packages.desc" },
  { id: "startup",  labelKey: "assessment.cat.startup.label",  descKey: "assessment.cat.startup.desc" },
  { id: "services", labelKey: "assessment.cat.services.label", descKey: "assessment.cat.services.desc" },
  { id: "tasks",    labelKey: "assessment.cat.tasks.label",    descKey: "assessment.cat.tasks.desc" },
  { id: "signals",  labelKey: "assessment.cat.signals.label",  descKey: "assessment.cat.signals.desc" },
  { id: "vm",       labelKey: "assessment.cat.vm.label",       descKey: "assessment.cat.vm.desc" },
] as const;

type Status = "idle" | "scanning" | "done";

// Preview-only sample profile (macOS demo / plain browser). NEVER used on
// Windows — see demoProfileAllowed() in lib/runtime.ts.
const SAMPLE_PROFILE: DetectedProfile = {
  id: "gaming_desktop", label: "Gaming Desktop", confidence: null,
  isWorkPc: false, machineName: "OUDEN-PC",
  signals: [],
  accentColor: "text-[var(--accent)]", windowsBuild: null, sample: true,
};

const PROFILE_LABELS: Record<string, string> = {
  gaming_desktop: "Gaming Desktop", budget_desktop: "Budget Desktop",
  highend_workstation: "High-end Workstation", office_laptop: "Office Laptop",
  gaming_laptop: "Gaming Laptop", low_spec_system: "Low-spec System",
  vm_cautious: "Virtual Machine", work_pc: "Work PC",
};

const ND_EASE = [0.25, 0.1, 0.25, 1] as const;
// Generous UI-side guard; the shell enforces the real per-method timeout (120 s).
const ASSESSMENT_GUARD_MS = 150_000;

// ── Helpers ─────────────────────────────────────────────────────────────

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}
function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
function readBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}
/** null when the classifier did not report a confidence — never invent one. */
function normalizeConfidence(value: unknown): number | null {
  const num = readNumber(value);
  if (num === null) return null;
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
  if (gpuName) signals.push(`${gpuName}`);
  const ramGb = readNumber(hardware.ramGb);
  if (ramGb !== null) signals.push(`${Math.round(ramGb)} GB RAM`);
  const domainJoined = readBoolean(workSignals.domainJoined);
  if (domainJoined === true) signals.push("Domain-joined");
  const cpuCores = readNumber(cpu.NumberOfCores) ?? readNumber(cpu.cores);
  if (cpuCores !== null) signals.push(`${Math.round(cpuCores)}-core CPU`);
  if (isWorkPc) signals.push("Work PC");
  return signals.slice(0, 6);
}
function readChassis(assessmentValue: Record<string, unknown>): string | null {
  const ff = isObject(assessmentValue.formFactor) ? assessmentValue.formFactor : {};
  return readString(ff.chassis);
}

/** classify.machine `signals` is an object ({ ramGb, cpuCores, hasDiscreteGpu, isLaptop, isVM }). */
function signalsFromClassification(value: unknown): string[] {
  if (Array.isArray(value)) return normalizeSignals(value);
  if (!isObject(value)) return [];
  const out: string[] = [];
  const ram = readNumber(value.ramGb);
  if (ram !== null) out.push(`${Math.round(ram)} GB RAM`);
  const cores = readNumber(value.cpuCores);
  if (cores !== null) out.push(`${Math.round(cores)}-core CPU`);
  if (value.isVM === true) out.push("VM");
  return out;
}
function normalizeDetectedProfileFromService(assessmentValue: unknown, classificationValue?: unknown): DetectedProfile | null {
  if (!isObject(assessmentValue)) return null;
  const windowsBuild = readWindowsBuild(assessmentValue);
  const chassis = readChassis(assessmentValue);
  const healthChecks = readHealthChecks(assessmentValue);
  if (typeof assessmentValue.label === "string" && Array.isArray(assessmentValue.signals)) {
    const id = readString(assessmentValue.id);
    if (!id) return null;
    return {
      id,
      label: readString(assessmentValue.label) ?? PROFILE_LABELS[id] ?? id,
      confidence: normalizeConfidence(assessmentValue.confidence),
      isWorkPc: readBoolean(assessmentValue.isWorkPc) ?? false,
      machineName: readString(assessmentValue.machineName) ?? "",
      signals: normalizeSignals(assessmentValue.signals),
      accentColor: readString(assessmentValue.accentColor) ?? "text-[var(--accent)]",
      windowsBuild,
      chassis,
      healthChecks,
    };
  }
  const classification = isObject(classificationValue) ? classificationValue : {};
  const hardware = isObject(assessmentValue.hardware) ? assessmentValue.hardware : {};
  const workIndicators = isObject(assessmentValue.workIndicators) ? assessmentValue.workIndicators : {};
  const workSignals = isObject(assessmentValue.workSignals) ? assessmentValue.workSignals : {};
  const classWork = isObject(classification.workIndicators) ? classification.workIndicators : {};
  const profileId = readString(classification.primary);
  if (!profileId) return null; // no classification → let the user retry, don't guess
  const isWorkPc =
    profileId === "work_pc" ||
    readBoolean(workIndicators.isWorkPc) === true ||
    readBoolean(workSignals.domainJoined) === true ||
    readBoolean(classWork.domainJoined) === true;
  const machineName = readString(hardware.hostname) ?? readString(assessmentValue.machineName) ?? readString(assessmentValue.hostname) ?? "";
  // GPU name / RAM / cores come from the assessment; classification adds only what it alone knows.
  const signals = [
    ...deriveSignalsFromAssessment(assessmentValue, isWorkPc),
    ...signalsFromClassification(classification.signals),
    ...normalizeSignals(workIndicators.indicators),
  ];
  return {
    id: profileId,
    label: PROFILE_LABELS[profileId] ?? profileId.replace(/_/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase()),
    confidence: normalizeConfidence(classification.confidence),
    isWorkPc,
    machineName,
    signals: Array.from(new Set(signals)).slice(0, 6),
    accentColor: "text-[var(--accent)]",
    windowsBuild,
    chassis,
    healthChecks,
  };
}
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return await new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error(`${label} timed out after ${Math.round(timeoutMs / 1000)}s`));
    }, timeoutMs);

    promise
      .then((value) => {
        window.clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        window.clearTimeout(timer);
        reject(error);
      });
  });
}

// ── Component ───────────────────────────────────────────────────────────

export function AssessmentStep() {
  const { t } = useT();
  const { completeStep, goBack, setDetectedProfile, setDemoMode, setStepReady } = useWizardStore();
  const refreshRuntime = useRuntimeStore((s) => s.refresh);
  const [statuses, setStatuses] = useState<Record<string, Status>>(
    Object.fromEntries(CATEGORIES.map((c) => [c.id, "idle"]))
  );
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setStepReady("assessment", false);
    setError(null);
    // StrictMode-safe: each effect run owns its own `cancelled` flag; a
    // cancelled run never touches state. No "started" ref that would make the
    // second (real) mount skip the work.
    let cancelled = false;

    const completeWithSampleProfile = async () => {
      setDemoMode(true);
      setDetectedProfile(SAMPLE_PROFILE);
      for (const c of CATEGORIES) {
        await new Promise((r) => setTimeout(r, 280));
        if (cancelled) return;
        setStatuses((prev) => ({ ...prev, [c.id]: "done" }));
      }
      setStepReady("assessment", true);
      await new Promise((r) => setTimeout(r, 900));
      if (!cancelled) completeStep("assessment");
    };

    const fail = (message: string) => {
      if (cancelled) return;
      setStatuses(Object.fromEntries(CATEGORIES.map((c) => [c.id, "idle"])));
      setError(message);
    };

    const run = async () => {
      setStatuses(Object.fromEntries(CATEGORIES.map((c) => [c.id, "scanning"])));
      const runtime = await refreshRuntime();
      if (cancelled) return;

      if (demoProfileAllowed(runtime)) {
        // macOS / browser preview only.
        await completeWithSampleProfile();
        return;
      }
      if (!runtime.running) {
        fail(runtime.startError ?? t("assessment.error.serviceDown"));
        return;
      }

      try {
        const assessResult = await withTimeout(serviceCall<unknown>("assess.full"), ASSESSMENT_GUARD_MS, "Assessment");
        if (cancelled) return;
        if (!assessResult.ok) {
          fail(assessResult.error);
          return;
        }
        const assessment = assessResult.data;
        const assessmentId = isObject(assessment) ? readString(assessment.id) : null;
        const classifyParams = assessmentId ? { assessmentId } : { assessment };
        const classificationResult = await withTimeout(
          serviceCall<unknown>("classify.machine", classifyParams),
          ASSESSMENT_GUARD_MS,
          "Classification",
        );
        if (cancelled) return;
        const detectedProfile = normalizeDetectedProfileFromService(
          assessment,
          classificationResult.ok ? classificationResult.data : undefined,
        );
        if (!detectedProfile) {
          fail(classificationResult.ok ? t("assessment.error.noProfile") : classificationResult.error);
          return;
        }
        setStatuses(Object.fromEntries(CATEGORIES.map((c) => [c.id, "done"])));
        setDetectedProfile(detectedProfile);
        setDemoMode(false);
        setStepReady("assessment", true);
        setTimeout(() => { if (!cancelled) completeStep("assessment"); }, 800);
      } catch (e) {
        fail(e instanceof Error ? e.message : String(e));
      }
    };
    void run();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  const errorView = error ? (
      <div role="alert" className="flex min-h-full flex-col items-center justify-center gap-4 px-8 text-center">
        <h2 className="font-display text-title text-[var(--text-display)]">{t("assessment.error.title")}</h2>
        <p className="max-w-md text-[12px] text-[var(--text-secondary)]">{t("assessment.error.body")}</p>
        <p className="max-w-md break-words font-mono text-[10px] text-[var(--text-disabled)]">{error}</p>
        <div className="flex gap-3">
          <button
            onClick={() => goBack()}
            className="rounded-sm px-4 py-2 text-[12px] text-[var(--text-secondary)]"
            style={{ border: "1px solid var(--border)" }}
          >
            {t("common.back")}
          </button>
          <button
            onClick={async () => {
              const status = await refreshRuntime();
              if (!status.running) await platform().service.restart();
              setAttempt((n) => n + 1);
            }}
            className="rounded-sm px-4 py-2 text-[12px] font-medium"
            style={{ background: "var(--text-display)", color: "var(--black)" }}
          >
            {t("common.retry")}
          </button>
        </div>
      </div>
  ) : null;

  const done = Object.values(statuses).filter((s) => s === "done").length;
  const isScanning = done < CATEGORIES.length;

  const [quoteIdx, setQuoteIdx] = useState(() => Math.floor(Math.random() * SCAN_QUOTE_KEYS.length));
  useEffect(() => {
    if (!isScanning) return;
    const interval = setInterval(() => {
      setQuoteIdx((prev) => {
        let next: number;
        do { next = Math.floor(Math.random() * SCAN_QUOTE_KEYS.length); } while (next === prev && SCAN_QUOTE_KEYS.length > 1);
        return next;
      });
    }, 2500);
    return () => clearInterval(interval);
  }, [isScanning]);

  if (errorView) return errorView;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
      className="flex min-h-full flex-col items-center justify-center gap-6 px-8 py-6 bg-[var(--black)]"
    >
      {/* Spinning ring — scan indicator */}
      {isScanning && (
        <motion.svg
          width={32} height={32} viewBox="0 0 100 100"
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <circle cx="50" cy="50" r="35" stroke="var(--border-visible)" strokeWidth={5} fill="none" />
          <path d="M 50 15 A 35 35 0 0 1 85 50" stroke="var(--text-primary)" strokeWidth={5} strokeLinecap="round" fill="none" />
        </motion.svg>
      )}

      {/* Header */}
      <div className="text-center">
        <h2 className="font-display text-title text-[var(--text-display)]">
          {isScanning ? t("assessment.title.scanning") : t("assessment.title.done")}
        </h2>
        <p className="mt-2 nd-label text-[var(--text-secondary)]">
          {isScanning ? t("assessment.subtitle.scanning") : t("assessment.subtitle.done")}
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
                {t(SCAN_QUOTE_KEYS[quoteIdx])}
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
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.25, ease: ND_EASE }}
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
                  {t(cat.labelKey)}
                </span>
              </div>

              {/* Desc */}
              <span className="nd-label-sm text-[var(--text-disabled)]">
                {t(cat.descKey)}
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
            {isScanning ? t("assessment.progress.scanning") : t("assessment.progress.complete")}
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
          <span className="nd-label text-[var(--success)]">{t("assessment.completion")}</span>
        </motion.div>
      )}
    </motion.div>
  );
}
