import type { ReactNode } from "react";

// Types

type BadgeVariant = "default" | "brand" | "success" | "warning";

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

// Style Maps

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-[var(--surface-raised)] text-[var(--text-disabled)] border border-[var(--border)]",
  brand: "bg-brand-950/60 text-brand-400 border border-brand-900/40",
  success: "bg-emerald-950/40 text-emerald-400 border border-emerald-900/30",
  warning: "bg-amber-950/40 text-amber-400 border border-amber-900/30",
};

// Component

export function Badge({
  variant = "default",
  children,
  className = "",
}: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center",
        "rounded-md",
        "px-2.5 py-1",
        "text-[11px] font-medium font-mono",
        "uppercase tracking-wider",
        variantStyles[variant],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </span>
  );
}
