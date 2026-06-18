// Tauri platform backend
// Canonical runtime for oudenOS desktop (since v0.2.0).
// Uses Tauri v2 APIs via window.__TAURI__ (withGlobalTauri: true).

import type { PlatformAPI, ServiceStatus, SaveResult, ExportResult, UpdateInfo } from "./platform";

// Holds the Update handle between check() and downloadAndInstall().
type DownloadEvent = { event: string; data?: { contentLength?: number; chunkLength?: number } };
type PendingUpdate = { version: string; body?: string | null; downloadAndInstall: (cb: (e: DownloadEvent) => void) => Promise<void> };
let _pendingUpdate: PendingUpdate | null = null;

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

  updater: {
    check: async (): Promise<UpdateInfo> => {
      const currentVersion = `v${__APP_VERSION__}`;
      // No Tauri runtime (browser demo) → nothing to check.
      if (!getTauri()) return { available: false, currentVersion, error: "no-runtime" };
      try {
        const { check } = await import("@tauri-apps/plugin-updater");
        const update = await check();
        if (update) {
          _pendingUpdate = update as unknown as PendingUpdate;
          return { available: true, currentVersion, version: update.version, notes: update.body ?? undefined };
        }
        return { available: false, currentVersion };
      } catch (e) {
        // On the macOS demo there is no update feed for this target — degrade
        // quietly to "up to date" rather than surfacing a scary error.
        return { available: false, currentVersion, error: String(e) };
      }
    },
    downloadAndInstall: async (onProgress?: (percent: number) => void): Promise<void> => {
      if (!_pendingUpdate) {
        const { check } = await import("@tauri-apps/plugin-updater");
        _pendingUpdate = (await check()) as unknown as PendingUpdate | null;
      }
      if (!_pendingUpdate) throw new Error("No update available");
      let total = 0;
      let received = 0;
      await _pendingUpdate.downloadAndInstall((e: DownloadEvent) => {
        if (e.event === "Started") total = e.data?.contentLength ?? 0;
        else if (e.event === "Progress") {
          received += e.data?.chunkLength ?? 0;
          if (total > 0) onProgress?.(Math.min(100, Math.round((received / total) * 100)));
        } else if (e.event === "Finished") onProgress?.(100);
      });
      const { relaunch } = await import("@tauri-apps/plugin-process");
      await relaunch();
    },
  },
};
