import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/renderer/**/*.{ts,tsx}",
    "../../packages/system-analyzer/src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
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
        surface: {
          base:    "#1e1e22",
          raised:  "#252529",
          overlay: "#2c2c31",
          card:    "#232327",
          muted:   "#212125",
        },
        ink: {
          DEFAULT:   "#f0f0f4",
          secondary: "#a0a0ac",
          tertiary:  "#6a6a76",
          muted:     "#4a4a54",
          disabled:  "#38383e",
        },
        success: { 400: "#4ade80", 500: "#22c55e" },
        danger:  { 400: "#f87171", 500: "#ef4444" },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.4), 0 4px 12px rgba(0,0,0,0.2)",
        glow: "0 0 20px rgba(232,37,75,0.25)",
      },
      keyframes: {
        "spin-slow": {
          from: { transform: "rotate(0deg)" },
          to:   { transform: "rotate(360deg)" },
        },
      },
      animation: {
        "spin-slow": "spin-slow 2.5s linear infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
