"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import {
  Cpu,
  Monitor,
  MemoryStick,
  HardDrive,
  Thermometer,
  AppWindow,
  Power,
  Briefcase,
  Server,
  Laptop,
  Gamepad2,
  Shield,
  type LucideIcon,
} from "lucide-react";
import {
  staggerContainer,
  staggerChild,
  spring,
  duration,
  easing,
} from "@/lib/motion";

// Types

interface SignalCard {
  icon: LucideIcon;
  title: string;
  reads: string;
}

interface MachineProfile {
  id: string;
  icon: LucideIcon;
  name: string;
  color: string;
  tagline: string;
  strategy: string;
  signals: string[];
}

// Data

const signalCards: SignalCard[] = [
  { icon: Cpu, title: "CPU", reads: "Architecture, cores, frequency" },
  { icon: Monitor, title: "GPU", reads: "Vendor, VRAM, driver version" },
  { icon: MemoryStick, title: "Memory", reads: "Capacity, speed, channels" },
  { icon: HardDrive, title: "Storage", reads: "Type, health, capacity" },
  { icon: Thermometer, title: "Thermals", reads: "Temperature, throttling" },
  { icon: AppWindow, title: "Windows Build", reads: "Version, edition, build" },
  { icon: Power, title: "Startup Load", reads: "Programs, delay, impact" },
  { icon: Briefcase, title: "Work Indicators", reads: "Domain, RDP, enterprise" },
];

const profiles: MachineProfile[] = [
  {
    id: "gaming-desktop",
    icon: Monitor,
    name: "Gaming Desktop",
    color: "#E8453C",
    tagline: "Maximum performance, zero compromise.",
    strategy:
      "Aggressive service reduction, scheduler tuning for low-latency, power plan override to full performance. Startup stripped to essentials, network latency optimized for competitive play.",
    signals: ["Dedicated GPU", "16GB+ RAM", "Game launchers"],
  },
  {
    id: "budget-desktop",
    icon: Cpu,
    name: "Budget Desktop",
    color: "#3B82F6",
    tagline: "Every megabyte matters.",
    strategy:
      "Memory-focused optimization. Aggressive bloatware removal, visual effects reduced, background services minimized. Prioritizes responsiveness over aesthetics.",
    signals: ["Integrated GPU", "4-8GB RAM", "Older CPU"],
  },
  {
    id: "workstation",
    icon: Server,
    name: "Workstation",
    color: "#F59E0B",
    tagline: "Stability is the feature.",
    strategy:
      "Conservative optimization preserving professional workflows. Creative and dev tools untouched, multi-monitor support maintained, high-memory workloads prioritized.",
    signals: ["Pro GPU", "32GB+ RAM", "Creator apps"],
  },
  {
    id: "office-laptop",
    icon: Laptop,
    name: "Office Laptop",
    color: "#38BDF8",
    tagline: "Battery life meets productivity.",
    strategy:
      "Battery-aware power management, thermal throttle prevention, bloatware removal with OEM driver preservation. Quiet background operation for meetings.",
    signals: ["Battery present", "Office suite", "Integrated GPU"],
  },
  {
    id: "gaming-laptop",
    icon: Gamepad2,
    name: "Gaming Laptop",
    color: "#F97316",
    tagline: "Desktop power, portable form.",
    strategy:
      "Hybrid power profiles for plugged vs battery modes. Thermal management critical, GPU switching optimized, fan curves respected. Performance on AC, efficiency on battery.",
    signals: ["Dedicated mobile GPU", "Battery", "High-res display"],
  },
  {
    id: "low-spec",
    icon: HardDrive,
    name: "Low-spec",
    color: "#EAB308",
    tagline: "Resurrect what others abandoned.",
    strategy:
      "Maximum resource recovery. Visual effects disabled, services stripped to bare minimum, memory management aggressive. Every cycle counts on limited hardware.",
    signals: ["2-4GB RAM", "HDD primary", "Legacy build"],
  },
  {
    id: "vm-cautious",
    icon: Shield,
    name: "VM / Cautious",
    color: "#22C55E",
    tagline: "When in doubt, do less.",
    strategy:
      "Minimal intervention mode. Virtual environment detected or unusual hardware signatures trigger conservative-only operations. Only safe, reversible changes applied.",
    signals: ["VM detected", "Sandbox indicators", "Limited perms"],
  },
  {
    id: "work-pc",
    icon: Briefcase,
    name: "Work PC",
    color: "#818CF8",
    tagline: "Enterprise-safe optimization.",
    strategy:
      "Business services fully preserved — Print Spooler, RDP, SMB, Group Policy, VPN, DNS Client untouched. Targets bloatware and non-critical consumer services only.",
    signals: ["Domain-joined", "RDP enabled", "Enterprise policies"],
  },
];

// Animation Variants

const profileDetailVariants = {
  enter: { opacity: 0, y: 20, filter: "blur(6px)" },
  center: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: duration.slow, ease: easing.enter },
  },
  exit: {
    opacity: 0,
    y: -16,
    filter: "blur(6px)",
    transition: { duration: duration.fast, ease: easing.exit },
  },
};

// Sub-components

