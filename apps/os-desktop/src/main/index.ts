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

import { app, BrowserWindow, ipcMain, session, shell } from "electron";
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

  // Log stderr to prevent pipe buffer deadlock and surface service errors
  serviceProcess.stderr?.on("data", (chunk: Buffer) => {
    const msg = chunk.toString().trim();
    if (msg) console.error(`[Service] ${msg}`);
  });

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
  if (!serviceProcess?.stdin?.writable) {
    // Return a structured error instead of crashing the renderer
    return { __serviceUnavailable: true, error: "Service not running. Running in demo mode." };
  }
  try {
    const result = await callService(method, params);
    if (result && typeof result === "object" && "error" in result && !(result as Record<string, unknown>).result) {
      return { __serviceError: true, error: (result as { error: { message?: string } }).error?.message ?? "Service error" };
    }
    return result;
  } catch (e) {
    return { __serviceError: true, error: e instanceof Error ? e.message : "Unknown error" };
  }
});

ipcMain.handle("service:status", () => {
  return {
    running: !!serviceProcess?.stdin?.writable,
    mode: serviceProcess?.stdin?.writable ? "live" : "demo",
  };
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

ipcMain.handle("shell:openExternal", (_event, url: string) => {
  // Only allow https URLs to prevent arbitrary protocol execution
  if (typeof url === "string" && url.startsWith("https://")) {
    return shell.openExternal(url);
  }
});

// ─── Window creation ────────────────────────────────────────────────────────

function createWindow(): BrowserWindow {
  const preloadPath = path.join(__dirname, "..", "preload", "index.js");
  const iconPath = path.join(process.resourcesPath ?? __dirname, "redcore-icon.png");

  const win = new BrowserWindow({
    icon: iconPath,
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
    backgroundColor: "#1e1e22",
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

  // Block navigation — renderer must not redirect to arbitrary URLs
  win.webContents.on("will-navigate", (event, url) => {
    const isDev = !!process.env.VITE_DEV_SERVER_URL;
    const allowedPrefixes = isDev ? ["http://localhost:5173"] : [];
    const isAllowed = allowedPrefixes.some((prefix) => url.startsWith(prefix));
    if (!isAllowed) {
      event.preventDefault();
      console.warn("[Main] Blocked navigation to:", url);
    }
  });

  // Block new window creation from renderer
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://")) {
      shell.openExternal(url);
    }
    return { action: "deny" };
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

// Remove Electron from user-agent string
app.userAgentFallback = app.userAgentFallback
  .replace(/\sElectron\/[\d.]+/, "")
  .replace(/\s@redcore-os\/desktop\/[\d.]+/, "");

app.setName("redcore OS");

app.whenReady().then(() => {
  const isDev = !!process.env.VITE_DEV_SERVER_URL;

  // Set CSP — relaxed in dev to allow Vite HMR
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const csp = isDev
      ? "default-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:* ws://localhost:*; img-src 'self' data:; font-src 'self' https://fonts.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com"
      : [
          "default-src 'self'",
          "script-src 'self'",
          "style-src 'self' 'unsafe-inline'",
          "font-src 'self' data:",
          "img-src 'self' data:",
          "connect-src 'self'",
        ].join("; ");

    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [csp],
      },
    });
  });

  startService();
  createWindow();
});

app.on("window-all-closed", () => {
  // Clear all pending IPC timers
  for (const [id, req] of pendingRequests) {
    clearTimeout(req.timer);
    pendingRequests.delete(id);
  }

  if (serviceProcess) {
    serviceProcess.stdin?.end();
    serviceProcess.kill();
    // Force kill after 3 seconds if still alive
    setTimeout(() => {
      if (serviceProcess && !serviceProcess.killed) {
        serviceProcess.kill("SIGKILL");
      }
    }, 3000);
  }
  app.quit();
});
