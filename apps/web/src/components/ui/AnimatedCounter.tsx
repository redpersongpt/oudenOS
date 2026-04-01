"use client";

import { useEffect, useRef, useState } from "react";
import {
  useInView,
  useMotionValue,
  useTransform,
  animate,
} from "framer-motion";
import { easing } from "@/lib/motion";

// Types

interface AnimatedCounterProps {
  value: number;
  suffix?: string;
  prefix?: string;
  className?: string;
}

// Component

export function AnimatedCounter({
  value,
  suffix = "",
  prefix = "",
  className = "",
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(0);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const [displayValue, setDisplayValue] = useState(0);
  const hasAnimated = useRef(false);

  const rounded = useTransform(motionValue, (latest) => Math.round(latest));

  useEffect(() => {
    const unsubscribe = rounded.on("change", (v) => {
      setDisplayValue(v);
    });
    return unsubscribe;
  }, [rounded]);

  useEffect(() => {
    if (inView && !hasAnimated.current) {
      hasAnimated.current = true;
      animate(motionValue, value, {
        duration: 1.5,
        ease: easing.emphasized,
      });
    }
  }, [inView, value, motionValue]);

  return (
    <span
      ref={ref}
      className={[
        "font-mono tabular-nums",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={`${prefix}${value}${suffix}`}
    >
      {prefix}
      <span>{displayValue.toLocaleString()}</span>
      {suffix}
    </span>
  );
}
