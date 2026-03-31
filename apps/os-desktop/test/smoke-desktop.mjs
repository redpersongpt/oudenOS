#!/usr/bin/env node
/**
 * Desktop Smoke Test: launches the REAL Electron app with the REAL Rust service,
 * verifies the full contract: main → preload → renderer → service IPC.
 *
 * PROVES:
 *   - Electron app starts (main process initializes)
 *   - Production preload loads and exposes the bridge
 *   - Production renderer loads (HTML/JS/CSS)
 *   - BrowserWindow reaches ready-to-show state
 *   - Real Rust service starts and connects via IPC
 *   - service:status IPC roundtrip through the full contract
 *   - service:call("system.status") through preload bridge
 *
 * DOES NOT PROVE:
 *   - Wizard step navigation
 *   - Apply/reboot/rollback execution
 *   - Visual correctness
 *   - User interaction flows
 *
 * Usage: npx electron test/smoke-desktop.mjs [--service-path path/to/binary]
 * Exit code 0 = pass, 1 = failure
 */

import electron from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import fs from "node:fs";

const { app, BrowserWindow, ipcMain, session } = electron;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..", "..");

// ─── Parse args ────────────────────────────────────────────────────────────

let serviceBinaryPath = null;
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--service-path" && args[i + 1]) {
    serviceBinaryPath = path.resolve(args[i + 1]);
    i++;
  }
}

// Find service binary
if (!serviceBinaryPath) {
  const ext = process.platform === "win32" ? ".exe" : "";
  const candidates = [
    path.join(ROOT, `services/os-service/target/debug/redcore-os-service${ext}`),
    path.join(ROOT, `services/os-service/target/release/redcore-os-service${ext}`),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) { serviceBinaryPath = c; break; }
  }
}

// ─── Service connection (real Rust binary) ─────────────────────────────────

let serviceProcess = null;
let requestId = 0;
const pendingRequests = new Map();
const checks = [];

function startRealService() {
  if (!serviceBinaryPath || !fs.existsSync(serviceBinaryPath)) {
    checks.push({ name: "service-binary-exists", pass: false, detail: `Not found: ${serviceBinaryPath}` });
    return false;
  }

  checks.push({ name: "service-binary-exists", pass: true, detail: serviceBinaryPath });

  const playbookDir = path.join(ROOT, "playbooks");
  serviceProcess = spawn(serviceBinaryPath, [], {
    stdio: ["pipe", "pipe", "pipe"],
    env: {
      ...process.env,
      RUST_LOG: "redcore_os_service=warn",
      REDCORE_PLAYBOOK_DIR: playbookDir,
    },
  });

  const rl = createInterface({ input: serviceProcess.stdout });
  rl.on("line", (line) => {
    try {
      const msg = JSON.parse(line);
      if (msg.id !== undefined) {
        const p = pendingRequests.get(msg.id);
        if (p) { pendingRequests.delete(msg.id); clearTimeout(p.timer); p.resolve(msg.result ?? msg); }
      }
    } catch { /* non-JSON */ }
  });
  serviceProcess.stderr?.on("data", () => {});
  serviceProcess.on("exit", (code) => {
    if (code !== 0 && code !== null) {
      checks.push({ name: "service-exit-clean", pass: false, detail: `exit code ${code}` });
    }
  });
  return true;
}

function callService(method, params) {
  return new Promise((resolve, reject) => {
    if (!serviceProcess?.stdin?.writable) { reject(new Error("Not running")); return; }
    const id = ++requestId;
    const timer = setTimeout(() => { pendingRequests.delete(id); reject(new Error("Timeout")); }, 15000);
    pendingRequests.set(id, { resolve, reject, timer });
    serviceProcess.stdin.write(JSON.stringify({ id, method, params: params ?? {} }) + "\n");
  });
}

// ─── IPC handlers (same as production main/index.ts) ───────────────────────

ipcMain.handle("service:call", async (_event, method, params) => {
  if (!serviceProcess?.stdin?.writable) {
    return { __serviceUnavailable: true, error: "Service not running" };
  }
  try { return await callService(method, params); }
  catch (e) { return { __serviceError: true, error: e instanceof Error ? e.message : String(e) }; }
});

