"use client";

import * as React from "react";
import { useRef } from "react";
import { motion, useInView } from "framer-motion";

// ─── Types ───────────────────────────────────────────────────────────────────

type RevealDirection = "up" | "down" | "left" | "right";

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: RevealDirection;
  once?: boolean;
  distance?: number;
}

// ─── Offset Factory ─────────────────────────────────────────────────────────

function getHiddenTransform(
  direction: RevealDirection,
  distance: number,
): { x?: number; y?: number } {
  switch (direction) {
    case "up":
      return { y: distance };
    case "down":
      return { y: -distance };
    case "left":
      return { x: distance };
    case "right":
      return { x: -distance };
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ScrollReveal({
  children,
  className = "",
  delay = 0,
  direction = "up",
  once = true,
  distance = 30,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, {
    once,
    margin: "-80px",
  });

  const hiddenTransform = getHiddenTransform(direction, distance);

  return (
    <motion.div
      ref={ref}
      initial={{
        opacity: 0,
        ...hiddenTransform,
      }}
      animate={
        isInView
          ? { opacity: 1, x: 0, y: 0 }
          : { opacity: 0, ...hiddenTransform }
      }
      transition={{
        duration: 0.7,
        ease: [0.2, 0, 0, 1],
        delay,
      }}
      className={className}
    >
      <>{children}</>
    </motion.div>
  );
}
