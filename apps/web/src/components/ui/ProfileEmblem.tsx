"use client";

import { motion } from "framer-motion";
import {
  Monitor,
  Cpu,
  Server,
  Laptop,
  Gamepad2,
  HardDrive,
  Shield,
  Briefcase,
  type LucideIcon,
} from "lucide-react";
import { spring } from "@/lib/motion";

// Profile Registry

interface ProfileConfig {
  icon: LucideIcon;
  label: string;
  color: string;
}

const PROFILES: Record<string, ProfileConfig> = {
  "gaming-desktop": { icon: Monitor, label: "Gaming Desktop", color: "#E8453C" },
  "budget-desktop": { icon: Cpu, label: "Budget Desktop", color: "#3B82F6" },
  workstation: { icon: Server, label: "Workstation", color: "#F59E0B" },
  "office-laptop": { icon: Laptop, label: "Office Laptop", color: "#38BDF8" },
  "gaming-laptop": { icon: Gamepad2, label: "Gaming Laptop", color: "#F97316" },
  "low-spec": { icon: HardDrive, label: "Low Spec", color: "#EAB308" },
  "vm-cautious": { icon: Shield, label: "VM Cautious", color: "#22C55E" },
  "work-pc": { icon: Briefcase, label: "Work PC", color: "#818CF8" },
};

// Size Map

const sizeConfig = {
  sm: { container: 40, icon: 16, text: "text-[10px]", gap: "gap-1.5", showLabel: false },
  md: { container: 56, icon: 22, text: "text-xs", gap: "gap-2", showLabel: true },
  lg: { container: 72, icon: 28, text: "text-sm", gap: "gap-2.5", showLabel: true },
} as const;

// Types

interface ProfileEmblemProps {
  profile: string;
  size?: "sm" | "md" | "lg";
  active?: boolean;
  className?: string;
}

// Component

export function ProfileEmblem({
  profile,
  size = "md",
  active = false,
  className = "",
}: ProfileEmblemProps) {
  const config = PROFILES[profile];

  if (!config) {
    return null;
  }

  const { icon: Icon, label, color } = config;
  const sz = sizeConfig[size];

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      transition={spring.snappy}
      className={[
        "inline-flex flex-col items-center",
        sz.gap,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Icon circle */}
      <div
        className="flex items-center justify-center rounded-full bg-[var(--surface-raised)] border transition-all duration-300"
        style={{
          width: sz.container,
          height: sz.container,
          borderColor: active ? color : "var(--color-border-default)",
          boxShadow: active ? `0 0 20px ${color}40` : "none",
          transform: active ? "scale(1.05)" : "scale(1)",
        }}
      >
        <Icon size={sz.icon} style={{ color }} strokeWidth={1.75} />
      </div>

      {/* Label */}
      {sz.showLabel && (
        <span
          className={[
            "font-medium leading-none text-center",
            sz.text,
          ].join(" ")}
          style={{ color: active ? color : "var(--color-ink-secondary)" }}
        >
          {label}
        </span>
      )}
    </motion.div>
  );
}
