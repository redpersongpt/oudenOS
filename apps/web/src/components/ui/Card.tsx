"use client";

import { motion } from "framer-motion";
import * as React from "react";
import { spring } from "@/lib/motion";

// ─── Types ───────────────────────────────────────────────────────────────────

type CardVariant = "default" | "glass";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  glow?: boolean;
  variant?: CardVariant;
}

// ─── Style Maps ──────────────────────────────────────────────────────────────

const variantStyles: Record<CardVariant, string> = {
  default: "premium-card rounded-lg",
  glass: "glass-card rounded-lg",
};

// ─── Component ───────────────────────────────────────────────────────────────

export function Card({
  children,
  className = "",
  hover = true,
  glow = false,
  variant = "default",
}: CardProps) {
  const baseStyles = [variantStyles[variant], className]
    .filter(Boolean)
    .join(" ");

  if (!hover) {
    return <div className={baseStyles}>{children}</div>;
  }

  const hoverClass = glow ? "glow-brand-soft" : "";

  return (
    <motion.div
      initial="rest"
      whileHover="hover"
      animate="rest"
      variants={{
        rest: {
          y: 0,
          transition: spring.snappy,
        },
        hover: {
          y: -3,
          transition: spring.snappy,
        },
      }}
      className={[baseStyles, hoverClass].filter(Boolean).join(" ")}
    >
      <>{children}</>
    </motion.div>
  );
}
