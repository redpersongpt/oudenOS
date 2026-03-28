import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { staggerContainer, staggerChild } from "@redcore/design-system";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  compact?: boolean;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  compact = false,
  className = "",
}: EmptyStateProps) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className={`flex flex-col items-center justify-center text-center ${
        compact ? "py-8 px-6" : "py-16 px-8"
      } ${className}`}
    >
      {icon && (
        <motion.div
          variants={staggerChild}
          className={`mb-4 flex items-center justify-center rounded-2xl border border-border bg-surface-overlay ${
            compact ? "h-12 w-12" : "h-16 w-16"
          }`}
        >
          <span
            className={`text-ink-tertiary ${
              compact
                ? "[&>svg]:h-6 [&>svg]:w-6"
                : "[&>svg]:h-8 [&>svg]:w-8"
            }`}
          >
            {icon}
          </span>
        </motion.div>
      )}
      <motion.p
        variants={staggerChild}
        className={`font-semibold text-ink-secondary ${
          compact ? "text-sm" : "text-base"
        }`}
      >
        {title}
      </motion.p>
      {description && (
        <motion.p
          variants={staggerChild}
          className={`mt-1.5 text-ink-tertiary max-w-xs leading-relaxed ${
            compact ? "text-xs" : "text-sm"
          }`}
        >
          {description}
        </motion.p>
      )}
      {action && (
        <motion.div variants={staggerChild} className="mt-5">
          {action}
        </motion.div>
      )}
    </motion.div>
  );
}
