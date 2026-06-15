import type { Config } from "tailwindcss";
import oudenosPreset from "@oudenos/design-system/tailwind";

const config: Config = {
  presets: [oudenosPreset as Config],
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
