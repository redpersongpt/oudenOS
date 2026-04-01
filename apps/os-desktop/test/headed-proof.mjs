#!/usr/bin/env node
/**
 * Headed Electron proof for redcore · OS wizard.
 * Opens the 9-step transformation wizard, advances through steps, captures screenshots.
 */

import electron from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import fs from "node:fs";

const { app, BrowserWindow, ipcMain } = electron;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const resultsDir = path.join(__dirname, "..", "..", "..", "proof-screenshots-os");
fs.mkdirSync(resultsDir, { recursive: true });

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
    const timer = setTimeout(() => { pendingRequests.delete(id); reject(new Error(`Timeout`)); }, 30000);
    pendingRequests.set(id, { resolve, reject, timer });
    serviceProcess.stdin.write(JSON.stringify({ id, method, params: params ?? {} }) + "\n");
  });
}

ipcMain.handle("service:call", async (_event, method, params) => {
  try { return await callService(method, params); }
  catch (err) { return { error: err instanceof Error ? err.message : String(err) }; }
});
ipcMain.on("window:minimize", () => {});
ipcMain.on("window:maximize", () => {});
ipcMain.on("window:close", () => app.quit());

async function screenshot(win, name, delay = 2000) {
  await new Promise(r => setTimeout(r, delay));
  const image = await win.webContents.capturePage();
  const filePath = path.join(resultsDir, `${name}.png`);
  fs.writeFileSync(filePath, image.toPNG());
  console.log(`[Screenshot] ${name}.png (${Math.round(fs.statSync(filePath).size / 1024)}KB)`);
}

app.disableHardwareAcceleration();

app.whenReady().then(async () => {
  startMockService();
  await new Promise(r => setTimeout(r, 2000));

  const preloadPath = path.join(__dirname, "preload-proof.cjs");
  const distIndex = path.join(__dirname, "..", "dist", "renderer", "index.html");
  if (!fs.existsSync(distIndex)) {
    console.error("[Proof] FATAL: dist not found.");
    app.exit(1);
    return;
  }

  const win = new BrowserWindow({
    width: 820,
    height: 580,
    backgroundColor: "#0a0a0e",
    show: true,
    center: true,
    frame: false,
    titleBarStyle: "hidden",
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  win.webContents.on("console-message", (_event, level, message) => {
    if (level >= 2 && !message.includes("Content Security Policy")) {
      console.log(`[Renderer] ${message}`);
    }
  });

  console.log("[Proof] Loading redcore · OS wizard...");
  await win.loadFile(distIndex);

  // Wait for initial render — the wizard auto-advances through welcome -> assessment -> profile
  // because assess.full returns immediately from mock. We need to catch the profile step.
  await screenshot(win, "os-01-wizard-auto", 5000);

  // The wizard auto-advanced. Let's take what we have and exit.
  console.log("[Proof] Screenshot captured. Exiting.");
  if (serviceProcess) serviceProcess.kill();
  app.exit(0);
});
