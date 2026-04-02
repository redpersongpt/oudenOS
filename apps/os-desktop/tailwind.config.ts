import type { Config } from "tailwindcss";

// Harfi harfine token spec'e uygun. Siyah, beyaz, gri — saf monokrom.

export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/renderer/**/*.{ts,tsx}",
    "../../packages/system-analyzer/src/**/*.{ts,tsx}",
  ],
  theme: {
    spacing: {
      "0": "0px", "px": "1px",
      "0.5": "2px", "1": "4px", "2": "8px", "3": "12px", "4": "16px",
      "5": "20px", "6": "24px", "8": "32px", "10": "40px", "12": "48px",
      "16": "64px", "24": "96px",
    },
    borderRadius: {
      none: "0px",
      sm: "4px",     // technical
      DEFAULT: "8px", // compact
      md: "8px",
      lg: "12px",    // cards
      xl: "16px",    // max card radius — NEVER bigger
      full: "999px", // pills/buttons
    },
    fontSize: {
      "display-xl": ["72px", { lineHeight: "1.0", letterSpacing: "-0.03em" }],
      "display":    ["48px", { lineHeight: "1.05", letterSpacing: "-0.02em" }],
      "display-md": ["36px", { lineHeight: "1.1", letterSpacing: "-0.02em" }],
      "heading":    ["24px", { lineHeight: "1.2", letterSpacing: "-0.01em" }],
      "subheading": ["18px", { lineHeight: "1.3", letterSpacing: "0" }],
      "body":       ["16px", { lineHeight: "1.5", letterSpacing: "0" }],
      "body-sm":    ["14px", { lineHeight: "1.5", letterSpacing: "0.01em" }],
      "caption":    ["12px", { lineHeight: "1.4", letterSpacing: "0.04em" }],
      "label":      ["11px", { lineHeight: "1.2", letterSpacing: "0.08em" }],
      // compat
      "xs": ["11px", { lineHeight: "1.2" }],
      "sm": ["14px", { lineHeight: "1.5" }],
      "base": ["16px", { lineHeight: "1.5" }],
      "lg": ["18px", { lineHeight: "1.3" }],
      "xl": ["24px", { lineHeight: "1.2" }],
      "2xl": ["36px", { lineHeight: "1.1" }],
      "3xl": ["48px", { lineHeight: "1.05" }],
    },
    extend: {
      colors: {
        // Exact token spec — NO grays outside this list
        nd: {
          black:          "#000000",
          surface:        "#111111",
          "surface-raised": "#1A1A1A",
          border:         "#222222",
          "border-visible": "#333333",
          "text-disabled": "#666666",
          "text-secondary": "#999999",
          "text-primary":  "#E8E8E8",
          "text-display":  "#FFFFFF",
          accent:         "#E8E8E8",
          "accent-subtle": "rgba(255,255,255,0.1)",
          success:        "#4A9E5C",
          warning:        "#D4A843",
          interactive:    "#5B9BF6",
        },
        // Semantic shortcuts
        brand: {
          300: "#F5F5F5", 400: "#F0F0F0", 500: "#E8E8E8",
          600: "#CCCCCC", 700: "#999999",
        },
        surface: {
          base: "#000000", raised: "#111111", overlay: "#1A1A1A",
          card: "#111111", muted: "#000000",
        },
        ink: {
          DEFAULT: "#E8E8E8", secondary: "#999999", tertiary: "#666666",
          muted: "#333333", disabled: "#222222",
        },
        success: { 400: "#4A9E5C", 500: "#3D8B4F" },
        warning: { 400: "#D4A843", 500: "#C49A38" },
        danger:  { 400: "#FF6B6B", 500: "#E05555" },
      },
      fontFamily: {
        display: ['"Doto"', "monospace"],
        sans:    ['"Space Grotesk"', "system-ui", "sans-serif"],
        mono:    ['"Space Mono"', "monospace"],
      },
      transitionTimingFunction: {
        nd: "cubic-bezier(0.25, 0.1, 0.25, 1)",
      },
    },
  },
  plugins: [],
} satisfies Config;
