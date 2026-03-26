import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#FFF5F5",
          100: "#FFE3E3",
          200: "#FFC9C9",
          300: "#FFA3A3",
          400: "#FF7070",
          500: "#E8453C",
          600: "#D03030",
          700: "#B52424",
          800: "#961E1E",
          900: "#7A1A1A",
          950: "#4C0D0D",
        },
        surface: {
          950: "#0D0D0B",
          900: "#141412",
          800: "#1C1C19",
          700: "#242420",
          600: "#2E2E29",
          500: "#3A3A35",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      animation: {
        "fade-up": "fadeUp 0.5s ease forwards",
        "fade-in": "fadeIn 0.4s ease forwards",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
