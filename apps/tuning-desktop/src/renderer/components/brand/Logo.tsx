// Ouden.Tuning Logo — open ring + accent dot

import { motion } from "framer-motion";

interface LogoProps {
  size?: number;
  animated?: boolean;
  className?: string;
}

function OudenMark({ size = 32 }: { size?: number }) {
  const sw = size >= 32 ? 8 : size >= 20 ? 6 : 5;
  const dotR = size >= 32 ? 4.5 : 3.5;

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <path
        d="M 82.14 66.08 A 32 32 0 1 1 77.1 39.9"
        stroke="var(--color-ink-primary, #E8E8E8)"
        strokeWidth={sw}
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="77.1" cy="39.9" r={dotR} fill="var(--color-brand-500, #E8E8E8)" />
    </svg>
  );
}

export function Logo({ size = 32, animated = false, className = "" }: LogoProps) {
  const Wrap = animated ? motion.div : "div";
  const props = animated
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] } }
    : {};

  return (
    <Wrap {...(props as Record<string, unknown>)} className={`flex items-center gap-2.5 ${className}`}>
      <OudenMark size={size} />
      <span className="text-[13px] font-bold tracking-[-0.02em] text-neutral-300">
        Ouden<span className="font-normal text-neutral-500">.Tuning</span>
      </span>
    </Wrap>
  );
}

export { OudenMark as LogoMark };

export function LogoHero({ size = 80 }: { size?: number }) {
  return <OudenMark size={size} />;
}
