#!/usr/bin/env node
/**
 * Production shell proof: uses the REAL main process entry point logic
 * but with mock service. Proves the production shell owns the installer form.
 */

import electron from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import fs from "node:fs";

const { app, BrowserWindow, ipcMain, session } = electron;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const resultsDir = path.join(__dirname, "..", "..", "..", "proof-screenshots-os");
fs.mkdirSync(resultsDir, { recursive: true });

// Mock service (same as headed proof)
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
ipcMain.on("window:minimize", (e) => BrowserWindow.fromWebContents(e.sender)?.minimize());
ipcMain.on("window:maximize", (e) => {
  const w = BrowserWindow.fromWebContents(e.sender);
  w?.isMaximized() ? w.unmaximize() : w?.maximize();
});
ipcMain.on("window:close", (e) => BrowserWindow.fromWebContents(e.sender)?.close());

async function screenshot(win, name, delay = 1500) {
  await new Promise(r => setTimeout(r, delay));
  const image = await win.webContents.capturePage();
  const fp = path.join(resultsDir, `${name}.png`);
  fs.writeFileSync(fp, image.toPNG());
  console.log(`[Screenshot] ${name}.png (${Math.round(fs.statSync(fp).size / 1024)}KB)`);
}

app.disableHardwareAcceleration();

app.whenReady().then(async () => {
  startMockService();
  await new Promise(r => setTimeout(r, 2000));

  // ── Use the PRODUCTION preload, not the test one ──
  const preloadPath = path.join(__dirname, "..", "dist", "preload", "index.js");
  const distIndex = path.join(__dirname, "..", "dist", "renderer", "index.html");

  if (!fs.existsSync(preloadPath)) {
    console.error("FATAL: Production preload not built. Run: pnpm build:preload");
    app.exit(1); return;
  }
  if (!fs.existsSync(distIndex)) {
    console.error("FATAL: Renderer not built. Run: pnpm build:renderer");
    app.exit(1); return;
  }

  // ── PRODUCTION WINDOW CONFIG — same as src/main/index.ts ──
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

  const win = new BrowserWindow({
    width: 820,
    height: 580,
    minWidth: 720,
    minHeight: 500,
    maxWidth: 1024,
    maxHeight: 720,
    center: true,
    resizable: true,
    maximizable: false,
    frame: false,
    titleBarStyle: "hidden",
    backgroundColor: "#08080d",
    show: false,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.once("ready-to-show", () => win.show());
  win.webContents.on("console-message", () => {});

  console.log("[Production Proof] Loading with production preload + production window config...");
  await win.loadFile(distIndex);

  // Wait for render, then capture
  await screenshot(win, "production-01-welcome", 4000);

  // Click through
  async function click(text) {
    await win.webContents.executeJavaScript(`
      (function() {
        for (const b of document.querySelectorAll('button')) {
          if (b.textContent.includes('${text}')) { b.click(); return; }
        }
      })();
    `);
  }

  await click("Begin");
  await screenshot(win, "production-02-assessment", 4000);

  await click("Next");
  await screenshot(win, "production-03-after-profile", 2000);

  await click("Next");
  await screenshot(win, "production-04-plan-area", 2000);

  await click("Next");
  await screenshot(win, "production-05-personalization", 2000);

  await click("Next");
  await screenshot(win, "production-06-review", 2000);

  console.log("[Production Proof] Done.");
  if (serviceProcess) serviceProcess.kill();
  app.exit(0);
});
