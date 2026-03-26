// ─── redcore-Tuning Logo ──────────────────────────────────────────────────────
// AtlasOS-style: rounded square mark with inner symbol.
// Same proportions as AtlasOS logo, our brand red (#E8453C) color scheme.

import { motion } from "framer-motion";
import { spring } from "@redcore/design-system";

interface LogoProps {
  size?: number;
  animated?: boolean;
  className?: string;
}

/**
 * Full logo: mark + wordmark side by side.
 * AtlasOS uses: rounded square icon + "AtlasOS Toolbox" text.
 * We use: rounded square icon + "redcore-Tuning" text.
 */
export function Logo({ size = 32, animated = false, className = "" }: LogoProps) {
  const Wrap = animated ? motion.div : "div";
  const props = animated
    ? { initial: { opacity: 0, scale: 0.9 }, animate: { opacity: 1, scale: 1 }, transition: spring.smooth }
    : {};

  return (
    <Wrap {...(props as any)} className={`flex items-center gap-2.5 ${className}`}>
      <LogoMark size={size} />
      <span className="text-[13px] font-semibold text-neutral-300 tracking-tight">
        redcore<span className="text-brand-400"> · Tuning</span>
      </span>
    </Wrap>
  );
}

/**
 * Logo mark only: rounded square with lightning bolt.
 * Matches AtlasOS logo proportions: rounded-[22%] square, centered glyph.
 */
export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Rounded square background — same shape as AtlasOS */}
      <rect x="4" y="4" width="40" height="40" rx="11" fill="#E8453C" />

      {/* Subtle inner highlight */}
      <rect x="4" y="4" width="40" height="20" rx="11" fill="white" fillOpacity="0.08" />

      {/* Lightning bolt — tuning/optimization symbol */}
      <path
        d="M21 12L27 12L23.5 21H29L19 36L22 24H17L21 12Z"
        fill="white"
        fillOpacity="0.95"
      />
    </svg>
  );
}

/**
 * Large hero logo mark for welcome screens.
 * Bigger with glow effect.
 */
export function LogoHero({ size = 80 }: { size?: number }) {
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={spring.bounce}
      className="relative"
    >
      {/* Glow */}
      <div
        className="absolute inset-0 rounded-[22%] bg-brand-500/20 blur-2xl"
        style={{ width: size * 1.2, height: size * 1.2, left: -size * 0.1, top: -size * 0.1 }}
      />
      <svg viewBox="0 0 48 48" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg" className="relative">
        <rect x="4" y="4" width="40" height="40" rx="11" fill="#E8453C" />
        <rect x="4" y="4" width="40" height="20" rx="11" fill="white" fillOpacity="0.08" />
        <path d="M21 12L27 12L23.5 21H29L19 36L22 24H17L21 12Z" fill="white" fillOpacity="0.95" />
      </svg>
    </motion.div>
  );
}