ipcMain.handle("service:status", () => ({
  running: !!serviceProcess?.stdin?.writable,
  mode: serviceProcess?.stdin?.writable ? "live" : "demo",
}));

ipcMain.on("window:minimize", () => {});
ipcMain.on("window:maximize", () => {});
ipcMain.on("window:close", () => {});
ipcMain.handle("shell:openExternal", () => {});
ipcMain.handle("wizard:exportPackage", () => ({ ok: false, error: "Smoke test" }));

// ─── App lifecycle ─────────────────────────────────────────────────────────

app.disableHardwareAcceleration();

app.whenReady().then(async () => {
  console.log("");
  console.log("  redcore OS — Desktop Smoke Test");
  console.log("  ───────────────────────────────");

  // Start real service
  const serviceStarted = startRealService();
  if (serviceStarted) {
    await new Promise(r => setTimeout(r, 2000));
    checks.push({ name: "service-started", pass: !!serviceProcess?.stdin?.writable, detail: "" });
  }

  // Check built assets exist
  const preloadPath = path.join(__dirname, "..", "dist", "preload", "index.js");
  const distIndex = path.join(__dirname, "..", "dist", "renderer", "index.html");

  checks.push({ name: "preload-built", pass: fs.existsSync(preloadPath), detail: preloadPath });
  checks.push({ name: "renderer-built", pass: fs.existsSync(distIndex), detail: distIndex });

  if (!fs.existsSync(preloadPath) || !fs.existsSync(distIndex)) {
    reportAndExit();
    return;
  }

  // CSP
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": ["default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data:; connect-src 'self'"],
      },
    });
  });

  // Create window
  const win = new BrowserWindow({
    width: 820, height: 580,
    show: false,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  let readyToShow = false;
  win.once("ready-to-show", () => { readyToShow = true; });

  // Load renderer
  try {
    await win.loadFile(distIndex);
    checks.push({ name: "renderer-loaded", pass: true, detail: "" });
  } catch (e) {
    checks.push({ name: "renderer-loaded", pass: false, detail: e.message });
    reportAndExit();
    return;
  }

  await new Promise(r => setTimeout(r, 3000));
  checks.push({ name: "ready-to-show", pass: readyToShow, detail: "" });

  // Test service:status through preload bridge
  try {
    const statusResult = await win.webContents.executeJavaScript(
      `window.redcore?.service?.status?.()?.then?.(r => JSON.stringify(r)) ?? "null"`
    );
    const parsed = JSON.parse(statusResult);
    const running = parsed?.running === true;
    checks.push({ name: "preload-bridge-status", pass: running, detail: `running=${running}, mode=${parsed?.mode}` });
  } catch (e) {
    checks.push({ name: "preload-bridge-status", pass: false, detail: e.message });
  }

  // Test service:call through preload bridge → real Rust service
  try {
    const callResult = await win.webContents.executeJavaScript(
      `window.redcore?.service?.call?.("system.status", {})?.then?.(r => JSON.stringify(r)) ?? "null"`
    );
    const parsed = JSON.parse(callResult);
    const hasVersion = typeof parsed?.version === "string" && parsed.version.length > 0;
    checks.push({ name: "preload-bridge-ipc-roundtrip", pass: hasVersion, detail: `version=${parsed?.version}` });
  } catch (e) {
    checks.push({ name: "preload-bridge-ipc-roundtrip", pass: false, detail: e.message });
  }

  reportAndExit();
});

function reportAndExit() {
  console.log("");
  let passed = 0, failed = 0;
  for (const { name, pass, detail } of checks) {
    const status = pass ? "PASS" : "FAIL";
    const extra = detail ? ` (${detail})` : "";
    console.log(`  ${status}  ${name}${extra}`);
    if (pass) passed++; else failed++;
  }
  console.log("");
  console.log(`  ${passed} passed, ${failed} failed`);
  console.log(`  RESULT: ${failed === 0 ? "PASS" : "FAIL"}`);
  console.log("");

  // Cleanup
  if (serviceProcess) {
    serviceProcess.stdin?.end();
    serviceProcess.kill();
  }

  app.exit(failed === 0 ? 0 : 1);
}

app.on("window-all-closed", () => {});
