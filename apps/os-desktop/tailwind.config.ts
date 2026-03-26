import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./index.html", "./src/renderer/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Brand — redcore red
        brand: {
          300: "#F4827B",
          400: "#EE5E57",
          500: "#E8453C",
          600: "#D43930",
          700: "#BE2F26",
          800: "#9A221B",
          900: "#731912",
          950: "#4D100B",
        },
        // Surfaces — deep dark neutrals
        surface: {
          base:    "#0a0a0f",
          raised:  "#111118",
          overlay: "#18181f",
          muted:   "#0d0d13",
        },
        // Borders
        border: {
          DEFAULT: "rgba(255,255,255,0.07)",
          strong:  "rgba(255,255,255,0.12)",
          focus:   "rgba(232,69,60,0.5)",
        },
        // Ink — text hierarchy
        ink: {
          DEFAULT:   "#e8e8ed",
          secondary: "#8e8e99",
          muted:     "#55555f",
          disabled:  "#38383f",
        },
        // Status
        success: {
          400: "#4ade80",
          500: "#22c55e",
          900: "#14532d",
        },
        warning: {
          400: "#facc15",
          500: "#eab308",
        },
        danger: {
          400: "#f87171",
          500: "#ef4444",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      boxShadow: {
        card:          "0 1px 3px rgba(0,0,0,0.45), 0 6px 16px rgba(0,0,0,0.3)",
        "card-hover":  "0 2px 8px rgba(0,0,0,0.55), 0 12px 28px rgba(0,0,0,0.4)",
        "brand-glow":  "0 0 12px rgba(232,69,60,0.35)",
        "brand-glow-lg": "0 0 20px rgba(232,69,60,0.45)",
      },
      borderRadius: {
        "logo": "22%",
      },
      keyframes: {
        "pulse-ring": {
          "0%, 100%": { opacity: "0.5", transform: "scale(1)" },
          "50%":       { opacity: "1",   transform: "scale(1.15)" },
        },
        "spin-slow": {
          from: { transform: "rotate(0deg)" },
          to:   { transform: "rotate(360deg)" },
        },
      },
      animation: {
        "pulse-ring": "pulse-ring 2s ease-in-out infinite",
        "spin-slow":  "spin-slow 3s linear infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
