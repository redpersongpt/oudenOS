"use client";

import Image from "next/image";

// ─── Types ───────────────────────────────────────────────────────────────────

type LogoSize = "sm" | "md" | "lg" | "xl";

interface LogoProps {
  size?: LogoSize;
  className?: string;
  /** Show only the hexagonal mark, no wordmark */
  markOnly?: boolean;
}

// ─── Size Map ────────────────────────────────────────────────────────────────

const MARK_SIZES: Record<LogoSize, number> = {
  sm: 32,
  md: 40,
  lg: 56,
  xl: 72,
};

// Logo aspect ratio from image: ~3.16:1 (1019x322)
const FULL_HEIGHTS: Record<LogoSize, number> = {
  sm: 28,
  md: 36,
  lg: 48,
  xl: 64,
};

const FULL_WIDTHS: Record<LogoSize, number> = {
  sm: 88,
  md: 114,
  lg: 152,
  xl: 202,
};

// ─── Component ───────────────────────────────────────────────────────────────

export function Logo({ size = "md", className = "", markOnly = false }: LogoProps) {
  if (markOnly) {
    const s = MARK_SIZES[size];
    return (
      <Image
        src="/redcore-logo.png"
        alt="redcore"
        width={s}
        height={s}
        className={`object-contain ${className}`}
        priority
        style={{ width: s, height: s }}
      />
    );
  }

  return (
    <Image
      src="/redcore-logo.png"
      alt="redcore"
      width={FULL_WIDTHS[size]}
      height={FULL_HEIGHTS[size]}
      className={`object-contain ${className}`}
      priority
      style={{ height: FULL_HEIGHTS[size], width: "auto" }}
    />
  );
}
