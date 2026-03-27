// ─── redcore · OS — Preload Script ───────────────────────────────────────────
// Exposes a strict, typed API to the renderer via contextBridge.
// The renderer NEVER has direct access to Node.js or Electron APIs.

import { contextBridge, ipcRenderer } from "electron";

// ─── Allowed IPC methods (defense-in-depth allowlist) ────────────────────────

const ALLOWED_METHODS = new Set([
  // System
  "system.status",
  "system.reboot",
  // Assessment & classification
  "assess.full",
  "classify.machine",
  // Playbook-native path (primary)
  "playbook.resolve",
  "appbundle.getRecommended",
  "appbundle.resolve",
  // Execution & rollback
  "execute.applyAction",
  "rollback.list",
  "rollback.restore",
  "rollback.audit",
  // Personalization
  "personalize.options",
  "personalize.apply",
  "personalize.revert",
  // Verification
  "verify.registryValue",
  // Journal (reboot/resume)
  "journal.state",
  "journal.resume",
  "journal.cancel",
]);

// ─── Allowed IPC event channels (defense-in-depth) ─────────────────────────

const ALLOWED_CHANNELS = new Set([
  "execute.progress",
  "service.error",
  "journal.progress",
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
    status: (): Promise<{ running: boolean; mode: string }> => {
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
});
