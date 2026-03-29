// ─── Electron Main Process ──────────────────────────────────────────────────
// Spawns and manages the Rust service binary.
// All system operations go through the Rust service via JSON-RPC over stdio.

import { app, BrowserWindow, ipcMain, session, shell } from "electron";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn, ChildProcess } from "node:child_process";
import { createInterface } from "node:readline";
import {
  fetchLicense,
  generateDeviceFingerprint,
  validateLicenseOffline,
} from "@redcore/license-client";
import type { LicenseState } from "@redcore/shared-schema/license";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = process.env.NODE_ENV === "development";

let mainWindow: BrowserWindow | null = null;
let isQuitting = false;

// ─── License state ───────────────────────────────────────────────────────────

let currentLicense: LicenseState | null = null;
const CACHE_DIR = path.join(app.getPath("userData"), "license");
const DEVICE_FINGERPRINT = generateDeviceFingerprint();
const DEFAULT_API_BASE = "https://api.redcoreos.net";
const API_BASE = process.env.REDCORE_API_URL ?? DEFAULT_API_BASE;
const API_ORIGIN = (() => {
  try {
    return new URL(API_BASE).origin;
  } catch {
    return new URL(DEFAULT_API_BASE).origin;
  }
})();

async function initLicense(): Promise<LicenseState> {
  const licenseKey = process.env.REDCORE_LICENSE_KEY ?? "";

  try {
    const state = await fetchLicense({
      apiBaseUrl: API_BASE,
      licenseKey,
      deviceFingerprint: DEVICE_FINGERPRINT,
      cacheDir: CACHE_DIR,
    });
    currentLicense = state;
    return state;
  } catch {
    // Offline fallback
    const state = validateLicenseOffline(CACHE_DIR, DEVICE_FINGERPRINT);
    currentLicense = state;
    return state;
  }
}

function getLicense(): LicenseState {
  return currentLicense ?? {
    tier: "free",
    status: "active",
    expiresAt: null,
    deviceBound: false,
    deviceId: null,
    lastValidatedAt: new Date().toISOString(),
    offlineGraceDays: 7,
    offlineDaysRemaining: 0,
    features: [],
  };
}

// ─── Rust service process management ────────────────────────────────────────

let serviceProcess: ChildProcess | null = null;
let requestId = 0;
const pendingRequests = new Map<
  number,
  {
    resolve: (value: unknown) => void;
    reject: (reason: Error) => void;
    timer: ReturnType<typeof setTimeout>;
  }
>();

function getServicePath(): string {
  const ext = process.platform === "win32" ? ".exe" : "";
  if (isDev) {
    return path.resolve(
      __dirname,
      "../../../services/tuning-service/target/debug/redcore-service" + ext,
    );
  }
  return path.join(process.resourcesPath!, "redcore-service" + ext);
}

function startService(): void {
  const servicePath = getServicePath();
  console.log("[Main] Starting service:", servicePath);

  try {
    serviceProcess = spawn(servicePath, [], {
      stdio: ["pipe", "pipe", "pipe"],
    });
  } catch (err) {
    console.error("[Main] Failed to spawn service:", err);
    return;
  }

  const rl = createInterface({ input: serviceProcess.stdout! });

  rl.on("line", (line: string) => {
    try {
      const msg = JSON.parse(line);

      // Response to a request
      if (msg.id !== undefined) {
        const pending = pendingRequests.get(msg.id);
        if (pending) {
          pendingRequests.delete(msg.id);
          clearTimeout(pending.timer);
          if (msg.error) {
            pending.reject(new Error(msg.error.message));
          } else {
            pending.resolve(msg.result);
          }
        }
      }

      // Push event from service
      if (msg.event) {
        mainWindow?.webContents.send(`service:${msg.event}`, msg.data);
      }
    } catch {
      // Not JSON — log as service output
      console.log("[Service]", line);
    }
  });

  serviceProcess.stderr?.on("data", (chunk: Buffer) => {
    // Service uses tracing with JSON — just log it
    const lines = chunk.toString().trim().split("\n");
    for (const line of lines) {
      console.log("[Service]", line);
    }
  });

  serviceProcess.on("exit", (code: number | null) => {
    console.log(`[Main] Service exited (code=${code})`);

    // Reject all pending requests
    for (const [id, pending] of pendingRequests) {
      clearTimeout(pending.timer);
      pending.reject(new Error("Service exited unexpectedly"));
      pendingRequests.delete(id);
    }

    serviceProcess = null;

    // Restart if not quitting and abnormal exit
    if (!isQuitting) {
      console.log("[Main] Restarting service in 2s...");
      setTimeout(startService, 2000);
    }
  });
}

function callService(method: string, params: unknown): Promise<unknown> {
  return new Promise((resolve, reject) => {
    if (!serviceProcess?.stdin?.writable) {
      reject(new Error("Service not running"));
      return;
    }

    const id = ++requestId;
    const timer = setTimeout(() => {
      pendingRequests.delete(id);
      reject(new Error(`Service call timeout: ${method}`));
    }, 30000); // 30s timeout

    pendingRequests.set(id, { resolve, reject, timer });

    const request = JSON.stringify({ id, method, params: params ?? {} }) + "\n";
    serviceProcess.stdin!.write(request);
  });
}

function stopService(): void {
  if (serviceProcess) {
    serviceProcess.kill();
    serviceProcess = null;
  }
}

