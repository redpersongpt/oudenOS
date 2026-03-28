#!/usr/bin/env node
/**
 * Headed proof: captures wizard steps by clicking Continue button.
 * The mock service returns instantly, so we screenshot quickly between navigations.
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
        const p = pendingRequests.get(msg.id);
        if (p) { pendingRequests.delete(msg.id); clearTimeout(p.timer); p.resolve(msg.result); }
      }
    } catch {}
  });
  serviceProcess.stderr?.on("data", () => {});
}

function callService(method, params) {
  return new Promise((resolve, reject) => {
    if (!serviceProcess?.stdin?.writable) { reject(new Error("Not running")); return; }
    const id = ++requestId;
    const timer = setTimeout(() => { pendingRequests.delete(id); reject(new Error("Timeout")); }, 30000);
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

async function screenshot(win, name, delay = 1000) {
  await new Promise(r => setTimeout(r, delay));
  const image = await win.webContents.capturePage();
  const fp = path.join(resultsDir, `${name}.png`);
  fs.writeFileSync(fp, image.toPNG());
  console.log(`[Screenshot] ${name}.png (${Math.round(fs.statSync(fp).size / 1024)}KB)`);
}

async function clickButton(win, text) {
  await win.webContents.executeJavaScript(`
    (function() {
      const btns = document.querySelectorAll('button');
      for (const btn of btns) {
        if (btn.textContent.includes('${text}')) {
          btn.click();
          return true;
        }
      }
      return false;
    })();
  `);
}

app.disableHardwareAcceleration();

app.whenReady().then(async () => {
  startMockService();
  await new Promise(r => setTimeout(r, 2000));

  const preloadPath = path.join(__dirname, "preload-proof.cjs");
  const distIndex = path.join(__dirname, "..", "dist", "renderer", "index.html");
  if (!fs.existsSync(distIndex)) { console.error("FATAL: dist not found."); app.exit(1); return; }

  const win = new BrowserWindow({
    width: 820, height: 580,
    backgroundColor: "#0a0a0e", show: true, center: true,
    frame: false, titleBarStyle: "hidden",
    webPreferences: { preload: preloadPath, contextIsolation: true, nodeIntegration: false, sandbox: false },
  });

  win.webContents.on("console-message", () => {});

  console.log("[Proof] Loading wizard...");
  await win.loadFile(distIndex);

  // Step 1: Welcome
  await screenshot(win, "wizard-01-welcome", 3000);

  // Click Begin Assessment → auto-scans → lands on Profile
  await clickButton(win, "Begin Assessment");
  // Assessment auto-advances after mock returns. Wait for Profile.
  await screenshot(win, "wizard-02-after-assess", 4000);

  // Click Continue through remaining steps
  const stepNames = [
    "wizard-03-preservation",
    "wizard-04-plan",
    "wizard-05-personalization",
    "wizard-06-apply",
  ];

  for (const name of stepNames) {
    await clickButton(win, "Continue");
    await screenshot(win, name, 2000);
  }

  // Apply step has a special button
  await clickButton(win, "Apply");
  await screenshot(win, "wizard-07-execution", 2000);

  // The execution step may auto-complete
  await screenshot(win, "wizard-08-after-exec", 3000);

  // Try clicking through to report
  await clickButton(win, "Continue");
  await screenshot(win, "wizard-09-report", 2000);

  console.log("[Proof] All screenshots captured.");
  if (serviceProcess) serviceProcess.kill();
  app.exit(0);
});
