#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// oudenOS — Mac demo launcher
// ─────────────────────────────────────────────────────────────────────────────
// Runs the real desktop renderer in your browser with NO privileged Windows
// service behind it. With no Tauri runtime present, the app auto-detects demo
// mode (see apps/os-desktop/src/renderer/lib/platform-tauri.ts) and walks the
// full wizard UI using simulated data. Nothing is applied to your system — this
// is a faithful preview of what oudenOS looks like and does on Windows.
//
//   pnpm demo:os:mac            (from the repo root)
//   pnpm --dir apps/os-desktop demo:mac
//
// Stop with Ctrl+C.
// ─────────────────────────────────────────────────────────────────────────────

import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import process from "node:process";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const osDesktopDir = path.join(repoRoot, "apps", "os-desktop");
const port = process.env.OUDEN_DEMO_PORT || "5173";
const url = `http://localhost:${port}`;

console.log(`
  oudenOS — Mac demo
  ──────────────────
  Opening the desktop UI in your browser. There is no Windows service running,
  so the app runs in demo mode: the full interface works, every action is
  simulated, and nothing on your Mac is changed.

  URL:  ${url}
  Quit: press Ctrl+C
`);

// Start the Vite dev server for the renderer. The renderer's vite.config.ts
// defaults to port 5173; --port/--strictPort let OUDEN_DEMO_PORT override it
// and fail fast if the port is taken (rather than silently picking another).
const vite = spawn(
  "pnpm",
  ["exec", "vite", "--port", port, "--strictPort"],
  { cwd: osDesktopDir, stdio: ["ignore", "inherit", "inherit"], env: process.env },
);

vite.on("error", (err) => {
  console.error("Failed to start the demo (is pnpm installed?):", err.message);
  process.exit(1);
});

// Open the default browser once Vite has had a moment to bind the port.
let opened = false;
const openBrowser = () => {
  if (opened) return;
  opened = true;
  const opener =
    process.platform === "darwin" ? "open" :
    process.platform === "win32" ? "explorer" : "xdg-open";
  spawn(opener, [url], { stdio: "ignore", detached: true })
    .on("error", () => {
      console.log(`  Open ${url} in your browser to view the demo.`);
    });
};
const openTimer = setTimeout(openBrowser, 2500);

const shutdown = () => {
  clearTimeout(openTimer);
  if (!vite.killed) vite.kill("SIGTERM");
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
vite.on("exit", (code) => process.exit(code ?? 0));
