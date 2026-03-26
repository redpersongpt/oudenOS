import { motion, type HTMLMotionProps, type TargetAndTransition } from "framer-motion";
import type { ReactNode } from "react";
import { spring } from "@redcore/design-system";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "warning";
type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
  icon?: ReactNode;
  iconPosition?: "left" | "right";
  loading?: boolean;
} & Omit<HTMLMotionProps<"button">, "children">;

// Dark-first variants. Each is visually distinct, accessible on #0D0D10 bg.
const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-brand-500 text-white hover:bg-brand-600 active:bg-brand-700 " +
    "shadow-sm hover:shadow-brand-glow focus-visible:shadow-brand-glow-lg " +
    "focus-visible:outline-none",
  secondary:
    "bg-surface-overlay text-ink border border-border " +
    "hover:bg-surface-raised hover:border-border-strong " +
    "active:bg-surface-muted focus-visible:border-border-focus focus-visible:outline-none",
  ghost:
    "text-ink-secondary hover:bg-surface-overlay hover:text-ink " +
    "active:bg-surface-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-border-strong",
  danger:
    "bg-brand-950/60 text-brand-400 border border-brand-800 " +
    "hover:bg-brand-900/60 hover:text-brand-300 hover:border-brand-600 " +
    "active:bg-brand-900 focus-visible:outline-none focus-visible:shadow-brand-glow",
  warning:
    "bg-amber-900/30 text-amber-400 border border-amber-800/60 " +
    "hover:bg-amber-900/50 hover:text-amber-300 hover:border-amber-700 " +
    "active:bg-amber-900/70 focus-visible:outline-none focus-visible:shadow-amber-glow",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs gap-1.5 rounded-md",
  md: "h-9 px-4 text-sm gap-2 rounded-lg",
  lg: "h-11 px-5 text-sm gap-2.5 rounded-lg",
};

const liftVariants: Record<ButtonVariant, TargetAndTransition> = {
  primary: { y: -1.5, transition: spring.gentle },
  secondary: { y: -1, transition: spring.gentle },
  ghost: {},
  danger: {},
  warning: {},
};

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        strokeDasharray="32"
        strokeDashoffset="12"
        className="opacity-30"
      />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
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
  const isLifting = variant === "primary" || variant === "secondary";
  return (
    <motion.button
      whileHover={isLifting ? liftVariants[variant] : undefined}
      whileTap={{ scale: 0.97 }}
      transition={spring.snappy}
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
