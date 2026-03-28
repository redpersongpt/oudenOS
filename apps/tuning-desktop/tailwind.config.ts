import type { Config } from "tailwindcss";
import redcorePreset from "@redcore/design-system/tailwind";

const config: Config = {
  presets: [redcorePreset as Config],
  content: [
    "./src/renderer/**/*.{ts,tsx}",
    "../../packages/tuning-design-system/src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
