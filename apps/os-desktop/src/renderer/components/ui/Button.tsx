import type { ReactNode, ButtonHTMLAttributes } from "react";

type Props = {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  children: ReactNode;
  icon?: ReactNode;
  iconPosition?: "left" | "right";
  loading?: boolean;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children">;

const v: Record<string, string> = {
  primary:   "bg-brand-500 text-nd-text-display hover:bg-brand-400 active:bg-brand-600",
  secondary: "border border-nd-border text-nd-text-secondary hover:bg-nd-surface active:bg-nd-bg",
  ghost:     "text-nd-text-secondary hover:bg-nd-surface hover:text-nd-text-primary",
};

const s: Record<string, string> = {
  sm: "h-7 px-3 text-label gap-1.5 rounded-sm",
  md: "h-8 px-4 text-caption gap-2 rounded-sm",
  lg: "h-10 px-6 text-body-sm gap-2.5 rounded-sm",
};

export function Button({ variant = "primary", size = "md", children, icon, iconPosition = "left", loading, disabled, className = "", ...props }: Props) {
  return (
    <button
      className={`inline-flex items-center justify-center font-mono tracking-label uppercase transition-colors duration-150 ease-nd cursor-default disabled:opacity-30 disabled:pointer-events-none ${v[variant]} ${s[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <div className="w-2 h-2 bg-current nd-pulse" />
      ) : iconPosition === "left" && icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      {children}
      {!loading && iconPosition === "right" && icon && <span className="shrink-0">{icon}</span>}
    </button>
  );
}
