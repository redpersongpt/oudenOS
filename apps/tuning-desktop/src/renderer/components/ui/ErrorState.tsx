import { motion } from "framer-motion";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "./Button";
import { staggerContainer, staggerChild } from "@redcore/design-system";

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  compact?: boolean;
  className?: string;
}

export function ErrorState({
  title = "Something went wrong",
  description = "An error occurred. Please try again.",
  onRetry,
  compact = false,
  className = "",
}: ErrorStateProps) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className={`flex flex-col items-center justify-center text-center ${
        compact ? "py-8 px-6" : "py-16 px-8"
      } ${className}`}
    >
      <motion.div
        variants={staggerChild}
        className={`mb-4 flex items-center justify-center rounded-2xl bg-brand-500/10 border border-brand-500/20 ${
          compact ? "h-12 w-12" : "h-16 w-16"
        }`}
      >
        <AlertTriangle
          className={`text-brand-400 ${compact ? "h-5 w-5" : "h-7 w-7"}`}
          strokeWidth={1.5}
        />
      </motion.div>
      <motion.p
        variants={staggerChild}
        className={`font-semibold text-ink-secondary ${
          compact ? "text-sm" : "text-base"
        }`}
      >
        {title}
      </motion.p>
      <motion.p
        variants={staggerChild}
        className={`mt-1.5 text-ink-tertiary max-w-xs leading-relaxed ${
          compact ? "text-xs" : "text-sm"
        }`}
      >
        {description}
      </motion.p>
      {onRetry && (
        <motion.div variants={staggerChild} className="mt-5">
          <Button
            variant="secondary"
            size={compact ? "sm" : "md"}
            onClick={onRetry}
            icon={<RefreshCw className="h-3.5 w-3.5" />}
          >
            Try Again
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
}
