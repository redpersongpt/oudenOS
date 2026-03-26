/**
 * Electron Runtime Smoke Test
 *
 * Proves the full vertical slice through the real Electron runtime:
 * 1. Electron main process starts
 * 2. Rust service spawns from main process
 * 3. Preload bridge loads in the renderer
 * 4. Renderer JS executes
 * 5. window.redcore.service.call() reaches the Rust service and returns real data
 *
 * Runs headless (BrowserWindow show:false) so no display is needed.
 * Outputs JSON results to stdout for CI capture.
 */

import { app, BrowserWindow, ipcMain, session } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const resultsDir = process.env.RESULTS_DIR
  ? path.resolve(process.env.RESULTS_DIR)
  : path.join(__dirname, "..", "..", "..", "test-results");
fs.mkdirSync(resultsDir, { recursive: true });

// ─── Service bridge (same as production main process) ───────────────────────

let serviceProcess = null;
let requestId = 0;
const pendingRequests = new Map();

function getServicePath() {
  const ext = process.platform === "win32" ? ".exe" : "";
  return path.join(__dirname, "..", "..", "service-core", "target", "debug", "redcore-service" + ext);
}

function startService() {
  const servicePath = getServicePath();
  console.log(`[Smoke] Starting service: ${servicePath}`);

  if (!fs.existsSync(servicePath)) {
    console.error(`[Smoke] FATAL: Service binary not found at ${servicePath}`);
    process.exit(1);
  }

  serviceProcess = spawn(servicePath, [], { stdio: ["pipe", "pipe", "pipe"] });

  const rl = createInterface({ input: serviceProcess.stdout });
  rl.on("line", (line) => {
    try {
      const msg = JSON.parse(line);
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
    } catch {
      // not JSON
    }
  });

  serviceProcess.stderr?.on("data", (chunk) => {
    // Service tracing logs — capture but don't flood
  });

  serviceProcess.on("exit", (code) => {
    console.log(`[Smoke] Service exited (code=${code})`);
  });
}

function callService(method, params) {
  return new Promise((resolve, reject) => {
    if (!serviceProcess?.stdin?.writable) {
      reject(new Error("Service not running"));
      return;
    }
    const id = ++requestId;
    const timer = setTimeout(() => {
      pendingRequests.delete(id);
      reject(new Error(`Timeout: ${method}`));
    }, 60000);
    pendingRequests.set(id, { resolve, reject, timer });
    serviceProcess.stdin.write(JSON.stringify({ id, method, params: params ?? {} }) + "\n");
  });
}

// ─── IPC handler (same as production) ───────────────────────────────────────

