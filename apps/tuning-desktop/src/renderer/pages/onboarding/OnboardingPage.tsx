import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import type { Variants } from "framer-motion";
import {
  Zap,
  Gamepad2,
  BarChart3,
  Gauge,
  Settings2,
  Shield,
  RotateCcw,
  Eye,
  ArrowRight,
  ArrowLeft,
  Check,
  Cpu,
  MemoryStick,
  HardDrive,
  MonitorCheck,
  Thermometer,
  Crown,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { spring, staggerContainer, staggerChild } from "@redcore/design-system";
import { toast } from "@/components/ui/Toast";

// ─── Step slide variants ──────────────────────────────────────────────────

function stepVariants(direction: 1 | -1): Variants {
  return {
    hidden: { opacity: 0, x: direction * 48 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.3,
        ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
        staggerChildren: 0.06,
      },
    },
    exit: {
      opacity: 0,
      x: direction * -48,
      transition: {
        duration: 0.2,
        ease: [0.4, 0, 1, 1] as [number, number, number, number],
      },
    },
  };
}

const itemVariant: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

// ─── Profile options ──────────────────────────────────────────────────────

const profiles = [
  {
    id: "gaming",
    icon: Gamepad2,
    title: "Gaming",
    description: "Max FPS, low latency scheduler, GPU priority, XMP enabled",
  },
  {
    id: "productivity",
    icon: BarChart3,
    title: "Productivity",
    description: "Balanced power, fast app launches, memory optimization",
  },
  {
    id: "balanced",
    icon: Gauge,
    title: "Balanced",
    description: "Sensible defaults, safe tweaks only, nothing aggressive",
  },
  {
    id: "custom",
    icon: Settings2,
    title: "Custom",
    description: "Review every recommendation individually before applying",
  },
] as const;

type ProfileId = (typeof profiles)[number]["id"];

// ─── Scan items ───────────────────────────────────────────────────────────

const scanItems = [
  { id: "cpu", label: "CPU & Scheduler", icon: Cpu, delay: 400 },
  { id: "gpu", label: "GPU & Display", icon: MonitorCheck, delay: 900 },
  { id: "memory", label: "Memory & XMP", icon: MemoryStick, delay: 1400 },
  { id: "storage", label: "Storage Health", icon: HardDrive, delay: 1900 },
  { id: "windows", label: "Windows Config", icon: Settings2, delay: 2400 },
  { id: "thermal", label: "Thermal Profile", icon: Thermometer, delay: 2900 },
];

// ─── Safety feature rows ──────────────────────────────────────────────────

const safetyFeatures = [
  {
    icon: Eye,
    title: "Every change is explained",
    description:
      "You'll see exactly what each tweak does, what registry key it modifies, and the expected impact before anything is applied.",
  },
  {
    icon: RotateCcw,
    title: "Fully reversible",
    description:
      "Every action creates a rollback snapshot. One click to undo any change, individually or all at once.",
  },
  {
    icon: Shield,
    title: "Windows-version aware",
    description:
      "Each tweak is validated against your exact Windows build. Incompatible tweaks are automatically excluded.",
  },
];

const FREE_FEATURES = [
  "Full hardware scan and classification",
  "Safe tuning actions (unlimited)",
  "App Hub with silent installers",
  "Benchmark lab with comparisons",
  "Rollback center with snapshots",
  "Machine intelligence and recommendations",
];

const PRO_FEATURES = [
  "Advanced low-level tuning actions",
  "Reboot-resume workflow",
  "Thermal deep analysis",
  "GPU P-State and timer resolution control",
  "Expert mode with high-risk actions",
  "Priority support",
];

// ─── Constants ────────────────────────────────────────────────────────────

const TOTAL_STEPS = 6;

const STEP_LABELS = [
  "Welcome",
  "System Scan",
  "Your Profile",
  "Safety",
  "License",
  "Ready",
];

// ─── Main component ───────────────────────────────────────────────────────

