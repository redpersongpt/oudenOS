import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

interface CheckboxProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  indeterminate?: boolean;
}

export function Checkbox({
  checked: controlledChecked,
  defaultChecked = false,
  onCheckedChange,
  label,
  description,
  disabled = false,
  indeterminate = false,
}: CheckboxProps) {
  const [internalChecked, setInternalChecked] = useState(defaultChecked);
  const isChecked = controlledChecked ?? internalChecked;

  const toggle = () => {
    if (disabled) return;
    const next = !isChecked;
    setInternalChecked(next);
    onCheckedChange?.(next);
  };

  return (
    <div
      className={`flex items-start gap-3 ${
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
      }`}
      onClick={toggle}
    >
      <div
        className={`relative mt-0.5 flex shrink-0 items-center justify-center rounded border transition-all duration-150 ${
          isChecked || indeterminate
            ? "border-brand-500 bg-brand-500"
            : "border-border bg-surface-overlay hover:border-border-strong"
        }`}
        style={{ width: 18, height: 18 }}
      >
        <AnimatePresence>
          {isChecked && !indeterminate && (
            <motion.svg
              key="check"
              width="10"
              height="8"
              viewBox="0 0 10 8"
              fill="none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.path
                d="M1 4L3.5 6.5L9 1"
                stroke="white"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                exit={{ pathLength: 0 }}
                transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
              />
            </motion.svg>
          )}
          {indeterminate && (
            <motion.div
              key="indeterminate"
              className="h-0.5 w-2.5 rounded-full bg-white"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              exit={{ scaleX: 0 }}
              transition={{ duration: 0.15 }}
            />
          )}
        </AnimatePresence>
      </div>

      {(label || description) && (
        <div className="min-w-0">
          {label && (
            <p className="text-sm font-medium text-ink leading-tight select-none">
              {label}
            </p>
          )}
          {description && (
            <p className="mt-0.5 text-xs text-neutral-400 leading-snug select-none">
              {description}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