ipcMain.handle("service:call", async (_event, method, params) => {
  try {
    return await callService(method, params);
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
});

// ─── Test runner ────────────────────────────────────────────────────────────

function saveResult(name, data) {
  const filePath = path.join(resultsDir, `${name}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(`[Smoke] Saved ${name}.json (${fs.statSync(filePath).size} bytes)`);
}

app.disableHardwareAcceleration();

app.whenReady().then(async () => {
  console.log("[Smoke] Electron app ready");

  // Start the real Rust service
  startService();
  await new Promise((r) => setTimeout(r, 5000)); // wait for service init

  // Create a real BrowserWindow with preload
  const preloadPath = path.join(__dirname, "..", "src", "preload", "index.js");

  // Use pre-compiled preload if PRELOAD_COMPILED env is set, otherwise compile
  let preloadOut = process.env.PRELOAD_COMPILED
    ? path.resolve(process.env.PRELOAD_COMPILED)
    : path.join(resultsDir, "preload-compiled.js");

  if (!fs.existsSync(preloadOut)) {
    console.log("[Smoke] Preload not pre-compiled, compiling...");
    const ext = process.platform === "win32" ? ".cmd" : "";
    const candidates = [
      path.join(__dirname, "..", "node_modules", ".bin", "esbuild" + ext),
      path.join(__dirname, "..", "..", "..", "node_modules", ".bin", "esbuild" + ext),
    ];
    const esbuildBin = candidates.find((c) => fs.existsSync(c));
    const preloadSrc = path.join(__dirname, "..", "src", "preload", "index.ts");

    if (!esbuildBin) {
      console.error("[Smoke] FATAL: esbuild not found and no pre-compiled preload");
      app.exit(1);
      return;
    }
    const esbuild = spawn(esbuildBin, [
      preloadSrc, "--bundle", "--platform=node", "--target=node20",
      `--outfile=${preloadOut}`, "--external:electron",
    ], { shell: true, stdio: "inherit" });
    await new Promise((resolve) => esbuild.on("exit", resolve));
  }

  if (!fs.existsSync(preloadOut)) {
    console.error("[Smoke] FATAL: preload not available at", preloadOut);
    app.exit(1);
    return;
  }
  console.log(`[Smoke] Using preload: ${preloadOut}`);

  console.log("[Smoke] Creating BrowserWindow (headless)...");
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    show: false, // headless
    webPreferences: {
      preload: preloadOut,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // sandbox=false needed for preload in test
    },
  });

  // Load a minimal HTML page that runs the smoke test in the renderer
  const testHtml = `
<!DOCTYPE html>
<html>
<head><title>redcore-Tuning Smoke Test</title></head>
<body>
<h1>Smoke Test</h1>
<pre id="output">Running...</pre>
<script>
(async () => {
  const output = document.getElementById('output');
  const results = {};

  try {
    output.textContent = 'Step 1: Checking window.redcore...\\n';

    if (!window.redcore) {
      throw new Error('window.redcore is not defined — preload failed');
    }
    results.preloadLoaded = true;
    output.textContent += 'OK: window.redcore exists\\n';
    output.textContent += 'OK: platform = ' + window.redcore.platform + '\\n';

    // Step 2: Service status
    output.textContent += '\\nStep 2: system.getServiceStatus...\\n';
    const status = await window.redcore.service.call('system.getServiceStatus', {});
    results.serviceStatus = status;
    output.textContent += 'OK: version=' + status.version + ' uptime=' + status.uptime + '\\n';

    // Step 3: Real hardware scan
    output.textContent += '\\nStep 3: scan.hardware (REAL)...\\n';
    const scan = await window.redcore.service.call('scan.hardware', {});
    results.scan = scan;
    output.textContent += 'OK: CPU=' + scan.cpu.brand + '\\n';
    output.textContent += 'OK: GPU=' + (scan.gpus[0]?.name || 'none') + '\\n';
    output.textContent += 'OK: RAM=' + scan.memory.totalMb + ' MB\\n';
    output.textContent += 'OK: Windows=' + scan.windows.productName + ' build ' + scan.windows.build + '\\n';

    // Step 4: Generate plan
    output.textContent += '\\nStep 4: tuning.generatePlan (conservative)...\\n';
    const plan = await window.redcore.service.call('tuning.generatePlan', {
      deviceProfileId: scan.id,
      preset: 'conservative',
    });
    results.plan = plan;
    output.textContent += 'OK: ' + plan.actions.length + ' actions, risk=' + plan.estimatedRisk + '\\n';

    // Step 5: Apply one action
    output.textContent += '\\nStep 5: tuning.applyAction (privacy.disable-ceip)...\\n';
    const applyResult = await window.redcore.service.call('tuning.applyAction', {
      actionId: 'privacy.disable-ceip',
    });
    results.apply = applyResult;
    output.textContent += 'OK: status=' + applyResult.status + ' verified=' + applyResult.validationPassed + '\\n';

    // Step 6: List snapshots
    output.textContent += '\\nStep 6: rollback.listSnapshots...\\n';
    const snapshots = await window.redcore.service.call('rollback.listSnapshots', {});
    results.snapshotCount = Array.isArray(snapshots) ? snapshots.length : 0;
    output.textContent += 'OK: ' + results.snapshotCount + ' snapshots\\n';

    // Step 7: Rollback
    if (Array.isArray(snapshots) && snapshots.length > 0) {
      output.textContent += '\\nStep 7: rollback.restore...\\n';
      const restore = await window.redcore.service.call('rollback.restore', {
        snapshotId: snapshots[0].id,
      });
      results.restore = restore;
      output.textContent += 'OK: status=' + restore.status + '\\n';
    }

    results.allPassed = true;
    output.textContent += '\\n=== ALL TESTS PASSED ===\\n';
  } catch (err) {
    results.error = err.message || String(err);
    output.textContent += '\\nFAILED: ' + results.error + '\\n';
  }

  // Signal completion via a global variable (main process polls this)
  window.__SMOKE_RESULTS__ = results;
})();
</script>
</body>
</html>`;

  const testHtmlPath = path.join(resultsDir, "smoke-test.html");
  fs.writeFileSync(testHtmlPath, testHtml);

  // Poll for results from the renderer (avoids title length limits)
  async function checkResults() {
    try {
      const results = await win.webContents.executeJavaScript("window.__SMOKE_RESULTS__");
      if (!results) return false;

      console.log("\n[Smoke] === RESULTS ===");

      if (results.preloadLoaded) console.log("[Smoke] PRELOAD: loaded");
      if (results.serviceStatus) {
        console.log(`[Smoke] SERVICE: v${results.serviceStatus.version} uptime=${results.serviceStatus.uptime}s`);
        saveResult("service-status", results.serviceStatus);
      }
      if (results.scan) {
        console.log(`[Smoke] SCAN: CPU=${results.scan.cpu?.brand} GPU=${results.scan.gpus?.[0]?.name} RAM=${results.scan.memory?.totalMb}MB`);
        console.log(`[Smoke] SCAN: Win=${results.scan.windows?.productName} build=${results.scan.windows?.build}`);
        saveResult("electron-scan", results.scan);
      }
      if (results.plan) {
        console.log(`[Smoke] PLAN: ${results.plan.actions?.length} actions, risk=${results.plan.estimatedRisk}`);
        saveResult("electron-plan", results.plan);
      }
      if (results.apply) {
        console.log(`[Smoke] APPLY: status=${results.apply.status} verified=${results.apply.validationPassed}`);
        saveResult("electron-apply", results.apply);
      }
      if (results.restore) {
        console.log(`[Smoke] RESTORE: status=${results.restore.status}`);
        saveResult("electron-restore", results.restore);
      }
      console.log(`[Smoke] SNAPSHOTS: ${results.snapshotCount}`);

      if (results.allPassed) {
        console.log("\n[Smoke] === ALL TESTS PASSED ===");
      } else {
        console.log(`\n[Smoke] FAILED: ${results.error}`);
      }

      saveResult("smoke-summary", results);

      // Take screenshot
      try {
        const image = await win.webContents.capturePage();
        const screenshotPath = path.join(resultsDir, "screenshot.png");
        fs.writeFileSync(screenshotPath, image.toPNG());
        console.log(`[Smoke] Screenshot: ${screenshotPath} (${fs.statSync(screenshotPath).size} bytes)`);
      } catch (e) {
        console.log(`[Smoke] Screenshot failed: ${e.message}`);
      }

      serviceProcess?.kill();
      setTimeout(() => app.exit(results.allPassed ? 0 : 1), 1000);
      return true;
    } catch {
      return false;
    }
  }

  // Poll every 2 seconds for up to 110 seconds
  const pollInterval = setInterval(async () => {
    if (await checkResults()) {
      clearInterval(pollInterval);
    }
  }, 2000);

  // Also handle renderer console logs
  win.webContents.on("console-message", (_event, _level, message) => {
    console.log(`[Renderer] ${message}`);
  });

  // NOTE: Real product UI (dist/index.html) requires Vite-built assets with
  // proper base paths. In CI, the Vite build produces output but asset paths
  // expect a file:// or localhost context that may not resolve correctly in
  // a headless test. Product UI screenshots should be captured on a real
  // developer machine or in a headed test environment.

  // Load the test page (IPC proof)
  console.log("[Smoke] Loading test page...");
  await win.loadFile(testHtmlPath);
  console.log("[Smoke] Test page loaded, waiting for results...");

  // Safety timeout
  setTimeout(() => {
    console.error("[Smoke] TIMEOUT: test did not complete in 90s");
    serviceProcess?.kill();
    app.exit(1);
  }, 90000);
});
