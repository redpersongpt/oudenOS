// ─── redcore · OS — Electron Main Process ───────────────────────────────────
// Production shell for the OS transformation wizard.
// Compact installer-style window. Communicates with Rust service via stdio.
//
// This is NOT a sprawling app shell. It is a contained setup utility:
// - 820x580 default size (installer proportions)
// - Not maximizable by default
// - Centered on screen
// - Frameless with custom title bar
// - Dark background to prevent white flash

import { app, BrowserWindow, ipcMain, session } from "electron";
import path from "node:path";
import { spawn, type ChildProcess } from "node:child_process";
import { createInterface } from "node:readline";

// ─── Service connection ─────────────────────────────────────────────────────

let serviceProcess: ChildProcess | null = null;
let requestId = 0;
const pendingRequests = new Map<
  number,
  { resolve: (v: unknown) => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> }
>();

function startService(): void {
  // Look for the Rust service binary next to the Electron app
  const possiblePaths = [
    path.join(process.resourcesPath ?? "", "redcore-os-service.exe"),
    path.join(app.getAppPath(), "..", "service-core", "target", "release", "redcore-os-service.exe"),
    path.join(app.getAppPath(), "..", "service-core", "target", "debug", "redcore-os-service.exe"),
  ];

  let servicePath: string | null = null;
  for (const p of possiblePaths) {
    try {
      require("fs").accessSync(p);
      servicePath = p;
      break;
    } catch {
      // Try next path
    }
  }

  if (!servicePath) {
    console.warn("[Main] Rust service not found. Running in UI-only mode.");
    return;
  }

  console.log(`[Main] Starting service: ${servicePath}`);
  serviceProcess = spawn(servicePath, [], { stdio: ["pipe", "pipe", "pipe"] });

  // Drain stderr to prevent pipe buffer deadlock
  serviceProcess.stderr?.on("data", () => {});

  const rl = createInterface({ input: serviceProcess.stdout! });
  rl.on("line", (line: string) => {
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
    } catch {
      // Ignore non-JSON lines
    }
  });

  serviceProcess.on("exit", (code) => {
    console.log(`[Main] Service exited with code ${code}`);
    serviceProcess = null;
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
      reject(new Error(`Timeout: ${method}`));
    }, 120_000);
    pendingRequests.set(id, { resolve, reject, timer });
    serviceProcess.stdin.write(
      JSON.stringify({ id, method, params: params ?? {} }) + "\n"
    );
  });
}

// ─── IPC handlers ───────────────────────────────────────────────────────────

ipcMain.handle("service:call", async (_event, method: string, params: unknown) => {
  try {
    return await callService(method, params);
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
});

ipcMain.on("window:minimize", (event) => {
  BrowserWindow.fromWebContents(event.sender)?.minimize();
});

ipcMain.on("window:maximize", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win?.isMaximized()) win.unmaximize();
  else win?.maximize();
});

ipcMain.on("window:close", (event) => {
  BrowserWindow.fromWebContents(event.sender)?.close();
});

// ─── Window creation ────────────────────────────────────────────────────────

function createWindow(): BrowserWindow {
  const preloadPath = path.join(__dirname, "..", "preload", "index.js");

  const win = new BrowserWindow({
    // ── Installer proportions — compact and contained ──
    width: 820,
    height: 580,
    minWidth: 720,
    minHeight: 500,
    maxWidth: 1024,
    maxHeight: 720,

    // ── Centered, not maximized ──
    center: true,
    resizable: true,
    maximizable: false, // Installers don't maximize

    // ── Frameless with custom title bar ──
    frame: false,
    titleBarStyle: "hidden",
    titleBarOverlay: false,

    // ── Dark background prevents white flash ──
    backgroundColor: "#08080d",
    show: false, // Show after ready-to-show

    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // Show when ready (prevents white flash)
  win.once("ready-to-show", () => {
    win.show();
  });

  // Load the renderer
  if (process.env.VITE_DEV_SERVER_URL) {
    // Dev mode: connect to Vite dev server
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    // Production: load built index.html
    const indexPath = path.join(__dirname, "..", "renderer", "index.html");
    win.loadFile(indexPath);
  }

  return win;
}

// ─── App lifecycle ──────────────────────────────────────────────────────────

app.disableHardwareAcceleration();

app.whenReady().then(() => {
  // Set CSP
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [
          [
            "default-src 'self'",
            "script-src 'self'",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' https://fonts.gstatic.com",
            "img-src 'self' data:",
            "connect-src 'self'",
          ].join("; "),
        ],
      },
    });
  });

  startService();
  createWindow();
});

app.on("window-all-closed", () => {
  if (serviceProcess) {
    serviceProcess.stdin?.end();
    serviceProcess.kill();
  }
  app.quit();
});
