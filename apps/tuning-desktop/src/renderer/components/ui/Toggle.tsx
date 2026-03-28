import { motion } from "framer-motion";
import { useState } from "react";
import { spring } from "@redcore/design-system";

interface ToggleProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
}

const sizeConfig = {
  sm: { track: "w-8 h-4", thumb: "w-3 h-3", on: 16, off: 2 },
  md: { track: "w-10 h-5", thumb: "w-3.5 h-3.5", on: 22, off: 2 },
  lg: { track: "w-12 h-6", thumb: "w-4.5 h-4.5", on: 26, off: 2 },
};

export function Toggle({
  checked: controlledChecked,
  defaultChecked = false,
  onCheckedChange,
  label,
  description,
  disabled = false,
  size = "md",
}: ToggleProps) {
  const [internalChecked, setInternalChecked] = useState(defaultChecked);
  const isChecked = controlledChecked ?? internalChecked;
  const config = sizeConfig[size];

  const toggle = () => {
    if (disabled) return;
    const next = !isChecked;
    setInternalChecked(next);
    onCheckedChange?.(next);
  };

  return (
    <div
      className={`flex items-center gap-3 ${
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
      }`}
      onClick={toggle}
    >
      <button
        type="button"
        role="switch"
        aria-checked={isChecked}
        disabled={disabled}
        className={`relative shrink-0 rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 ${config.track} ${
          isChecked ? "bg-brand-500" : "bg-white/[0.10]"
        }`}
      >
        <motion.span
          className={`absolute top-1/2 -translate-y-1/2 rounded-full bg-white shadow-sm ${config.thumb}`}
          animate={{ x: isChecked ? config.on : config.off }}
          transition={spring.snappy}
        />
      </button>

      {(label || description) && (
        <div className="min-w-0">
          {label && (
            <p className="text-sm font-medium text-ink leading-tight">
              {label}
            </p>
          )}
          {description && (
            <p className="mt-0.5 text-xs text-neutral-400 leading-snug">
              {description}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
