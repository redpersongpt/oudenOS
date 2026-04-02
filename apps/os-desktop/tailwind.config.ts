import type { Config } from "tailwindcss";

// Nothing-inspired design system with redcore pink-red accent.
// Fonts: Doto (display), Space Grotesk (body), Space Mono (labels/data)
// Base: OLED black (#000000), no shadows, spacing on 8px grid

export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/renderer/**/*.{ts,tsx}",
    "../../packages/system-analyzer/src/**/*.{ts,tsx}",
  ],
  theme: {
    spacing: {
      "0": "0px",
      "0.5": "2px",
      "1": "4px",
      "2": "8px",
      "3": "12px",
      "4": "16px",
      "5": "20px",
      "6": "24px",
      "8": "32px",
      "10": "40px",
      "12": "48px",
      "16": "64px",
      "24": "96px",
      "px": "1px",
    },
    borderRadius: {
      none: "0px",
      sm: "4px",
      DEFAULT: "8px",
      md: "8px",
      lg: "12px",
      xl: "16px",
      full: "999px",
    },
    fontSize: {
      // Nothing type scale with tracking
      "display-xl": ["72px", { lineHeight: "1.0", letterSpacing: "-0.03em" }],
      "display":    ["48px", { lineHeight: "1.1", letterSpacing: "-0.02em" }],
      "heading":    ["36px", { lineHeight: "1.15", letterSpacing: "-0.01em" }],
      "title":      ["24px", { lineHeight: "1.25", letterSpacing: "-0.01em" }],
      "body-lg":    ["18px", { lineHeight: "1.5", letterSpacing: "0" }],
      "body":       ["16px", { lineHeight: "1.5", letterSpacing: "0" }],
      "body-sm":    ["14px", { lineHeight: "1.5", letterSpacing: "0" }],
      "caption":    ["12px", { lineHeight: "1.4", letterSpacing: "0" }],
      "label":      ["11px", { lineHeight: "1.3", letterSpacing: "0.08em" }],
      // Compat aliases
      "xs": ["11px", { lineHeight: "1.3" }],
      "sm": ["14px", { lineHeight: "1.5" }],
      "base": ["16px", { lineHeight: "1.5" }],
      "lg": ["18px", { lineHeight: "1.5" }],
      "xl": ["24px", { lineHeight: "1.25" }],
      "2xl": ["36px", { lineHeight: "1.15" }],
      "3xl": ["48px", { lineHeight: "1.1" }],
    },
    extend: {
      colors: {
        // Nothing dark palette — OLED black base
        nd: {
          bg:             "#000000",
          surface:        "#111111",
          "surface-raised": "#1A1A1A",
          "border-subtle": "#222222",
          "border":       "#333333",
          "text-disabled": "#666666",
          "text-secondary": "#999999",
          "text-primary":  "#E8E8E8",
          "text-display":  "#FFFFFF",
        },
        // redcore accent (replaces Nothing red)
        brand: {
          300: "#FF6B82",
          400: "#FF4D6A",
          500: "#E8254B",
          600: "#C41E3E",
          700: "#A01832",
          800: "#7C1226",
          900: "#580C1A",
          950: "#34070F",
        },
        // Semantic aliases
        surface: {
          base:    "#000000",
          raised:  "#111111",
          overlay: "#1A1A1A",
          card:    "#111111",
          muted:   "#0A0A0A",
        },
        ink: {
          DEFAULT:   "#E8E8E8",
          secondary: "#999999",
          tertiary:  "#666666",
          muted:     "#444444",
          disabled:  "#333333",
        },
        success: { 400: "#4A9E5C", 500: "#3D8B4F" },
        warning: { 400: "#D4A843", 500: "#C49A38" },
        danger:  { 400: "#E8254B", 500: "#C41E3E" },
        interactive: "#5B9BF6",
      },
      fontFamily: {
        display: ["Doto", "monospace"],
        sans:    ["Space Grotesk", "system-ui", "sans-serif"],
        mono:    ["Space Mono", "ui-monospace", "monospace"],
      },
      transitionTimingFunction: {
        nd: "cubic-bezier(0.25, 0.1, 0.25, 1)",
      },
      transitionDuration: {
        "150": "150ms",
        "250": "250ms",
        "400": "400ms",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to:   { opacity: "1" },
        },
        "segment-fill": {
          from: { transform: "scaleX(0)" },
          to:   { transform: "scaleX(1)" },
        },
      },
      animation: {
        "fade-in": "fade-in 250ms cubic-bezier(0.25, 0.1, 0.25, 1)",
        "segment-fill": "segment-fill 400ms cubic-bezier(0.25, 0.1, 0.25, 1) forwards",
      },
    },
  },
  plugins: [],
} satisfies Config;
