import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  base: "./",
  build: {
    outDir: "dist/renderer",
    emptyOutDir: true,
    // Don't add crossorigin attribute — breaks file:// in Electron
    modulePreload: false,
    rollupOptions: {
      output: {
        // Stable filenames for ASAR packaging
        entryFileNames: "assets/[name].js",
        chunkFileNames: "assets/[name].js",
        assetFileNames: "assets/[name].[ext]",
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src/renderer"),
      "@redcore/shared-schema": path.resolve(__dirname, "../../packages/tuning-shared-schema/src"),
      "@redcore/system-analyzer": path.resolve(__dirname, "../../packages/system-analyzer/src"),
    },
  },
  server: {
    port: 5173,
  },
});
