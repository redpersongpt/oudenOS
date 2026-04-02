// Platform abstraction layer
// Centralizes all desktop shell interactions behind a transport-neutral
// interface. The renderer never calls Tauri invoke directly — it calls
// these functions instead.
//
// Canonical runtime: Tauri (since v0.2.0)
// The Electron backend was removed during the Tauri cutover.

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ServiceStatus {
  running: boolean;
  mode: string;
  isAdmin: boolean;
  platform: string;
}

export interface SaveResult {
  ok: boolean;
  path?: string;
  error?: string;
}

export interface ExportResult {
  ok: boolean;
  path?: string;
  sha256?: string;
  sizeBytes?: number;
  error?: string;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Platform API — the single interface components depend on
// ---------------------------------------------------------------------------

export interface PlatformAPI {
  service: {
    call: <T = unknown>(method: string, params?: Record<string, unknown>) => Promise<T>;
    status: () => Promise<ServiceStatus>;
  };
  on: (channel: string, callback: (data: unknown) => void) => () => void;
  window: {
    minimize: () => void;
    maximize: () => void;
    close: () => void;
  };
  shell: {
    openExternal: (url: string) => Promise<void>;
  };
  log: {
    saveToDesktop: (content: string) => Promise<SaveResult>;
  };
  wizard: {
    exportPackage: (state: Record<string, unknown>) => Promise<ExportResult>;
  };
}

// ---------------------------------------------------------------------------
// Platform singleton — Tauri backend is set in main.tsx at startup
// ---------------------------------------------------------------------------

let _platform: PlatformAPI | null = null;

export function setPlatform(p: PlatformAPI): void {
  _platform = p;
}

export function platform(): PlatformAPI {
  if (!_platform) {
    throw new Error("Platform not initialized — setPlatform() must be called before first use");
  }
  return _platform;
}
