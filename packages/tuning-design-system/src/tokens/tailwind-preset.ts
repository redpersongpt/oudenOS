// Tailwind CSS Preset
// Import this in apps/desktop/tailwind.config.ts

import type { Config } from "tailwindcss";
import { colors } from "./colors.js";
import { fontFamily, fontSize } from "./typography.js";
import { radius, shadow } from "./spacing.js";

const preset: Partial<Config> = {
  theme: {
    extend: {
      colors: {
        brand: colors.red,
        neutral: colors.neutral,
        success: colors.green,
        warning: colors.amber,
        info: colors.blue,
        // Dark-first surface system — use these in components, not bg-white/bg-neutral-*
        surface: {
          DEFAULT: colors.semantic.surface,           // #131316
          raised: colors.semantic.surfaceRaised,      // #1B1B1F
          overlay: colors.semantic.surfaceOverlay,    // #232328
          muted: colors.semantic.surfaceMuted,        // #2A2A30
        },
        // Ink = text on dark surfaces
        ink: {
          DEFAULT: colors.ink.primary,
          secondary: colors.ink.secondary,
          tertiary: colors.ink.tertiary,
          inverse: colors.ink.inverse,
        },
        // Semantic border tones
        border: {
          DEFAULT: colors.dark.border,
          subtle: colors.dark.borderSubtle,
          strong: colors.dark.borderStrong,
          focus: colors.semantic.borderFocus,
        },
        // Ambient status fills (dark-mode accessible)
        "risk-low":     colors.semantic.riskLow,
        "risk-medium":  colors.semantic.riskMedium,
        "risk-high":    colors.semantic.riskHigh,
        "risk-extreme": colors.semantic.riskExtreme,
        "risk-safe":    colors.semantic.riskSafe,
      },
      backgroundColor: {
        page: colors.semantic.background,   // #0D0D10
      },
      fontFamily: {
        sans: [fontFamily.sans],
        mono: [fontFamily.mono],
        display: [(fontFamily as Record<string, string>).display ?? '"Doto", monospace'],
      },
      fontSize: {
        xs:    fontSize.xs,
        sm:    fontSize.sm,
        base:  fontSize.base,
        md:    fontSize.md,
        lg:    fontSize.lg,
        xl:    fontSize.xl,
        "2xl": fontSize["2xl"],
        "3xl": fontSize["3xl"],
        "4xl": fontSize["4xl"],
        "5xl": fontSize["5xl"],
      },
      borderRadius: {
        none:    radius.none,
        sm:      radius.sm,
        DEFAULT: radius.md,
        md:      radius.md,
        lg:      radius.lg,
        xl:      radius.xl,
        "2xl":   radius["2xl"],
        full:    radius.full,
      },
      boxShadow: {
        xs:               shadow.xs,
        sm:               shadow.sm,
        DEFAULT:          shadow.md,
        md:               shadow.md,
        lg:               shadow.lg,
        xl:               shadow.xl,
        "2xl":            shadow["2xl"],
        inner:            shadow.inner,
        card:             shadow.card,
        "card-hover":     shadow.cardHover,
        modal:            shadow.modal,
        "brand-glow":     shadow.brandGlow,
        "brand-glow-lg":  shadow.brandGlowStrong,
        "amber-glow":     shadow.amberGlow,
      },
      spacing: {
        sidebar:            "260px",
        "sidebar-collapsed": "68px",
        header:             "56px",
      },
      animation: {
        "fade-in":  "fade-in 0.2s ease-out",
        "slide-up": "slide-up 0.22s ease-out",
        "spin-slow": "spin 1.5s linear infinite",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to:   { opacity: "1" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(0.2, 0, 0, 1)",
        bounce: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
    },
  },
};

export default preset;
