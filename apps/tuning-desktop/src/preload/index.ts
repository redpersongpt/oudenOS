// ─── Preload Script ─────────────────────────────────────────────────────────
// Exposes a safe, typed API to the renderer via contextBridge.
// The renderer NEVER has direct access to Node.js or Electron APIs.
//
// SECURITY: All IPC channels are validated against strict allowlists derived
// from the IPC contract. Arbitrary channel access is blocked.

import { contextBridge, ipcRenderer } from "electron";

// ─── IPC Allowlists ─────────────────────────────────────────────────────────
// These MUST match the keys of IpcMethods and IpcEvents in shared-schema/ipc.ts.
// If a new IPC method or event is added, it must be added here too.

const ALLOWED_METHODS: ReadonlySet<string> = new Set([
  // Scan
  "scan.hardware",
  "scan.quick",
  "scan.cpuPower",
  "scan.scheduler",
  "scan.serviceStates",
  "scan.filesystem",
  "scan.memMgmt",
  // Tuning
  "tuning.generatePlan",
  "tuning.getActions",
  "tuning.previewAction",
  "tuning.applyPlan",
  "tuning.applyAction",
  "tuning.skipAction",
  // Benchmark
  "benchmark.run",
  "benchmark.list",
  "benchmark.compare",
  "benchmark.analyzeBottlenecks",
  // Rollback
  "rollback.listSnapshots",
  "rollback.createSnapshot",
  "rollback.restore",
  "rollback.getDiff",
  "rollback.getAuditLog",
  "rollback.restoreActions",
  // Journal
  "journal.getState",
  "journal.resume",
  "journal.cancel",
  // License (service-side)
  "license.getState",
  "license.activate",
  "license.deactivate",
  "license.refresh",
  // App hub
  "apphub.getCatalog",
  "apphub.install",
  "apphub.checkUpdates",
  // System
  "system.requestReboot",
  "system.getServiceStatus",
  // Machine Intelligence
  "intelligence.classify",
  "intelligence.getProfile",
  "intelligence.getRecommendations",
]);

// Only events that are ACTUALLY emitted. Add here when Rust emission is wired.
const ALLOWED_EVENTS: ReadonlySet<string> = new Set([
  "service:license.changed",
  "service:service.error",
]);

// ─── API Definition ─────────────────────────────────────────────────────────

export interface RedcoreAPI {
  // Window controls
  window: {
    minimize: () => void;
    maximize: () => void;
    close: () => void;
  };

  // Service RPC — method must be in ALLOWED_METHODS
  service: {
    call: <T = unknown>(method: string, params?: unknown) => Promise<T>;
  };

  // Open URL in default system browser (for Stripe checkout, billing portal)
  shell: {
    openExternal: (url: string) => void;
  };

  // License (resolved in main process — never calls cloud from renderer)
  license: {
    get: () => Promise<unknown>;
    refresh: () => Promise<unknown>;
  };

  // Event subscriptions — channel must be in ALLOWED_EVENTS
  on: (channel: string, callback: (...args: unknown[]) => void) => () => void;

  // Platform info
  platform: NodeJS.Platform;
}

const api: RedcoreAPI = {
  window: {
    minimize: () => ipcRenderer.send("window:minimize"),
    maximize: () => ipcRenderer.send("window:maximize"),
    close: () => ipcRenderer.send("window:close"),
  },

  service: {
    call: async <T = unknown>(method: string, params?: unknown): Promise<T> => {
      if (!ALLOWED_METHODS.has(method)) {
        throw new Error(`Blocked IPC call to unknown method: ${method}`);
      }
      return ipcRenderer.invoke("service:call", method, params) as Promise<T>;
    },
  },

  shell: {
    openExternal: (url: string) => {
      // Route through main process for defense-in-depth URL validation
      void ipcRenderer.invoke("shell:openExternal", url);
    },
  },

  license: {
    get: () => ipcRenderer.invoke("license:get"),
    refresh: () => ipcRenderer.invoke("license:refresh"),
  },

  on: (channel: string, callback: (...args: unknown[]) => void) => {
    if (!ALLOWED_EVENTS.has(channel)) {
      console.warn(`Blocked subscription to unknown event channel: ${channel}`);
      return () => {}; // no-op unsubscribe
    }
    const handler = (_event: Electron.IpcRendererEvent, ...args: unknown[]) => callback(...args);
    ipcRenderer.on(channel, handler);
    return () => ipcRenderer.removeListener(channel, handler);
  },

  platform: process.platform,
};

contextBridge.exposeInMainWorld("redcore", api);
