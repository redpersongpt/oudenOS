
import { contextBridge, ipcRenderer } from "electron";

const ALLOWED_METHODS = new Set([
  "assess.full",
  "classify.machine",
  "playbook.resolve",
  "appbundle.getRecommended",
  "appbundle.resolve",
  "appbundle.install",
  "execute.applyAction",
  "personalize.options",
  "personalize.apply",
  "personalize.revert",
  "rollback.list",
  "rollback.restore",
  "rollback.audit",
  "journal.state",
  "journal.resume",
  "journal.cancel",
  "ledger.createPlan",
  "ledger.recordResult",
  "ledger.markStarted",
  "ledger.completePlan",
  "ledger.query",
  "verify.registryValue",
  "system.status",
  "system.reboot",
]);

const ALLOWED_CHANNELS = new Set([
  "execute.progress",
  "service.error",
  "journal.progress",
]);

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

  log: {
    saveToDesktop: (content: string): Promise<{ ok: boolean; path?: string; error?: string }> =>
      ipcRenderer.invoke("log:saveToDesktop", content),
  },

  wizard: {
    exportPackage: (state: Record<string, unknown>) => {
      return ipcRenderer.invoke("wizard:exportPackage", state);
    },
  },
});
