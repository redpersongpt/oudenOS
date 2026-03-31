// ─── redcore · OS — Preload Script ───────────────────────────────────────────
// Exposes a strict, typed API to the renderer via contextBridge.
// The renderer NEVER has direct access to Node.js or Electron APIs.
//
// SECURITY: ALLOWED_METHODS and ALLOWED_CHANNELS MUST stay in sync with
// IpcMethods and IpcEvents in @redcore-os/shared-schema/ipc.

import { contextBridge, ipcRenderer } from "electron";

// ─── Allowed IPC methods (defense-in-depth allowlist) ────────────────────────
// Must match the keys of IpcMethods in @redcore-os/shared-schema/ipc.ts.

const ALLOWED_METHODS = new Set([
  // Assessment
  "assess.full",
  // Classification
  "classify.machine",
  // Playbook (primary transformation path)
  "playbook.resolve",
  // App bundle
  "appbundle.getRecommended",
  "appbundle.resolve",
  "appbundle.install",
  // Execution
  "execute.applyAction",
  // Personalization
  "personalize.options",
  "personalize.apply",
  "personalize.revert",
  // Rollback
  "rollback.list",
  "rollback.restore",
  "rollback.audit",
  // Journal (reboot/resume)
  "journal.state",
  "journal.resume",
  "journal.cancel",
  // Execution Ledger (DB-backed)
  "ledger.createPlan",
  "ledger.recordResult",
  "ledger.markStarted",
  "ledger.completePlan",
  "ledger.query",
  // Verification
  "verify.registryValue",
  // System
  "system.status",
  "system.reboot",
]);

// ─── Allowed IPC event channels (defense-in-depth) ─────────────────────────
// Must match the keys of IpcEvents in @redcore-os/shared-schema/ipc.ts.
// Only channels that Rust ACTUALLY emits belong here.

const ALLOWED_CHANNELS = new Set([
  "execute.progress",
  "service.error",
  "journal.progress",
  // "scan.progress",    // Add when Rust scan emission is wired
]);

// ─── Exposed API ─────────────────────────────────────────────────────────────

contextBridge.exposeInMainWorld("redcore", {
  service: {
    call: <T = unknown>(method: string, params?: Record<string, unknown>): Promise<T> => {
      if (!ALLOWED_METHODS.has(method)) {
        return Promise.reject(new Error(`Blocked IPC method: ${method}`));
      }
      return ipcRenderer.invoke("service:call", method, params ?? {}) as Promise<T>;
    },
    status: (): Promise<{ running: boolean; mode: string; isAdmin: boolean; platform: string }> => {
      return ipcRenderer.invoke("service:status");
    },
  },

  on: (channel: string, callback: (data: unknown) => void): (() => void) => {
    if (!ALLOWED_CHANNELS.has(channel)) {
      console.warn(`Blocked IPC channel: ${channel}`);
      return () => {};
    }
    const handler = (_event: Electron.IpcRendererEvent, data: unknown) => callback(data);
    ipcRenderer.on(channel, handler);
    return () => ipcRenderer.removeListener(channel, handler);
  },

  window: {
    minimize: () => ipcRenderer.send("window:minimize"),
    maximize: () => ipcRenderer.send("window:maximize"),
    close: () => ipcRenderer.send("window:close"),
  },

  shell: {
    openExternal: (url: string) => ipcRenderer.invoke("shell:openExternal", url),
  },

  wizard: {
    exportPackage: (state: Record<string, unknown>) => {
      return ipcRenderer.invoke("wizard:exportPackage", state);
    },
  },
});
