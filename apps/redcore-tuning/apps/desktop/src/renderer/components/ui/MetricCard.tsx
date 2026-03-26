import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect } from "react";
import { Card } from "./Card";

interface MetricCardProps {
  label: string;
  value: number | string;
  unit: string;
  suffix?: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  className?: string;
}

export function MetricCard({
  label,
  value,
  unit,
  trend,
  trendValue,
  className = "",
}: MetricCardProps) {
  const isNumeric = typeof value === "number";
  const motionValue = useMotionValue(0);
  const displayValue = useTransform(motionValue, (v) => Math.round(v));

  useEffect(() => {
    if (!isNumeric) return;
    const controls = animate(motionValue, value as number, {
      duration: 1.1,
      ease: [0.2, 0, 0, 1],
    });
    return controls.stop;
  }, [value, motionValue, isNumeric]);

  // On dark: up = green, down = brand red (heat/degradation indicator)
  const trendColor =
    trend === "up"
      ? "text-green-400"
      : trend === "down"
      ? "text-brand-400"
      : "text-ink-tertiary";

  const trendArrow = trend === "up" ? "↑" : trend === "down" ? "↓" : "";

  return (
    <Card className={className}>
      <div className="px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-ink-tertiary">
          {label}
        </p>
        <div className="mt-2 flex items-baseline gap-1.5">
          <motion.span className="font-mono text-2xl font-semibold tracking-tight text-ink">
            {isNumeric ? displayValue : value}
          </motion.span>
          <span className="text-sm text-ink-secondary">{unit}</span>
        </div>
        {trendValue && (
          <p className={`mt-1 text-xs font-medium ${trendColor}`}>
            {trendArrow} {trendValue}
          </p>
        )}
      </div>
    </Card>
  );
}
