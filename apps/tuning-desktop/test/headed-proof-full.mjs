#!/usr/bin/env node
/**
 * Full headed proof: captures screenshots of key rebuilt surfaces.
 * Navigates to wizard, dashboard (with sidebar), and premium gate.
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
  serviceProcess.stderr?.on("data", () => {});
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

async function screenshot(win, name, delay = 1500) {
  await new Promise(r => setTimeout(r, delay));
  const image = await win.webContents.capturePage();
  const filePath = path.join(resultsDir, `${name}.png`);
  fs.writeFileSync(filePath, image.toPNG());
  console.log(`[Screenshot] ${name}.png (${Math.round(fs.statSync(filePath).size / 1024)}KB)`);
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
          "connect-src 'self' https://api.redcoreos.net https://api.redcore-tuning.com",
        ].join("; "),
      },
    });
  });

  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    backgroundColor: "#0a0a0e",
    show: true,
    center: true,
    frame: false,
    titleBarStyle: "hidden",
    webPreferences: {
      preload: preloadOut,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  const distIndex = path.join(__dirname, "..", "dist", "renderer", "index.html");
  if (!fs.existsSync(distIndex)) {
    console.error("[Proof] FATAL: dist/index.html not found.");
    app.exit(1);
    return;
  }

  // Load wizard first (no auth needed)
  await win.webContents.session.clearStorageData();
  console.log("[Proof] Loading wizard...");
  await win.loadFile(distIndex);
  await new Promise(r => setTimeout(r, 3000));

  // ── Capture wizard ──
  await screenshot(win, "rebuild-01-wizard", 2000);

  // ── Inject auth and reload for dashboard pages ──
  await win.webContents.executeJavaScript(`
    localStorage.setItem('redcore-auth', JSON.stringify({
      state: {
        user: { id: 'proof-user', email: 'proof@redcore.com', name: 'Proof User' },
        accessToken: 'proof-token',
        refreshToken: 'proof-refresh',
        isAuthenticated: true
      },
      version: 0
    }));
  `);
  // Reload to pick up auth state
  await win.loadFile(distIndex);
  await new Promise(r => setTimeout(r, 3000));

  // ── Navigate using pushState (BrowserRouter) ──
  async function navigateTo(path) {
    await win.webContents.executeJavaScript(`
      window.history.pushState({}, '', '${path}');
      window.dispatchEvent(new PopStateEvent('popstate'));
    `);
  }

  // Dashboard
  await navigateTo("/dashboard");
  await screenshot(win, "rebuild-02-dashboard", 2500);

  // Hardware
  await navigateTo("/hardware");
  await screenshot(win, "rebuild-03-hardware", 2000);

  // Benchmark
  await navigateTo("/benchmark");
  await screenshot(win, "rebuild-04-benchmark", 2000);

  // Rollback
  await navigateTo("/rollback");
  await screenshot(win, "rebuild-05-rollback", 2000);

  // Subscription
  await navigateTo("/subscription");
  await screenshot(win, "rebuild-06-subscription", 2000);

  console.log("[Proof] All screenshots captured. Exiting.");
  if (serviceProcess) serviceProcess.kill();
  app.exit(0);
});
