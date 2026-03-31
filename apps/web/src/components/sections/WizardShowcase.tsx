"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import {
  Check,
  AlertCircle,
  Shield,
  Cpu,
  Fingerprint,
  ChevronRight,
  Sparkles,
  Zap,
  Monitor,
  Eye,
  Globe,
  Search,
  HardDrive,
  Gamepad2,
  Download,
} from "lucide-react";
import { easing, duration } from "@/lib/motion";

// ─── Types ──────────────────────────────────────────────────────────────────

interface ShowcaseStep {
  id: string;
  label: string;
  icon: React.ElementType;
  duration: number; // ms to show before auto-advancing
}

// ─── Step definitions ───────────────────────────────────────────────────────

const STEPS: ShowcaseStep[] = [
  { id: "welcome", label: "Welcome", icon: Sparkles, duration: 3000 },
  { id: "assessment", label: "Assessment", icon: Search, duration: 4500 },
  { id: "profile", label: "Profile", icon: Monitor, duration: 3500 },
  { id: "strategy", label: "Strategy", icon: Shield, duration: 4000 },
  { id: "review", label: "Review", icon: Eye, duration: 4000 },
  { id: "execution", label: "Execution", icon: Zap, duration: 5000 },
  { id: "report", label: "Report", icon: Check, duration: 3500 },
];

// ─── Logo mark (matches desktop app exactly) ───────────────────────────────

function LogoMark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <path d="M32 4L56.5 18v28L32 60 7.5 46V18L32 4z" fill="#E8254B" opacity="0.12" />
      <path d="M32 4L56.5 18v28L32 60 7.5 46V18L32 4z" stroke="#E8254B" strokeWidth="2" fill="none" />
      <circle cx="32" cy="32" r="17" stroke="#E8254B" strokeWidth="2.5" fill="none" opacity="0.5" />
      <circle cx="32" cy="32" r="10" fill="#E8254B" />
    </svg>
  );
}

// ─── Step rail (left sidebar) ───────────────────────────────────────────────

