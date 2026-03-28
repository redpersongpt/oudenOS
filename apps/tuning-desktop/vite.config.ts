import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  root: "src/renderer",
  base: "./",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src/renderer"),
      "@redcore/design-system": path.resolve(__dirname, "../../packages/design-system/src"),
      "@redcore/shared-schema": path.resolve(__dirname, "../../packages/shared-schema/src"),
    },
  },
  build: {
    outDir: path.resolve(__dirname, "dist/renderer"),
    emptyOutDir: true,
    sourcemap: false,
  },
  server: {
    port: 5173,
  },
});
