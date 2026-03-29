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
      "@redcore/design-system": path.resolve(__dirname, "../../packages/tuning-design-system/src"),
      "@redcore/shared-schema": path.resolve(__dirname, "../../packages/tuning-shared-schema/src"),
      "@redcore/system-analyzer": path.resolve(__dirname, "../../packages/system-analyzer/src"),
    },
  },
  build: {
    outDir: path.resolve(__dirname, "dist/renderer"),
    emptyOutDir: true,
    sourcemap: false,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("echarts")) return "echarts-vendor";
          return "vendor";
        },
      },
    },
  },
  server: {
    port: 5173,
  },
});
