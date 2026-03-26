// ─── redcore · OS — Preload Script ───────────────────────────────────────────
// Exposes a strict, typed API to the renderer via contextBridge.
// The renderer NEVER has direct access to Node.js or Electron APIs.

import { contextBridge, ipcRenderer } from "electron";

// ─── Allowed IPC methods (defense-in-depth allowlist) ────────────────────────

const ALLOWED_METHODS = new Set([
  "system.status",
  "assess.full",
  "classify.machine",
  "transform.plan",
  "transform.getActions",
  "execute.applyAction",
  "rollback.list",
  "rollback.restore",
  "rollback.audit",
  "personalize.options",
  "personalize.apply",
  "personalize.revert",
  "pipeline.assessClassifyPlan",
  "verify.registryValue",
  // Playbook-native methods
  "playbook.resolve",
  "appbundle.getRecommended",
  "appbundle.resolve",
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
  },

  on: (channel: string, callback: (data: unknown) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: unknown) => callback(data);
    ipcRenderer.on(channel, handler);
    return () => ipcRenderer.removeListener(channel, handler);
  },

  window: {
    minimize: () => ipcRenderer.send("window:minimize"),
    maximize: () => ipcRenderer.send("window:maximize"),
    close: () => ipcRenderer.send("window:close"),
  },
});