function resolveWindowIconPath(): string | undefined {
  const candidates = [
    path.join(process.resourcesPath ?? "", "redcore-icon.png"),
    path.resolve(__dirname, "../../resources/redcore-icon.png"),
    path.resolve(app.getAppPath(), "resources/redcore-icon.png"),
  ];

  return candidates.find((candidate) => existsSync(candidate));
}

// ─── Window creation ─────────────────────────────────────────────────────────

function createWindow() {
  mainWindow = new BrowserWindow({
    icon: resolveWindowIconPath(),
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    frame: false,
    titleBarStyle: "hidden",
    titleBarOverlay: {
      color: "#0D0D10",
      symbolColor: "#A1A09D",
      height: 36,
    },
    backgroundColor: "#0D0D10",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });

  // Content Security Policy
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [
          "default-src 'self'",
          "script-src 'self'",
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          "font-src 'self' https://fonts.gstatic.com",
          "img-src 'self' data: https:",
          `connect-src 'self' ${API_ORIGIN}`,
        ].join("; "),
      },
    });
  });

  // Graceful show
  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }

  // Restrict navigation — prevent renderer from being redirected to attacker URLs
  mainWindow.webContents.on("will-navigate", (event, url) => {
    const allowedOrigins = isDev
      ? ["http://localhost:5173"]
      : [`file://${path.join(__dirname, "../renderer/")}`];
    const isAllowed = allowedOrigins.some((origin) => url.startsWith(origin));
    if (!isAllowed) {
      event.preventDefault();
    }
  });

  // Block new window creation from renderer
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// ─── Window control IPC ──────────────────────────────────────────────────────

ipcMain.on("window:minimize", () => mainWindow?.minimize());
ipcMain.on("window:maximize", () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});
ipcMain.on("window:close", () => mainWindow?.close());

// ─── Service IPC bridge ──────────────────────────────────────────────────────

// Allowlist of methods the renderer is permitted to call on the Rust service.
// This is the main-process enforcement layer — preload also validates, but
// defense-in-depth means we check here too. `license.setTier` is deliberately
// excluded: it is an internal main→service call, never renderer-initiated.
const ALLOWED_SERVICE_METHODS: ReadonlySet<string> = new Set([
  "scan.hardware", "scan.quick", "scan.cpuPower", "scan.scheduler",
  "scan.serviceStates", "scan.filesystem", "scan.memMgmt",
  "tuning.generatePlan", "tuning.getActions", "tuning.previewAction",
  "tuning.applyPlan", "tuning.applyAction", "tuning.skipAction",
  "benchmark.run", "benchmark.list", "benchmark.compare", "benchmark.analyzeBottlenecks",
  "rollback.listSnapshots", "rollback.createSnapshot", "rollback.restore",
  "rollback.getDiff", "rollback.getAuditLog", "rollback.restoreActions",
  "journal.getState", "journal.resume", "journal.cancel",
  "license.getState", "license.activate", "license.deactivate", "license.refresh",
  "apphub.getCatalog", "apphub.install", "apphub.checkUpdates",
  "system.requestReboot", "system.getServiceStatus",
  "intelligence.classify", "intelligence.getProfile", "intelligence.getRecommendations",
]);

ipcMain.handle("service:call", async (_event, method: string, params: unknown) => {
  if (!ALLOWED_SERVICE_METHODS.has(method)) {
    console.error(`[Main] Blocked unauthorized service call: ${method}`);
    return { error: `Method not allowed: ${method}` };
  }
  try {
    return await callService(method, params);
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
});

// ─── Shell IPC ───────────────────────────────────────────────────────────────

ipcMain.handle("shell:openExternal", (_event, url: string) => {
  // Only allow https:// URLs — prevent arbitrary protocol execution
  if (typeof url === "string" && url.startsWith("https://")) {
    return shell.openExternal(url);
  }
});

// ─── License IPC ─────────────────────────────────────────────────────────────

// Renderer can request the current license state
ipcMain.handle("license:get", () => getLicense());

// Renderer can trigger a license refresh (re-fetches from cloud)
ipcMain.handle("license:refresh", async () => {
  const state = await initLicense();
  // Push updated state to renderer
  mainWindow?.webContents.send("service:license.changed", state);
  return state;
});

// ─── App lifecycle ────────────────────────────────────────────────────────────

const LICENSE_REFRESH_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

async function refreshLicensePeriodic(): Promise<void> {
  try {
    const state = await initLicense();
    console.log(`[Main] License refresh: tier=${state.tier} status=${state.status}`);
    mainWindow?.webContents.send("service:license.changed", state);
    try {
      await callService("license.setTier", { tier: state.tier, status: state.status });
    } catch {
      // Non-fatal
    }
  } catch {
    // Silently keep existing cached state
  }
}

app.whenReady().then(async () => {
  // Fetch license before starting service so tier is available immediately
  const license = await initLicense();
  console.log(`[Main] License: tier=${license.tier} status=${license.status}`);

  startService();
  createWindow();

  // Send license tier to service once it's running (with brief startup delay)
  setTimeout(async () => {
    try {
      await callService("license.setTier", { tier: license.tier, status: license.status });
    } catch {
      // Non-fatal — service uses free tier by default
    }
  }, 3000);

  // Periodic license refresh every hour
  setInterval(refreshLicensePeriodic, LICENSE_REFRESH_INTERVAL_MS);
});

app.on("before-quit", () => {
  isQuitting = true;
  stopService();
});

app.on("window-all-closed", () => {
  app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