function StepRail({ activeIndex }: { activeIndex: number }) {
  return (
    <div className="hidden sm:flex w-[140px] shrink-0 flex-col border-r border-border-default bg-surface-card/50 py-4 px-2 gap-0.5">
      {STEPS.map((step, i) => {
        const isActive = i === activeIndex;
        const isDone = i < activeIndex;
        return (
          <div
            key={step.id}
            className={[
              "flex items-center gap-2 rounded-md px-2 py-1.5 transition-all duration-200",
              isActive ? "bg-brand-500/10" : "",
            ].join(" ")}
          >
            <div
              className={[
                "flex h-4.5 w-4.5 items-center justify-center rounded-full text-[8px] font-mono font-bold",
                isDone
                  ? "bg-brand-500/20 text-brand-500"
                  : isActive
                    ? "bg-brand-500 text-white"
                    : "bg-surface-overlay text-ink-tertiary",
              ].join(" ")}
            >
              {isDone ? <Check size={8} strokeWidth={3} /> : i + 1}
            </div>
            <span
              className={[
                "text-[10px] font-medium",
                isActive ? "text-brand-500" : isDone ? "text-ink-secondary" : "text-ink-muted",
              ].join(" ")}
            >
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Step 1: Welcome ────────────────────────────────────────────────────────

function WelcomeContent() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-6">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="relative"
      >
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 4, ease: "easeInOut", repeat: Infinity }}
          className="absolute inset-0 rounded-2xl blur-xl"
          style={{ width: 56, height: 56, background: "rgba(232,37,75,0.2)" }}
        />
        <LogoMark size={56} />
      </motion.div>
      <div className="text-center">
        <h3 className="text-[15px] font-bold text-ink-primary">
          red<span className="text-brand-500">core</span>{" "}
          <span className="font-normal text-ink-secondary">OS</span>
        </h3>
        <p className="mt-1.5 text-[11px] text-ink-tertiary leading-relaxed max-w-[260px]">
          Machine-aware Windows optimization.
          <br />
          Guided, reversible, honest.
        </p>
      </div>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-[11px] font-semibold text-white"
      >
        Begin Assessment
        <ChevronRight size={12} />
      </motion.div>
    </div>
  );
}

// ─── Step 2: Assessment (animated scan) ─────────────────────────────────────

const SCAN_CATEGORIES = [
  { icon: Monitor, label: "Windows version", result: "Windows 11 23H2 (22631)" },
  { icon: Cpu, label: "Hardware profile", result: "Ryzen 7 5800X · RTX 4070 · 32GB" },
  { icon: HardDrive, label: "Installed packages", result: "142 packages detected" },
  { icon: Zap, label: "Startup programs", result: "23 startup items" },
  { icon: Shield, label: "Running services", result: "87 active services" },
  { icon: Fingerprint, label: "Work signals", result: "No domain · Personal use" },
  { icon: Globe, label: "VM detection", result: "Not a virtual machine" },
];

function AssessmentContent() {
  const [scanned, setScanned] = useState(0);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    SCAN_CATEGORIES.forEach((_, i) => {
      timers.push(setTimeout(() => setScanned(i + 1), 400 + i * 500));
    });
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="flex h-full flex-col px-5 py-4">
      <div className="mb-3">
        <p className="text-[10px] font-mono uppercase tracking-[0.12em] text-brand-500 font-bold">
          System Assessment
        </p>
        <p className="mt-1 text-[11px] text-ink-tertiary">Scanning your machine...</p>
      </div>
      <div className="flex-1 space-y-1.5 overflow-hidden">
        {SCAN_CATEGORIES.map((cat, i) => {
          const done = i < scanned;
          const active = i === scanned - 1;
          const Icon = cat.icon;
          return (
            <motion.div
              key={cat.label}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: done ? 1 : 0.3, x: 0 }}
              transition={{ duration: 0.2, delay: i * 0.05 }}
              className={[
                "flex items-center gap-2.5 rounded-lg px-3 py-2 transition-all",
                active ? "bg-brand-500/[0.06] border border-brand-500/20" : "border border-transparent",
              ].join(" ")}
              style={active ? { animation: "scanBorderGlow 1.8s ease-in-out infinite" } : undefined}
            >
              <Icon size={13} className={done ? "text-brand-500" : "text-ink-muted"} />
              <div className="flex-1 min-w-0">
                <span className="text-[11px] text-ink-secondary">{cat.label}</span>
                {done && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="ml-2 text-[10px] text-ink-tertiary"
                  >
                    {cat.result}
                  </motion.span>
                )}
              </div>
              {done && <Check size={11} className="text-brand-500 shrink-0" />}
            </motion.div>
          );
        })}
      </div>
      <div className="mt-2">
        <div className="h-1 rounded-full bg-surface-overlay overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-brand-500"
            animate={{ width: `${(scanned / SCAN_CATEGORIES.length) * 100}%` }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Step 3: Profile ────────────────────────────────────────────────────────

function ProfileContent() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-6">
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 16 }}
        className="flex h-16 w-16 items-center justify-center rounded-2xl border border-brand-500/25 bg-brand-500/[0.08]"
      >
        <Gamepad2 className="h-8 w-8 text-brand-500" />
      </motion.div>
      <div className="text-center">
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-[10px] font-mono uppercase tracking-[0.12em] text-brand-500 font-bold"
        >
          Detected Profile
        </motion.p>
        <motion.h3
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-1 text-[17px] font-bold text-ink-primary"
        >
          Gaming Desktop
        </motion.h3>
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-1.5 text-[10px] text-ink-tertiary leading-relaxed max-w-[240px]"
        >
          High-end CPU + dedicated GPU detected.
          <br />
          Optimizations tailored for gaming performance.
        </motion.p>
      </div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="flex flex-wrap justify-center gap-1.5"
      >
        {["Performance", "Low latency", "GPU priority"].map((tag) => (
          <span
            key={tag}
            className="rounded-full bg-brand-500/10 px-2 py-0.5 text-[9px] font-mono text-brand-500"
          >
            {tag}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

// ─── Step 4: Strategy ───────────────────────────────────────────────────────

function StrategyContent() {
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setSelected(1), 1200);
    return () => clearTimeout(timer);
  }, []);

  const options = [
    { title: "Conservative", desc: "Light cleanup only. Nothing risky.", badge: "Safest", color: "bg-emerald-500/15 text-emerald-400" },
    { title: "Balanced", desc: "Good mix of performance and privacy.", badge: "Recommended", color: "bg-brand-500/15 text-brand-400" },
    { title: "Aggressive", desc: "Deeper tweaks for power users.", badge: null, color: "" },
  ];

  return (
    <div className="flex h-full flex-col px-5 py-4">
      <div className="mb-3">
        <div className="flex items-center gap-1.5">
          <Shield size={12} className="text-brand-500" />
          <p className="text-[10px] font-mono uppercase tracking-[0.12em] text-brand-500 font-bold">
            Optimization Depth
          </p>
        </div>
        <h3 className="mt-1.5 text-[14px] font-bold text-ink-primary">How much should we optimize?</h3>
        <p className="mt-1 text-[10px] text-ink-tertiary leading-relaxed">
          Start safe, or go deeper if you know what you&apos;re doing.
        </p>
      </div>
      <div className="flex-1 space-y-2">
        {options.map((opt, i) => {
          const isSelected = selected === i;
          return (
            <motion.div
              key={opt.title}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + i * 0.1 }}
              className={[
                "rounded-lg border px-3.5 py-2.5 cursor-pointer transition-all",
                isSelected
                  ? "border-brand-500/30 bg-brand-500/[0.06]"
                  : "border-border-default bg-surface-card/50 hover:border-border-strong",
              ].join(" ")}
            >
              <div className="flex items-center gap-2.5">
                <div className={[
                  "flex h-4 w-4 items-center justify-center rounded-full",
                  isSelected ? "bg-brand-500" : "border border-border-strong",
                ].join(" ")}>
                  {isSelected && <div className="h-2 w-2 rounded-full bg-white" />}
                </div>
                <span className={["text-[12px] font-semibold", isSelected ? "text-ink-primary" : "text-ink-secondary"].join(" ")}>
                  {opt.title}
                </span>
                {opt.badge && (
                  <span className={`rounded px-1.5 py-0.5 text-[8px] font-bold uppercase ${opt.color}`}>
                    {opt.badge}
                  </span>
                )}
              </div>
              <p className="mt-1 pl-6.5 text-[10px] text-ink-tertiary">{opt.desc}</p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Step 5: Review ─────────────────────────────────────────────────────────

const REVIEW_ACTIONS = [
  { name: "Disable telemetry", phase: "Privacy", status: "included" as const },
  { name: "Remove Copilot", phase: "Shell", status: "included" as const },
  { name: "Disable Game DVR", phase: "Performance", status: "included" as const },
  { name: "Optimize CPU scheduler", phase: "Performance", status: "included" as const },
  { name: "Disable print spooler", phase: "Services", status: "blocked" as const },
  { name: "Remove Edge", phase: "AppX", status: "blocked" as const },
  { name: "Disable HAGS", phase: "GPU", status: "optional" as const },
];

function ReviewContent() {
  return (
    <div className="flex h-full flex-col px-5 py-4">
      <div className="mb-3 flex items-baseline justify-between">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-[0.12em] text-brand-500 font-bold">
            Playbook Review
          </p>
          <p className="mt-0.5 text-[10px] text-ink-tertiary">Review every action before it runs</p>
        </div>
        <div className="flex gap-2 text-[9px] font-mono">
          <span className="text-brand-500">5 included</span>
          <span className="text-amber-400">1 blocked</span>
        </div>
      </div>
      <div className="flex-1 space-y-1 overflow-hidden">
        {REVIEW_ACTIONS.map((action, i) => (
          <motion.div
            key={action.name}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 + i * 0.08 }}
            className="flex items-center gap-2 rounded-md bg-surface-card/60 px-3 py-1.5"
          >
            {action.status === "included" ? (
              <Check size={10} className="text-brand-500 shrink-0" />
            ) : action.status === "blocked" ? (
              <Shield size={10} className="text-amber-400 shrink-0" />
            ) : (
              <AlertCircle size={10} className="text-ink-muted shrink-0" />
            )}
            <span className="flex-1 text-[10px] text-ink-secondary truncate">{action.name}</span>
            <span className="text-[8px] text-ink-muted font-mono">{action.phase}</span>
            <span className={[
              "rounded px-1 py-0.5 text-[7px] font-bold uppercase font-mono",
              action.status === "included" ? "bg-brand-500/10 text-brand-400"
                : action.status === "blocked" ? "bg-amber-500/10 text-amber-400"
                : "bg-surface-overlay text-ink-muted",
            ].join(" ")}>
              {action.status}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─── Step 6: Execution ──────────────────────────────────────────────────────

const EXEC_ACTIONS = [
  "Disable telemetry services",
  "Remove advertising ID",
  "Disable Copilot sidebar",
  "Strip web search noise",
  "Disable Game DVR",
  "Optimize CPU scheduler",
  "Apply power plan",
  "Disable transparency",
];

function ExecutionContent() {
  const [completed, setCompleted] = useState(0);
  const [currentAction, setCurrentAction] = useState(EXEC_ACTIONS[0]);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    EXEC_ACTIONS.forEach((action, i) => {
      timers.push(setTimeout(() => {
        setCompleted(i + 1);
        if (i + 1 < EXEC_ACTIONS.length) {
          setCurrentAction(EXEC_ACTIONS[i + 1]);
        }
      }, 400 + i * 500));
    });
    return () => timers.forEach(clearTimeout);
  }, []);

  const progress = Math.round((completed / EXEC_ACTIONS.length) * 100);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3.5 px-6">
      <div className="text-center">
        <h3 className="text-[14px] font-semibold text-ink-primary">Applying Changes</h3>
        <p className="text-[10px] text-ink-tertiary">Do not shut down your computer</p>
      </div>

      {/* Current action card */}
      <div className="w-full max-w-[280px]">
        <AnimatePresence mode="wait">
          {completed < EXEC_ACTIONS.length ? (
            <motion.div
              key={currentAction}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="rounded-lg border border-brand-500/25 bg-brand-500/[0.06] px-3.5 py-2"
              style={{ animation: "executionPulse 1.5s ease-in-out infinite" }}
            >
              <div className="flex items-center gap-2">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.9, ease: "linear", repeat: Infinity }}
                  className="h-3 w-3 shrink-0 rounded-full border-[1.5px] border-brand-500 border-t-transparent"
                />
                <span className="flex-1 text-[10px] font-medium text-ink-primary truncate">{currentAction}</span>
                <span className="shrink-0 font-mono text-[9px] text-brand-500/60">
                  {completed + 1}/{EXEC_ACTIONS.length}
                </span>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center justify-center gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/[0.06] px-3.5 py-2"
            >
              <Check size={12} className="text-emerald-400" />
              <span className="text-[11px] font-medium text-emerald-300">All actions complete</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Progress */}
      <div className="w-full max-w-[280px]">
        <div className="h-1 rounded-full bg-surface-overlay overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-brand-600 to-brand-400"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          />
        </div>
        <div className="mt-1 flex justify-between text-[9px] font-mono text-ink-muted">
          <span>{progress}%</span>
          <span>{completed}/{EXEC_ACTIONS.length}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-4">
        {[
          { label: "Applied", value: completed, color: "text-emerald-400" },
          { label: "Failed", value: 0, color: "text-ink-muted" },
          { label: "Remaining", value: EXEC_ACTIONS.length - completed, color: "text-ink-secondary" },
        ].map((stat) => (
          <div key={stat.label} className="flex flex-col items-center gap-0.5">
            <span className={`font-mono text-[16px] font-bold ${stat.color}`}>{stat.value}</span>
            <span className="text-[8px] text-ink-muted">{stat.label}</span>
          </div>
        ))}
      </div>

      {/* Mini timeline */}
      <div className="w-full max-w-[280px] max-h-[60px] overflow-hidden">
        {EXEC_ACTIONS.slice(0, completed).map((action, i) => (
          <motion.div
            key={action}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="flex items-center gap-1.5 py-0.5"
          >
            <Check size={8} className="text-emerald-400 shrink-0" />
            <span className="text-[8px] text-ink-tertiary truncate">{action}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─── Step 7: Report ─────────────────────────────────────────────────────────

function ReportContent() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3.5 px-6">
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 16 }}
        className="relative flex h-12 w-12 items-center justify-center"
      >
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 2.5, ease: "easeInOut", repeat: Infinity }}
          className="absolute inset-0 rounded-full bg-emerald-500/20"
        />
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10">
          <Check className="h-6 w-6 text-emerald-400" strokeWidth={2.5} />
        </div>
      </motion.div>

      <div className="text-center">
        <motion.h3
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-[15px] font-bold text-ink-primary"
        >
          Transformation Complete
        </motion.h3>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-0.5 text-[10px] text-ink-tertiary"
        >
          Your Gaming Desktop has been optimized
        </motion.p>
      </div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="flex gap-2"
      >
        {[
          { value: 42, label: "Applied", color: "text-emerald-400", icon: Check },
          { value: 0, label: "Failed", color: "text-ink-muted", icon: AlertCircle },
          { value: 8, label: "Preserved", color: "text-ink-secondary", icon: Shield },
        ].map(({ value, label, color, icon: Icon }) => (
          <div key={label} className="flex flex-col items-center gap-0.5 rounded-lg border border-border-default bg-surface-card/50 px-3 py-2">
            <Icon size={10} className={color} />
            <span className={`font-mono text-[16px] font-bold ${color}`}>{value}</span>
            <span className="text-[8px] text-ink-muted">{label}</span>
          </div>
        ))}
      </motion.div>

      {/* Trust line */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="text-[8px] text-ink-muted text-center max-w-[240px]"
      >
        Rollback snapshot created before every change. Full execution log available.
      </motion.p>
    </div>
  );
}

// ─── Step content router ────────────────────────────────────────────────────

function StepContent({ stepId }: { stepId: string }) {
  switch (stepId) {
    case "welcome": return <WelcomeContent />;
    case "assessment": return <AssessmentContent />;
    case "profile": return <ProfileContent />;
    case "strategy": return <StrategyContent />;
    case "review": return <ReviewContent />;
    case "execution": return <ExecutionContent />;
    case "report": return <ReportContent />;
    default: return null;
  }
}

// ─── Main showcase ──────────────────────────────────────────────────────────

export function WizardShowcase() {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-10% 0px" });
  const [activeStep, setActiveStep] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const advance = useCallback(() => {
    setActiveStep((prev) => (prev + 1) % STEPS.length);
  }, []);

  useEffect(() => {
    if (!isInView || isPaused) return;
    timerRef.current = setTimeout(advance, STEPS[activeStep].duration);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [activeStep, isInView, isPaused, advance]);

  return (
    <section
      ref={sectionRef}
      className="relative py-16 md:py-20 lg:py-24"
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: duration.slow, ease: easing.enter }}
          className="text-center mb-12"
        >
          <p className="overline">Live Preview</p>
          <h2 className="mt-3 text-3xl md:text-4xl lg:text-5xl font-bold text-ink-primary leading-tight">
            Not a control panel.
            <br className="hidden sm:block" />
            <span className="text-ink-secondary">A guided journey.</span>
          </h2>
          <p className="mt-4 text-[15px] text-ink-tertiary max-w-xl mx-auto">
            Every step explains what it does and why. You stay in control.
          </p>
        </motion.div>

        {/* App window */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: duration.dramatic, ease: easing.emphasized, delay: 0.2 }}
          className="relative max-w-2xl mx-auto"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* Glow effect */}
          <div className="absolute -inset-px rounded-xl bg-gradient-to-b from-brand-500/20 via-transparent to-transparent opacity-60 blur-sm pointer-events-none" />

          <div className="premium-card rounded-xl overflow-hidden relative" style={{ transform: "perspective(1200px) rotateX(1.5deg)" }}>
            {/* Title bar */}
            <div className="bg-surface-raised h-9 flex items-center px-3.5 border-b border-border-default">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
              </div>
              <div className="flex-1 flex items-center justify-center gap-1.5">
                <LogoMark size={14} />
                <span className="text-[11px] font-semibold text-ink-secondary">
                  red<span className="text-brand-500">core</span>{" "}
                  <span className="font-normal text-ink-tertiary">OS</span>
                </span>
              </div>
              <div className="w-[42px]" />
            </div>

            {/* Body */}
            <div className="flex" style={{ height: 340 }}>
              {/* Left rail */}
              <StepRail activeIndex={activeStep} />

              {/* Content area */}
              <div className="flex-1 bg-surface-base relative overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={STEPS[activeStep].id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25, ease: easing.enter }}
                    className="h-full"
                  >
                    <StepContent stepId={STEPS[activeStep].id} />
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* Bottom bar */}
            <div className="bg-surface-raised/80 px-4 py-2 flex items-center gap-3 border-t border-border-default">
              {/* Step dots */}
              <div className="flex items-center gap-1">
                {STEPS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveStep(i)}
                    className={[
                      "w-1.5 h-1.5 rounded-full transition-all duration-200",
                      i === activeStep ? "bg-brand-500 w-4" : i < activeStep ? "bg-brand-500/40" : "bg-surface-overlay",
                    ].join(" ")}
                  />
                ))}
              </div>
              {/* Progress */}
              <div className="flex-1">
                <div className="h-0.5 rounded-full bg-surface-overlay overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-brand-500"
                    animate={{ width: `${((activeStep + 1) / STEPS.length) * 100}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>
              {/* Pause indicator */}
              <span className="text-[9px] font-mono text-ink-muted">
                {isPaused ? "paused" : `${STEPS[activeStep].label.toLowerCase()}`}
              </span>
            </div>
          </div>
        </motion.div>

        {/* CTA below showcase */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.6, duration: duration.slow }}
          className="mt-10 flex flex-col items-center gap-3"
        >
          <a
            href="/downloads"
            className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2.5 text-[13px] font-semibold text-white shadow-lg shadow-brand-500/25 transition-all hover:bg-brand-600 hover:shadow-brand-500/35 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Download size={15} />
            Download — it&apos;s free
          </a>
          <p className="text-[11px] text-ink-muted font-mono">
            Windows 10 & 11 · 100% reversible · No subscription
          </p>
        </motion.div>
      </div>
    </section>
  );
}
