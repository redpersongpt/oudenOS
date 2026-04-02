// Ouden.Tuning Logo — Ouden mark system

import { motion } from "framer-motion";

interface LogoProps {
  size?: number;
  animated?: boolean;
  className?: string;
}

function OudenMark({ size = 32 }: { size?: number }) {
  const stroke = size >= 32 ? 1.5 : 1;
  const r = Math.round(size * 0.22);
  const dot = Math.max(2, Math.round(size * 0.08));
  const half = size / 2;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
      <rect x={stroke / 2} y={stroke / 2} width={size - stroke} height={size - stroke} stroke="var(--color-dark-border)" strokeWidth={stroke} fill="none" />
      <circle cx={half} cy={half} r={r} stroke="var(--color-brand-500)" strokeWidth={stroke} fill="none" />
      <circle cx={half} cy={half} r={dot} fill="var(--color-brand-500)" />
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
