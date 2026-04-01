// Step Heading
// Consistent display-scale heading for wizard steps.
// Enforces typography hierarchy: display title + concise subtitle.
// Every wizard step should use this instead of ad-hoc heading markup.

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

interface StepHeadingProps {
  icon?: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  title: string;
  subtitle: string;
  /** Optional brand-colored word in the title */
  accent?: string;
  className?: string;
}

export function StepHeading({
  icon: Icon,
  iconColor = "text-brand-400",
  iconBg = "bg-brand-500/10 border-brand-500/20",
  title,
  subtitle,
  accent,
  className = "",
}: StepHeadingProps) {
  return (
    <div className={className}>
      {Icon && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25 }}
          className={`mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border ${iconBg}`}
        >
          <Icon className={`h-6 w-6 ${iconColor}`} strokeWidth={1.5} />
        </motion.div>
      )}
      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05, ease: [0.2, 0, 0, 1] }}
        className="text-[26px] font-bold leading-tight tracking-tight text-ink"
      >
        {accent ? (
          <>
            {title.split(accent)[0]}
            <span className="text-brand-400">{accent}</span>
            {title.split(accent)[1] ?? ""}
          </>
        ) : (
          title
        )}
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.12, ease: [0.2, 0, 0, 1] }}
        className="mt-2.5 max-w-lg text-[14px] leading-relaxed text-ink-secondary"
      >
        {subtitle}
      </motion.p>
    </div>
  );
}