function SignalCardItem({ card }: { card: SignalCard }) {
  const Icon = card.icon;

  return (
    <motion.div
      variants={staggerChild}
      className="rounded-lg bg-surface border border-border-default p-4"
    >
      <div className="flex items-center gap-2.5">
        <Icon size={16} strokeWidth={1.5} className="text-ink-tertiary flex-shrink-0" />
        <span className="text-[13px] font-medium text-ink-primary">{card.title}</span>
      </div>
      <p className="mt-1.5 text-[12px] text-ink-tertiary leading-relaxed pl-[26px]">
        {card.reads}
      </p>
    </motion.div>
  );
}

function ProfileEmblem({
  profile,
  active,
  onClick,
}: {
  profile: MachineProfile;
  active: boolean;
  onClick: () => void;
}) {
  const Icon = profile.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`View ${profile.name} profile`}
      aria-pressed={active}
      className="group relative flex flex-col items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-base rounded-lg p-1.5 cursor-pointer transition-transform"
    >
      {/* Active glow */}
      {active && (
        <motion.div
          layoutId="profile-glow"
          className="absolute inset-0 rounded-lg pointer-events-none"
          style={{
            boxShadow: `0 0 20px ${profile.color}20`,
          }}
          transition={spring.smooth}
        />
      )}

      {/* Circle */}
      <motion.div
        animate={{
          scale: active ? 1.08 : 1,
          borderColor: active ? profile.color : "var(--color-border-default)",
        }}
        transition={spring.snappy}
        className="relative z-10 flex items-center justify-center w-12 h-12 rounded-full border-2 transition-colors"
        style={{
          backgroundColor: active ? `${profile.color}15` : "var(--color-surface-overlay)",
        }}
      >
        <Icon
          size={20}
          strokeWidth={1.75}
          style={{ color: active ? profile.color : "var(--color-ink-tertiary)" }}
        />
      </motion.div>

      {/* Label */}
      <span
        className="text-[11px] font-medium leading-tight text-center max-w-[60px] transition-colors"
        style={{ color: active ? profile.color : "var(--color-ink-tertiary)" }}
      >
        {profile.name}
      </span>
    </button>
  );
}

function ProfileDetailPanel({ profile }: { profile: MachineProfile }) {
  return (
    <motion.div
      key={profile.id}
      variants={profileDetailVariants}
      initial="enter"
      animate="center"
      exit="exit"
      className="premium-card rounded-lg p-6 md:p-8"
    >
      <div className="flex flex-col gap-5">
        {/* Name & tagline */}
        <div>
          <h3 className="text-2xl font-bold" style={{ color: profile.color }}>
            {profile.name}
          </h3>
          <p className="mt-1 text-ink-secondary text-[15px]">{profile.tagline}</p>
        </div>

        {/* Strategy */}
        <p className="text-[15px] text-ink-secondary leading-relaxed">
          {profile.strategy}
        </p>

        {/* Signal pills */}
        <div className="flex flex-wrap gap-2">
          {profile.signals.map((signal) => (
            <span
              key={signal}
              className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
              style={{
                color: profile.color,
                backgroundColor: `${profile.color}12`,
                border: `1px solid ${profile.color}20`,
              }}
            >
              {signal}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// Main Component

export function IntelligenceSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-15% 0px" });

  const [activeIndex, setActiveIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const activeProfile = profiles[activeIndex];

  // Auto-rotate timer management
  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % profiles.length);
    }, 4000);
  }, []);

  useEffect(() => {
    if (!isInView) return;
    startTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isInView, startTimer]);

  const handleSelect = (index: number) => {
    setActiveIndex(index);
    startTimer(); // Reset timer on manual selection
  };

  return (
    <section
      ref={sectionRef}
      id="intelligence"
      className="relative py-16 md:py-20 lg:py-24"
      aria-labelledby="intelligence-heading"
    >
      <div className="section-divide" aria-hidden="true" />

      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Header */}
        <motion.div
          variants={staggerContainer(0.1, 0)}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
        >
          <motion.h2
            id="intelligence-heading"
            variants={staggerChild}
            className="mt-4 text-4xl md:text-5xl font-bold text-ink-primary leading-tight"
          >
            Every machine is different.
            <br className="hidden sm:block" />
            <span className="text-ink-primary">We know yours.</span>
          </motion.h2>
        </motion.div>

        {/* Signal Grid */}
        <motion.div
          variants={staggerContainer(0.05, 0.3)}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
          role="list"
          aria-label="Detection signals"
        >
          {signalCards.map((card) => (
            <div key={card.title} role="listitem">
              <SignalCardItem card={card} />
            </div>
          ))}
        </motion.div>

        {/* Profile Showcase */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: duration.slow, ease: easing.enter, delay: 0.6 }}
          className="mt-24"
        >
          {/* Profile selector row */}
          <div
            className="flex flex-wrap justify-center gap-3 sm:gap-5 lg:gap-6"
            role="tablist"
            aria-label="Machine profiles"
          >
            {profiles.map((profile, index) => (
              <div key={profile.id} role="tab" aria-selected={index === activeIndex}>
                <ProfileEmblem
                  profile={profile}
                  active={index === activeIndex}
                  onClick={() => handleSelect(index)}
                />
              </div>
            ))}
          </div>

          {/* Detail panel */}
          <div
            className="mt-10 max-w-2xl mx-auto"
            role="tabpanel"
            aria-label={`${activeProfile.name} profile details`}
          >
            <AnimatePresence mode="wait">
              <ProfileDetailPanel key={activeProfile.id} profile={activeProfile} />
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
