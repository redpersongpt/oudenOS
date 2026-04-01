import { motion } from "framer-motion";
import { cardHover, cardStaggerContainer, cardStaggerItem } from "@redcore/design-system";
import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  hoverable?: boolean;
  onClick?: () => void;
  /** Visual lift level — default sits on page bg, raised sits on surface */
  level?: "default" | "raised";
}

export function Card({
  children,
  className = "",
  hoverable = false,
  onClick,
  level = "default",
}: CardProps) {
  const base =
    level === "raised"
      ? "bg-surface-raised border-border-strong"
      : "bg-surface border-border";

  if (hoverable) {
    return (
      <motion.div
        initial="rest"
        whileHover="hover"
        variants={cardHover}
        onClick={onClick}
        className={`rounded-xl border shadow-card cursor-pointer ${base} ${className}`}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div
      className={`rounded-xl border shadow-card ${base} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`px-5 pt-5 pb-3 ${className}`}>{children}</div>;
}

export function CardContent({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`px-5 pb-5 ${className}`}>{children}</div>;
}

// CardGrid — staggered card entrance
// Wrap a grid of <Card> elements in this for the stagger entrance animation.

interface CardGridProps {
  children: ReactNode;
  className?: string;
}

export function CardGrid({ children, className = "" }: CardGridProps) {
  return (
    <motion.div
      variants={cardStaggerContainer}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function AnimatedCard({
  children,
  className = "",
  hoverable = false,
  onClick,
  level = "default",
}: CardProps) {
  const base =
    level === "raised"
      ? "bg-surface-raised border-border-strong"
      : "bg-surface border-border";

  return (
    <motion.div
      variants={cardStaggerItem}
      whileHover={hoverable ? { y: -2 } : undefined}
      onClick={onClick}
      className={`rounded-xl border shadow-card ${hoverable ? "cursor-pointer" : ""} ${base} ${className}`}
    >
      {children}
    </motion.div>
  );
}
