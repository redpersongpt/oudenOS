import { motion, type HTMLMotionProps } from "framer-motion";
import type { ReactNode } from "react";

type Props = {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  children: ReactNode;
  icon?: ReactNode;
  iconPosition?: "left" | "right";
  loading?: boolean;
} & Omit<HTMLMotionProps<"button">, "children">;

const v: Record<string, string> = {
  primary:   "bg-brand-500 text-white hover:bg-brand-600 active:bg-brand-700 shadow-sm shadow-brand-500/15",
  secondary: "bg-white/[0.06] text-ink border border-white/[0.08] hover:bg-white/[0.10] hover:border-white/[0.14] active:bg-white/[0.04]",
  ghost:     "text-ink-secondary hover:bg-white/[0.06] hover:text-ink active:bg-white/[0.04]",
};

const s: Record<string, string> = {
  sm: "h-7 px-2.5 text-[11px] gap-1.5 rounded-md",
  md: "h-8 px-3.5 text-[12px] gap-2 rounded-lg",
  lg: "h-10 px-5 text-[13px] gap-2.5 rounded-lg",
};

export function Button({ variant = "primary", size = "md", children, icon, iconPosition = "left", loading, disabled, className = "", ...props }: Props) {
  return (
    <motion.button
      whileHover={{ y: variant === "primary" ? -1 : 0 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className={`inline-flex items-center justify-center font-semibold transition-colors outline-none cursor-default disabled:opacity-40 disabled:pointer-events-none ${v[variant]} ${s[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <div className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
      ) : iconPosition === "left" && icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      {children}
      {!loading && iconPosition === "right" && icon && <span className="shrink-0">{icon}</span>}
    </motion.button>
  );
}
