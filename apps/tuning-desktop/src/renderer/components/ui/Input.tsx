import { motion, AnimatePresence } from "framer-motion";
import { useState, useId, forwardRef } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      hint,
      leftIcon,
      className = "",
      value,
      defaultValue,
      onFocus,
      onBlur,
      onChange,
      ...props
    },
    ref
  ) => {
    const id = useId();
    const [focused, setFocused] = useState(false);
    const [internalValue, setInternalValue] = useState(defaultValue ?? "");

    const hasValue =
      value !== undefined
        ? String(value).length > 0
        : String(internalValue).length > 0;
    const isFloated = focused || hasValue;

    return (
      <motion.div
        animate={error ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
        transition={{ duration: 0.35, ease: "easeInOut" }}
        className="relative"
      >
        <div
          className={`relative flex items-center rounded-lg border bg-white transition-all duration-150 ${
            error
              ? "border-brand-500 ring-2 ring-brand-500/20"
              : focused
              ? "border-brand-500 ring-2 ring-brand-500/15"
              : "border-neutral-200 hover:border-neutral-300"
          } ${className}`}
        >
          {leftIcon && (
            <span className="ml-3 shrink-0 text-neutral-400">{leftIcon}</span>
          )}
          <div className="relative flex-1">
            {label && (
              <motion.label
                htmlFor={id}
                className="pointer-events-none absolute left-3 origin-top-left select-none text-neutral-400"
                animate={
                  isFloated
                    ? {
                        y: 6,
                        scale: 0.75,
                        color: error ? "#E8254B" : focused ? "#E8254B" : "#A3A29C",
                      }
                    : { y: 18, scale: 1, color: "#A3A29C" }
                }
                transition={{ duration: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
                style={{ fontSize: 14, lineHeight: 1 }}
              >
                {label}
              </motion.label>
            )}
            <input
              ref={ref}
              id={id}
              value={value}
              defaultValue={value === undefined ? defaultValue : undefined}
              className={`w-full bg-transparent px-3 text-sm text-neutral-900 outline-none placeholder-transparent ${
                label ? "pb-2 pt-6" : "py-2.5"
              }`}
              onFocus={(e) => {
                setFocused(true);
                onFocus?.(e);
              }}
              onBlur={(e) => {
                setFocused(false);
                onBlur?.(e);
              }}
              onChange={(e) => {
                setInternalValue(e.target.value);
                onChange?.(e);
              }}
              {...props}
            />
          </div>
        </div>

        <AnimatePresence>
          {(error || hint) && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className={`mt-1.5 px-1 text-xs ${
                error ? "text-brand-500" : "text-neutral-400"
              }`}
            >
              {error ?? hint}
            </motion.p>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }
);

Input.displayName = "Input";
