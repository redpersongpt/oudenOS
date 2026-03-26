// ─── Button ───────────────────────────────────────────────────────────────────
// Primary interactive control. Variants: primary / secondary / ghost.
// Sizes: sm / md / lg. Supports icon left/right and loading state.

import { motion, type HTMLMotionProps } from "framer-motion";
import type { ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
  icon?: ReactNode;
  iconPosition?: "left" | "right";
  loading?: boolean;
} & Omit<HTMLMotionProps<"button">, "children">;

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-brand-500 text-white hover:bg-brand-600 active:bg-brand-700 " +
    "shadow-sm hover:shadow-brand-glow focus-visible:shadow-brand-glow-lg focus-visible:outline-none",
  secondary:
    "bg-white/[0.06] text-ink border border-white/[0.08] " +
    "hover:bg-white/[0.10] hover:border-white/[0.14] " +
    "active:bg-white/[0.04] focus-visible:border-brand-500/50 focus-visible:outline-none",
  ghost:
    "text-ink-secondary hover:bg-white/[0.06] hover:text-ink " +
    "active:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/[0.14]",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs gap-1.5 rounded-md",
  md: "h-9 px-4 text-sm gap-2 rounded-lg",
  lg: "h-11 px-5 text-sm gap-2.5 rounded-lg",
};

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle
        cx="12" cy="12" r="10"
        stroke="currentColor" strokeWidth="3"
        strokeDasharray="32" strokeDashoffset="12"
        className="opacity-30"
      />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke="currentColor" strokeWidth="3" strokeLinecap="round"
      />
    </svg>
  );
}

export function Button({
  variant = "primary",
  size = "md",
  children,
  icon,
  iconPosition = "left",
  loading,
  disabled,
  className = "",
  ...props
}: ButtonProps) {
  return (
    <motion.button
      whileHover={variant === "primary" ? { y: -1.5 } : variant === "secondary" ? { y: -1 } : undefined}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 550, damping: 32, mass: 1 }}
      className={`inline-flex items-center justify-center font-medium transition-colors outline-none disabled:opacity-50 disabled:pointer-events-none ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Spinner />
      ) : iconPosition === "left" && icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      {children}
      {!loading && iconPosition === "right" && icon && (
        <span className="shrink-0">{icon}</span>
      )}
    </motion.button>
  );
}
