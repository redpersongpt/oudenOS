import type { ReactNode, ButtonHTMLAttributes } from "react";

type Props = {
  variant?: "primary" | "secondary" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg";
  children: ReactNode;
  icon?: ReactNode;
  iconPosition?: "left" | "right";
  loading?: boolean;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children">;

/*
  Spec:
  Primary   → --text-display bg, --black text, pill (999px)
  Secondary → transparent, 1px border --border-visible, --text-primary, pill
  Ghost     → transparent, no border, --text-secondary, 0 radius
  Destructive → transparent, 1px border --accent, --accent text, pill
  All: Space Mono, 13px, ALL CAPS, letter-spacing 0.06em, min-height 44px
*/

export function Button({
  variant = "primary", size = "md", children, icon,
  iconPosition = "left", loading, disabled, className = "", style, ...props
}: Props) {
  const base = "inline-flex items-center justify-center font-mono text-[13px] uppercase tracking-[0.06em] transition-opacity duration-200 cursor-default disabled:opacity-40 disabled:pointer-events-none";

  const variants: Record<string, React.CSSProperties> = {
    primary:     { background: "var(--text-display)", color: "var(--black)", borderRadius: 999 },
    secondary:   { background: "transparent", color: "var(--text-primary)", border: "1px solid var(--border-visible)", borderRadius: 999 },
    ghost:       { background: "transparent", color: "var(--text-secondary)", borderRadius: 0 },
    destructive: { background: "transparent", color: "var(--accent)", border: "1px solid var(--accent)", borderRadius: 999 },
  };

  const sizes: Record<string, string> = {
    sm: "h-9 px-4 gap-1.5",
    md: "h-11 px-6 gap-2",
    lg: "h-12 px-8 gap-2.5",
  };

  return (
    <button
      className={`${base} ${sizes[size]} ${className}`}
      style={{ ...variants[variant], minHeight: 44, ...style }}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="nd-status" style={{ color: "inherit" }}>[LOADING...]</span>
      ) : iconPosition === "left" && icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      {children}
      {!loading && iconPosition === "right" && icon && <span className="shrink-0">{icon}</span>}
    </button>
  );
}
