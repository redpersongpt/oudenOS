#!/usr/bin/env node
/**
 * Headed Electron proof launcher.
 * Loads the real Vite-built product UI with a mock service.
 * Default route is /wizard — no auth needed.
 */

import { app, BrowserWindow, ipcMain, session } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const resultsDir = path.join(__dirname, "..", "..", "..", "proof-screenshots");
fs.mkdirSync(resultsDir, { recursive: true });

// ─── Mock service ───────────────────────────────────────────────────────────

let serviceProcess = null;
let requestId = 0;
const pendingRequests = new Map();

function startMockService() {
  const mockPath = path.join(__dirname, "mock-service.mjs");
  console.log(`[Proof] Starting mock service: ${mockPath}`);
  serviceProcess = spawn("node", [mockPath], { stdio: ["pipe", "pipe", "pipe"] });
  const rl = createInterface({ input: serviceProcess.stdout });
  rl.on("line", (line) => {
    try {
      const msg = JSON.parse(line);
      if (msg.id !== undefined) {
        const pending = pendingRequests.get(msg.id);
        if (pending) {
          pendingRequests.delete(msg.id);
          clearTimeout(pending.timer);
          if (msg.error) pending.reject(new Error(msg.error.message));
          else pending.resolve(msg.result);
        }
      }
    } catch {}
  });
  serviceProcess.stderr?.on("data", (chunk) => {
    console.log(`[MockSvc] ${chunk.toString().trim()}`);
  });
}

function callService(method, params) {
  return new Promise((resolve, reject) => {
    if (!serviceProcess?.stdin?.writable) { reject(new Error("Not running")); return; }
    const id = ++requestId;
    const timer = setTimeout(() => { pendingRequests.delete(id); reject(new Error(`Timeout: ${method}`)); }, 30000);
    pendingRequests.set(id, { resolve, reject, timer });
    serviceProcess.stdin.write(JSON.stringify({ id, method, params: params ?? {} }) + "\n");
  });
}

// ─── IPC bridge ─────────────────────────────────────────────────────────────

ipcMain.handle("service:call", async (_event, method, params) => {
  try { return await callService(method, params); }
  catch (err) { return { error: err instanceof Error ? err.message : String(err) }; }
});
ipcMain.handle("license:get", () => ({
  tier: "premium", status: "active", expiresAt: "2027-03-25T00:00:00Z",
  deviceBound: true, deviceId: "proof-device",
  lastValidatedAt: new Date().toISOString(),
  offlineGraceDays: 30, offlineDaysRemaining: 30, features: [],
}));
ipcMain.handle("license:refresh", () => ({}));
ipcMain.on("window:minimize", () => {});
ipcMain.on("window:maximize", () => {});
ipcMain.on("window:close", () => app.quit());

// ─── Screenshot ─────────────────────────────────────────────────────────────

async function screenshot(win, name) {
  await new Promise(r => setTimeout(r, 1500));
  const image = await win.webContents.capturePage();
  const filePath = path.join(resultsDir, `${name}.png`);
  fs.writeFileSync(filePath, image.toPNG());
  console.log(`[Proof] Screenshot: ${name}.png (${fs.statSync(filePath).size} bytes)`);
}

// ─── Main ───────────────────────────────────────────────────────────────────

app.disableHardwareAcceleration();

app.whenReady().then(async () => {
  startMockService();
  await new Promise(r => setTimeout(r, 2000));

  const preloadOut = path.join(resultsDir, "preload-compiled.js");
  if (!fs.existsSync(preloadOut)) {
    console.error("[Proof] FATAL: preload not compiled.");
    app.exit(1);
    return;
  }

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline'",
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          "font-src 'self' https://fonts.gstatic.com",
          "img-src 'self' data: https: http:",
          "connect-src 'self' https://api.redcoreos.net",
        ].join("; "),
      },
    });
  });

  const win = new BrowserWindow({
    width: 900,
    height: 600,
    minWidth: 800,
    minHeight: 550,
    backgroundColor: "#0a0a0e",
    show: true,
    center: true,
    resizable: true,
    frame: false,
    titleBarStyle: "hidden",
    webPreferences: {
      preload: preloadOut,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // Capture renderer errors
  win.webContents.on("console-message", (_event, level, message) => {
    if (level >= 2) console.log(`[Renderer ERROR] ${message}`);
  });

  // Clear any old auth state so we land on /wizard (public route)
  await win.webContents.session.clearStorageData();

  const distIndex = path.join(__dirname, "..", "dist", "renderer", "index.html");
  if (!fs.existsSync(distIndex)) {
    console.error("[Proof] FATAL: dist/index.html not found. Run vite build.");
    app.exit(1);
    return;
  }

  console.log("[Proof] Loading product UI...");
  await win.loadFile(distIndex);

  // Wait for React to mount — default route is /wizard
  await new Promise(r => setTimeout(r, 3000));
  console.log("[Proof] Ready. Window open on /wizard.");

  // Take initial screenshot
  await screenshot(win, "wizard-01-welcome");

  console.log("[Proof] App is running. Close window or Ctrl+C to exit.");
});
