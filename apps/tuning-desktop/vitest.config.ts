import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src/renderer"),
      "@redcore/design-system": path.resolve(__dirname, "../../packages/tuning-design-system/src"),
      "@redcore/shared-schema": path.resolve(__dirname, "../../packages/tuning-shared-schema/src"),
    },
  },
});
