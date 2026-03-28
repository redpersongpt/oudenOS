import { motion } from "framer-motion";

interface ProgressBarProps {
  value: number; // 0–100
  size?: "xs" | "sm" | "md";
  variant?: "brand" | "success" | "warning" | "neutral";
  label?: string;
  showValue?: boolean;
  animated?: boolean;
  className?: string;
  striped?: boolean;
}

const variantColor: Record<
  NonNullable<ProgressBarProps["variant"]>,
  string
> = {
  brand: "bg-brand-500",
  success: "bg-green-500",
  warning: "bg-amber-500",
  neutral: "bg-white/[0.25]",
};

const sizeClass: Record<NonNullable<ProgressBarProps["size"]>, string> = {
  xs: "h-1",
  sm: "h-1.5",
  md: "h-2.5",
};

export function ProgressBar({
  value,
  size = "sm",
  variant = "brand",
  label,
  showValue = false,
  className = "",
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div className={`w-full ${className}`}>
      {(label || showValue) && (
        <div className="mb-1.5 flex items-center justify-between">
          {label && (
            <span className="text-xs font-medium text-ink-secondary">{label}</span>
          )}
          {showValue && (
            <span className="font-mono text-xs text-ink-tertiary">{clamped}%</span>
          )}
        </div>
      )}
      <div
        className={`w-full overflow-hidden rounded-full bg-white/[0.07] ${sizeClass[size]}`}
      >
        <motion.div
          className={`h-full rounded-full ${variantColor[variant]}`}
          initial={{ width: 0 }}
          animate={{ width: `${clamped}%` }}
          transition={{ duration: 0.6, ease: [0.2, 0, 0, 1] }}
        />
      </div>
    </div>
  );
}
