"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import * as React from "react";
import { spring } from "@/lib/motion";

// ─── Types ───────────────────────────────────────────────────────────────────

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
  className?: string;
  href?: string;
  icon?: React.ReactElement;
  disabled?: boolean;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  "aria-label"?: string;
}

// ─── Style Maps ──────────────────────────────────────────────────────────────

const variantStyles: Record<ButtonVariant, string> = {
  primary: "btn-primary text-white font-semibold",
  secondary: "btn-secondary text-ink-primary font-medium",
  ghost: [
    "bg-transparent text-ink-secondary font-medium",
    "border-none",
    "hover:text-ink-primary",
    "transition-colors duration-200",
  ].join(" "),
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-9 px-5 text-[13px] rounded-lg gap-1.5",
  md: "h-11 px-6 text-[14px] rounded-lg gap-2",
  lg: "h-[52px] px-8 text-[15px] rounded-lg gap-2.5",
};

// ─── Component ───────────────────────────────────────────────────────────────

export function Button({
  variant = "primary",
  size = "md",
  children,
  className = "",
  href,
  icon,
  disabled,
  onClick,
  type,
  "aria-label": ariaLabel,
}: ButtonProps) {
  const baseStyles = [
    "inline-flex items-center justify-center",
    "cursor-pointer select-none",
    "outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-base",
    "disabled:opacity-40 disabled:pointer-events-none",
    variantStyles[variant],
    sizeStyles[size],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const motionProps = {
    whileHover: disabled ? undefined : { y: -1 },
    whileTap: disabled ? undefined : { scale: 0.98 },
    transition: spring.snappy,
  };

  if (href) {
    return (
      <motion.div {...motionProps} className="inline-flex">
        <Link href={href} className={baseStyles}>
          {icon && <span className="shrink-0">{icon}</span>}
          <>{children}</>
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.button
      {...motionProps}
      className={baseStyles}
      onClick={onClick}
      disabled={disabled}
      type={type}
      aria-label={ariaLabel}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <>{children}</>
    </motion.button>
  );
}
