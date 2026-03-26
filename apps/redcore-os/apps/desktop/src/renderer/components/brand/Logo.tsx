// ─── redcore-OS Logo ──────────────────────────────────────────────────────────
// Same mark as redcore-Tuning (red rounded square + lightning bolt),
// wordmark reads "redcore-OS".

import { motion } from "framer-motion";

interface LogoProps {
  size?: number;
  animated?: boolean;
  className?: string;
}

/**
 * Full logo: mark + wordmark side by side.
 */
export function Logo({ size = 32, animated = false, className = "" }: LogoProps) {
  const Wrap = animated ? motion.div : "div";
  const motionProps = animated
    ? {
        initial: { opacity: 0, scale: 0.9 },
        animate: { opacity: 1, scale: 1 },
        transition: { type: "spring" as const, stiffness: 280, damping: 28, mass: 1 },
      }
    : {};

  return (
    <Wrap {...(motionProps as object)} className={`flex items-center gap-2.5 ${className}`}>
      <LogoMark size={size} />
      <span className="text-[13px] font-semibold text-neutral-300 tracking-tight">
        redcore<span className="text-brand-400"> · OS</span>
      </span>
    </Wrap>
  );
}

/**
 * Logo mark only: rounded square with lightning bolt.
 */
export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Rounded square background */}
      <rect x="4" y="4" width="40" height="40" rx="11" fill="#E8453C" />
      {/* Subtle inner highlight */}
      <rect x="4" y="4" width="40" height="20" rx="11" fill="white" fillOpacity="0.08" />
      {/* Lightning bolt */}
      <path
        d="M21 12L27 12L23.5 21H29L19 36L22 24H17L21 12Z"
        fill="white"
        fillOpacity="0.95"
      />
    </svg>
  );
}

/**
 * Large hero logo mark for welcome screens — with glow.
 */
export function LogoHero({ size = 80 }: { size?: number }) {
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 340, damping: 16, mass: 1 }}
      className="relative"
    >
      {/* Glow halo */}
      <div
        className="absolute rounded-[22%] bg-brand-500/20 blur-2xl"
        style={{
          width: size * 1.2,
          height: size * 1.2,
          left: -size * 0.1,
          top: -size * 0.1,
        }}
      />
      <svg
        viewBox="0 0 48 48"
        width={size}
        height={size}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative"
      >
        <rect x="4" y="4" width="40" height="40" rx="11" fill="#E8453C" />
        <rect x="4" y="4" width="40" height="20" rx="11" fill="white" fillOpacity="0.08" />
        <path
          d="M21 12L27 12L23.5 21H29L19 36L22 24H17L21 12Z"
          fill="white"
          fillOpacity="0.95"
        />
      </svg>
    </motion.div>
  );
}