export function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [selectedProfile, setSelectedProfile] = useState<ProfileId>("balanced");
  const [licenseKey, setLicenseKey] = useState("");
  const [activatingLicense, setActivatingLicense] = useState(false);
  const [scannedItems, setScannedItems] = useState<Set<string>>(new Set());
  const [scanComplete, setScanComplete] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Auto-advance scan step
  useEffect(() => {
    if (step !== 1) return;
    setScannedItems(new Set());
    setScanComplete(false);

    const timers: ReturnType<typeof setTimeout>[] = [];
    scanItems.forEach(({ id, delay }) => {
      timers.push(
        setTimeout(() => {
          setScannedItems((prev) => new Set([...prev, id]));
        }, delay)
      );
    });
    timers.push(
      setTimeout(() => {
        setScanComplete(true);
      }, 3600)
    );

    return () => timers.forEach(clearTimeout);
  }, [step]);

  const goTo = (next: number) => {
    setDirection(next > step ? 1 : -1);
    setStep(next);
  };

  const goNext = () => {
    if (step < TOTAL_STEPS - 1) goTo(step + 1);
    else navigate("/dashboard", { replace: true });
  };

  const handleLicenseContinue = async () => {
    const normalized = licenseKey.trim().toUpperCase();
    if (!normalized) {
      goNext();
      return;
    }

    setActivatingLicense(true);
    try {
      await window.redcore.license.activate(normalized);
      toast.success("License Activated", "Premium features are now unlocked on this machine.");
      goNext();
    } catch (error) {
      toast.error(
        "Activation Failed",
        error instanceof Error ? error.message : "Could not activate this license key.",
      );
    } finally {
      setActivatingLicense(false);
    }
  };

  const goBack = () => {
    if (step > 0) goTo(step - 1);
  };

  const progressPct = Math.round((step / (TOTAL_STEPS - 1)) * 100);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0D0D10]">
      {/* ── Left panel (fixed) ─────────────────────────────────── */}
      <div className="hidden w-[340px] shrink-0 flex-col justify-between p-10 lg:flex">
        {/* Brand */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex items-center gap-3"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500">
            <Zap
              className="text-white"
              strokeWidth={2.5}
              style={{ width: 18, height: 18 }}
            />
          </div>
          <div>
            <p className="text-sm font-bold tracking-tight text-white">
              redcore<span className="text-brand-400"> · Tuning</span>
            </p>
            <p className="text-[10px] uppercase tracking-widest text-neutral-600">
              Precision Performance
            </p>
          </div>
        </motion.div>

        {/* Step nav */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="space-y-1"
        >
          {STEP_LABELS.map((label, i) => (
            <div key={i} className="flex items-center gap-3">
              <motion.div
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition-all duration-300 ${
                  i < step
                    ? "bg-brand-500 text-white"
                    : i === step
                    ? "bg-brand-500/20 text-brand-400 ring-1 ring-brand-500/40"
                    : "bg-neutral-800 text-neutral-600"
                }`}
                animate={{ scale: i === step ? 1.1 : 1 }}
                transition={spring.snappy}
              >
                {i < step ? (
                  <Check style={{ width: 10, height: 10 }} strokeWidth={2.5} />
                ) : (
                  i + 1
                )}
              </motion.div>
              <span
                className={`text-xs transition-colors duration-300 ${
                  i === step
                    ? "font-medium text-neutral-200"
                    : i < step
                    ? "text-neutral-500 line-through"
                    : "text-neutral-700"
                }`}
              >
                {label}
              </span>
            </div>
          ))}
        </motion.div>

        {/* Progress */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs text-neutral-600">Setup progress</span>
            <span className="font-mono text-xs text-neutral-500">
              {progressPct}%
            </span>
          </div>
          <div className="h-1 w-full rounded-full bg-neutral-800">
            <motion.div
              className="h-full rounded-full bg-brand-500"
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.4, ease: [0.2, 0, 0, 1] }}
            />
          </div>
        </motion.div>
      </div>

      {/* ── Right panel (animated) ─────────────────────────────── */}
      <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden bg-surface px-8 md:px-16">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={stepVariants(direction)}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="w-full max-w-lg"
          >
            {/* ── Step 0: Welcome ── */}
            {step === 0 && (
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
                className="space-y-6"
              >
                <motion.div
                  variants={itemVariant}
                  className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-500 shadow-lg shadow-brand-500/30"
                >
                  <Zap className="h-8 w-8 text-white" strokeWidth={2.5} />
                </motion.div>
                <motion.div variants={itemVariant}>
                  <h1 className="text-3xl font-bold tracking-tight text-ink">
                    Welcome to
                    <br />
                    <span className="text-brand-500">redcore · Tuning</span>
                  </h1>
                  <p className="mt-3 text-base leading-relaxed text-ink-secondary">
                    Precision performance optimization for Windows. We'll scan
                    your hardware, build a profile, and apply only safe,
                    reversible tweaks.
                  </p>
                </motion.div>
                <motion.div
                  variants={itemVariant}
                  className="flex flex-col gap-3 pt-2"
                >
                  <Button
                    size="lg"
                    onClick={goNext}
                    iconPosition="right"
                    icon={<ArrowRight className="h-4 w-4" />}
                  >
                    Get Started
                  </Button>
                  <Button
                    variant="ghost"
                    size="lg"
                    onClick={() => navigate("/dashboard", { replace: true })}
                  >
                    I already have an account
                  </Button>
                </motion.div>
              </motion.div>
            )}

            {/* ── Step 1: System Scan ── */}
            {step === 1 && (
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
                className="space-y-6"
              >
                <motion.div variants={itemVariant}>
                  <h1 className="text-2xl font-bold tracking-tight text-ink">
                    Scanning your system
                  </h1>
                  <p className="mt-2 text-sm text-ink-secondary">
                    We're profiling your hardware to generate accurate,
                    machine-specific recommendations.
                  </p>
                </motion.div>

                <motion.div variants={itemVariant} className="space-y-2.5">
                  {scanItems.map(({ id, label, icon: Icon }) => {
                    const done = scannedItems.has(id);
                    return (
                      <motion.div
                        key={id}
                        className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-all duration-300 ${
                          done
                            ? "border-green-500/20 bg-green-500/10"
                            : "border-border bg-surface-overlay"
                        }`}
                      >
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors duration-300 ${
                            done ? "bg-green-500/20" : "bg-white/[0.06]"
                          }`}
                        >
                          <Icon
                            className={`h-4 w-4 transition-colors duration-300 ${
                              done ? "text-green-400" : "text-ink-tertiary"
                            }`}
                            strokeWidth={1.5}
                          />
                        </div>
                        <span
                          className={`flex-1 text-sm font-medium transition-colors duration-300 ${
                            done ? "text-ink" : "text-ink-secondary"
                          }`}
                        >
                          {label}
                        </span>
                        <AnimatePresence mode="wait">
                          {done ? (
                            <motion.div
                              key="done"
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={spring.bounce}
                            >
                              <CheckCircle2
                                className="text-green-400"
                                strokeWidth={1.5}
                                style={{ width: 18, height: 18 }}
                              />
                            </motion.div>
                          ) : (
                            <motion.div
                              key="pending"
                              className="h-4 w-4 rounded-full border-2 border-white/[0.12]"
                              initial={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                            />
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </motion.div>

                <motion.div variants={itemVariant}>
                  <ProgressBar
                    value={(scannedItems.size / scanItems.length) * 100}
                    variant="brand"
                    size="xs"
                    label="Scan progress"
                    showValue
                  />
                </motion.div>

                <motion.div variants={itemVariant}>
                  <Button
                    size="lg"
                    onClick={goNext}
                    disabled={!scanComplete}
                    iconPosition="right"
                    icon={<ArrowRight className="h-4 w-4" />}
                    className="w-full"
                  >
                    {scanComplete ? "Continue" : "Scanning\u2026"}
                  </Button>
                </motion.div>
              </motion.div>
            )}

            {/* ── Step 2: Profile Selection ── */}
            {step === 2 && (
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
                className="space-y-5"
              >
                <motion.div variants={itemVariant}>
                  <h1 className="text-2xl font-bold tracking-tight text-ink">
                    Choose your profile
                  </h1>
                  <p className="mt-2 text-sm text-ink-secondary">
                    This shapes which optimizations we recommend. You can change
                    it anytime.
                  </p>
                </motion.div>

                <motion.div
                  variants={itemVariant}
                  className="grid grid-cols-2 gap-3"
                >
                  {profiles.map(({ id, icon: Icon, title, description }) => {
                    const isSelected = selectedProfile === id;
                    return (
                      <motion.button
                        key={id}
                        type="button"
                        onClick={() => setSelectedProfile(id)}
                        whileHover={{ y: -2, transition: spring.gentle }}
                        whileTap={{ scale: 0.98 }}
                        className={`relative rounded-xl border-2 p-4 text-left transition-all duration-200 ${
                          isSelected
                            ? "border-brand-500 bg-brand-500/10 shadow-sm shadow-brand-500/10"
                            : "border-border bg-surface-overlay hover:border-white/[0.16]"
                        }`}
                      >
                        {isSelected && (
                          <motion.div
                            layoutId="profile-check"
                            className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-brand-500"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={spring.bounce}
                          >
                            <Check
                              className="text-white"
                              strokeWidth={2.5}
                              style={{ width: 12, height: 12 }}
                            />
                          </motion.div>
                        )}
                        <div
                          className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg ${
                            isSelected ? "bg-brand-500/20" : "bg-white/[0.06]"
                          }`}
                        >
                          <Icon
                            className={`${
                              isSelected ? "text-brand-400" : "text-ink-secondary"
                            }`}
                            style={{ width: 18, height: 18 }}
                            strokeWidth={1.5}
                          />
                        </div>
                        <p
                          className={`text-sm font-semibold ${
                            isSelected ? "text-brand-400" : "text-ink"
                          }`}
                        >
                          {title}
                        </p>
                        <p
                          className={`mt-1 text-xs leading-snug ${
                            isSelected
                              ? "text-brand-400/70"
                              : "text-ink-tertiary"
                          }`}
                        >
                          {description}
                        </p>
                      </motion.button>
                    );
                  })}
                </motion.div>

                <motion.div variants={itemVariant} className="flex gap-3">
                  <Button
                    variant="secondary"
                    size="lg"
                    onClick={goBack}
                    icon={<ArrowLeft className="h-4 w-4" />}
                  >
                    Back
                  </Button>
                  <Button
                    size="lg"
                    onClick={goNext}
                    iconPosition="right"
                    icon={<ArrowRight className="h-4 w-4" />}
                    className="flex-1"
                  >
                    Continue
                  </Button>
                </motion.div>
              </motion.div>
            )}

            {/* ── Step 3: Safety Explanation ── */}
            {step === 3 && (
              <div className="space-y-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-green-500/10 border border-green-500/20">
                  <Shield className="h-6 w-6 text-green-400" strokeWidth={1.5} />
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-ink">
                  Built for safety
                </h1>
                <p className="mt-2 text-sm text-ink-secondary">
                  We take every precaution. Your system is never at risk.
                </p>

                {safetyFeatures.map(({ icon: Icon, title, description }) => (
                  <div key={title} className="flex gap-4 rounded-xl border border-border bg-surface-overlay p-4">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-green-500/10">
                      <Icon className="h-4 w-4 text-green-400" strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-ink">{title}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-ink-tertiary">{description}</p>
                    </div>
                  </div>
                ))}

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-border bg-surface-overlay accent-brand-500"
                  />
                  <div>
                    <p className="text-sm font-medium text-ink">I understand that changes are reversible and safe</p>
                    <p className="mt-0.5 text-xs text-ink-tertiary">You can roll back any change from the Rollback Center at any time.</p>
                  </div>
                </label>

                <div className="flex gap-3">
                  <Button variant="secondary" size="lg" onClick={goBack} icon={<ArrowLeft className="h-4 w-4" />}>
                    Back
                  </Button>
                  <Button size="lg" onClick={goNext} disabled={!agreedToTerms} iconPosition="right" icon={<ArrowRight className="h-4 w-4" />} className="flex-1">
                    I Understand
                  </Button>
                </div>
              </div>
            )}

            {/* ── Step 4: License / Account ── */}
            {step === 4 && (
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
                className="space-y-5"
              >
                <motion.div variants={itemVariant}>
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500/10 border border-brand-500/20">
                    <Crown
                      className="h-6 w-6 text-brand-400"
                      strokeWidth={1.5}
                    />
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight text-ink">
                    Activate your license
                  </h1>
                  <p className="mt-2 text-sm text-ink-secondary">
                    Enter your license key to unlock all features, or continue
                    with the free tier.
                  </p>
                </motion.div>

                {/* Free vs Premium comparison */}
                <motion.div
                  variants={itemVariant}
                  className="grid grid-cols-2 gap-3"
                >
                  <div className="rounded-xl border border-border bg-surface-overlay p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-ink-tertiary">
                      Free
                    </p>
                    <ul className="mt-3 space-y-2">
                      {FREE_FEATURES.map((f) => (
                        <li
                          key={f}
                          className="flex items-center gap-2 text-xs text-ink-secondary"
                        >
                          <Check
                            className="text-ink-tertiary"
                            style={{ width: 12, height: 12 }}
                          />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="relative rounded-xl border-2 border-brand-500/30 bg-brand-500/10 p-4">
                    <div className="absolute -top-2 right-3 rounded-full bg-brand-500 px-2 py-0.5 text-[10px] font-bold text-white">
                      PRO
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-brand-400">
                      Premium
                    </p>
                    <ul className="mt-3 space-y-2">
                      {PRO_FEATURES.map((f) => (
                        <li
                          key={f}
                          className="flex items-center gap-2 text-xs text-brand-400/80"
                        >
                          <Check
                            className="text-brand-400"
                            style={{ width: 12, height: 12 }}
                          />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>

                <motion.div variants={itemVariant}>
                  <Input
                    label="License key"
                    placeholder="RCTU-XXXX-XXXX-XXXX"
                    value={licenseKey}
                    onChange={(e) => setLicenseKey(e.target.value)}
                    hint="Found in your purchase confirmation email"
                  />
                </motion.div>

                <motion.div variants={itemVariant} className="flex flex-col gap-2.5">
                  <Button
                    size="lg"
                    onClick={() => void handleLicenseContinue()}
                    disabled={licenseKey.length > 0 && licenseKey.length < 16}
                    loading={activatingLicense}
                    iconPosition="right"
                    icon={<ArrowRight className="h-4 w-4" />}
                    className="w-full"
                  >
                    {licenseKey.length >= 16
                      ? "Activate License"
                      : "Continue with Free"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="lg"
                    onClick={goBack}
                    className="w-full"
                  >
                    Back
                  </Button>
                </motion.div>
              </motion.div>
            )}

            {/* ── Step 5: Ready ── */}
            {step === 5 && (
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
                className="space-y-6 text-center"
              >
                <motion.div
                  variants={itemVariant}
                  className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-brand-500 shadow-xl shadow-brand-500/30"
                >
                  <motion.div
                    initial={{ rotate: -10, scale: 0.8 }}
                    animate={{ rotate: 0, scale: 1 }}
                    transition={{ ...spring.bounce, delay: 0.2 }}
                  >
                    <Zap className="h-10 w-10 text-white" strokeWidth={2.5} />
                  </motion.div>
                </motion.div>

                <motion.div variants={itemVariant}>
                  <h1 className="text-3xl font-bold tracking-tight text-ink">
                    You're all set!
                  </h1>
                  <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
                    Your system has been profiled and your{" "}
                    <span className="font-semibold capitalize text-ink">
                      {selectedProfile}
                    </span>{" "}
                    optimization plan is ready. Time to tune.
                  </p>
                </motion.div>

                <motion.div
                  variants={itemVariant}
                  className="rounded-xl border border-border bg-surface-overlay p-5 text-left"
                >
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-tertiary">
                    Your Setup
                  </p>
                  <div className="space-y-2">
                    {[
                      {
                        label: "Profile",
                        value:
                          profiles.find((p) => p.id === selectedProfile)
                            ?.title ?? selectedProfile,
                      },
                      {
                        label: "Scan",
                        value: "Complete \u2014 6 systems analysed",
                      },
                      {
                        label: "Safety",
                        value: "Rollback snapshots enabled",
                      },
                      {
                        label: "License",
                        value:
                          licenseKey.length >= 16
                            ? "Premium \u2014 Activated"
                            : "Free tier",
                      },
                    ].map(({ label, value }) => (
                      <div
                        key={label}
                        className="flex items-center justify-between"
                      >
                        <span className="text-xs text-ink-tertiary">{label}</span>
                        <span className="text-xs font-medium text-ink-secondary">
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>
                </motion.div>

                <motion.div
                  variants={staggerChild}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <Button
                    size="lg"
                    onClick={() => navigate("/dashboard", { replace: true })}
                    iconPosition="right"
                    icon={<ArrowRight className="h-4 w-4" />}
                    className="w-full"
                  >
                    Open Dashboard
                  </Button>
                </motion.div>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Mobile back button */}
        {step > 0 && step < 5 && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute bottom-8 left-8 flex items-center gap-1.5 text-xs text-ink-tertiary hover:text-ink-secondary transition-colors lg:hidden"
            onClick={goBack}
          >
            <ArrowLeft style={{ width: 14, height: 14 }} />
            Back
          </motion.button>
        )}
      </div>
    </div>
  );
}
