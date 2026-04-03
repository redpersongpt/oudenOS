// Tauri platform backend
// Canonical runtime for redcore OS desktop (since v0.2.0).
// Uses Tauri v2 APIs via window.__TAURI__ (withGlobalTauri: true).

import type { PlatformAPI, ServiceStatus, SaveResult, ExportResult } from "./platform";

declare global {
  interface Window {
    __TAURI__?: {
      core: {
        invoke: <T = unknown>(cmd: string, args?: Record<string, unknown>) => Promise<T>;
      };
      event: {
        listen: (event: string, handler: (event: { payload: unknown }) => void) => Promise<() => void>;
      };
      window: {
        getCurrentWindow: () => {
          minimize: () => Promise<void>;
          toggleMaximize: () => Promise<void>;
          close: () => Promise<void>;
        };
      };
    };
  }
}

function getTauri() {
  return window.__TAURI__;
}

export const tauriBackend: PlatformAPI = {
  service: {
    call: async <T = unknown>(method: string, params?: Record<string, unknown>): Promise<T> => {
      const tauri = getTauri();
      if (!tauri) throw new Error("Tauri runtime unavailable");
      return tauri.core.invoke<T>("service_call", {
        method,
        params: params ?? {},
      });
    },

    status: async (): Promise<ServiceStatus> => {
      const tauri = getTauri();
      if (!tauri) return { running: false, mode: "demo", isAdmin: false, platform: "unknown" };
      return tauri.core.invoke<ServiceStatus>("service_status");
    },
  },

  on: (channel: string, callback: (data: unknown) => void): (() => void) => {
    const tauri = getTauri();
    if (!tauri) return () => {};

    let unlisten: (() => void) | null = null;
    tauri.event
      .listen(channel, (event) => callback(event.payload))
      .then((fn) => { unlisten = fn; });

    return () => { unlisten?.(); };
  },

  window: {
    minimize: () => {
      getTauri()?.window.getCurrentWindow().minimize();
    },
    maximize: () => {
      getTauri()?.window.getCurrentWindow().toggleMaximize();
    },
    close: () => {
      getTauri()?.window.getCurrentWindow().close();
    },
  },

  shell: {
    openExternal: async (url: string): Promise<void> => {
      const tauri = getTauri();
      if (!tauri) return;
      await tauri.core.invoke("open_external", { url });
    },
  },

  log: {
    saveToDesktop: async (content: string): Promise<SaveResult> => {
      const tauri = getTauri();
      if (!tauri) return { ok: false, error: "Tauri runtime unavailable" };
      return tauri.core.invoke<SaveResult>("save_log", { content });
    },
  },

  wizard: {
    exportPackage: async (state: Record<string, unknown>): Promise<ExportResult> => {
      const tauri = getTauri();
      if (!tauri) return { ok: false, error: "Tauri runtime unavailable" };
      return tauri.core.invoke<ExportResult>("export_package", { state });
    },
  },
};
