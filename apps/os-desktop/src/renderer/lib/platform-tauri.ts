// Tauri platform backend
// Replaces the Electron preload bridge with Tauri invoke() calls.
// Import this and call setPlatform(tauriBackend) at app startup
// when running inside a Tauri shell.

import type { PlatformAPI, ServiceStatus, SaveResult, ExportResult } from "./platform";

// Tauri v2 exposes invoke/listen on window.__TAURI__
// With withGlobalTauri: true in tauri.conf.json, these are available globally.
declare global {
  interface Window {
    __TAURI__?: {
      core: {
        invoke: <T = unknown>(cmd: string, args?: Record<string, unknown>) => Promise<T>;
      };
      event: {
        listen: (event: string, handler: (event: { payload: unknown }) => void) => Promise<() => void>;
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
      getTauri()?.core.invoke("plugin:window|minimize", { label: "main" });
    },
    maximize: () => {
      getTauri()?.core.invoke("plugin:window|toggle_maximize", { label: "main" });
    },
    close: () => {
      getTauri()?.core.invoke("plugin:window|close", { label: "main" });
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
    exportPackage: async (_state: Record<string, unknown>): Promise<ExportResult> => {
      // STUB: APBX bundle creation not yet ported to Tauri Rust backend.
      // This will be implemented in Phase D when file I/O and dialog
      // commands are added to the Tauri backend.
      console.warn("[platform-tauri] exportPackage not yet implemented");
      return { ok: false, error: "Package export not yet available in Tauri build" };
    },
  },
};
