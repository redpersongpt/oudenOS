

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

interface ElectronBridge {
  service: {
    call: <T = unknown>(method: string, params?: Record<string, unknown>) => Promise<T>;
    status: () => Promise<ServiceStatus>;
  };
  on: (channel: string, callback: (data: unknown) => void) => () => void;
  window: { minimize: () => void; maximize: () => void; close: () => void };
  shell: { openExternal: (url: string) => Promise<void> };
  log: { saveToDesktop: (content: string) => Promise<SaveResult> };
  wizard: { exportPackage: (state: Record<string, unknown>) => Promise<ExportResult> };
}

function getElectronBridge(): ElectronBridge | null {
  return (window as unknown as { redcore?: ElectronBridge }).redcore ?? null;
}

const electronBackend: PlatformAPI = {
  service: {
    call: async (method, params) => {
      const bridge = getElectronBridge();
      if (!bridge) throw new Error("Electron bridge unavailable");
      return bridge.service.call(method, params);
    },
    status: async () => {
      const bridge = getElectronBridge();
      if (!bridge) return { running: false, mode: "demo", isAdmin: false, platform: "unknown" };
      return bridge.service.status();
    },
  },
  on: (channel, callback) => {
    const bridge = getElectronBridge();
    if (!bridge) return () => {};
    return bridge.on(channel, callback);
  },
  window: {
    minimize: () => getElectronBridge()?.window.minimize(),
    maximize: () => getElectronBridge()?.window.maximize(),
    close: () => getElectronBridge()?.window.close(),
  },
  shell: {
    openExternal: async (url) => {
      const bridge = getElectronBridge();
      if (bridge) await bridge.shell.openExternal(url);
    },
  },
  log: {
    saveToDesktop: async (content) => {
      const bridge = getElectronBridge();
      if (!bridge) return { ok: false, error: "Platform API unavailable" };
      return bridge.log.saveToDesktop(content);
    },
  },
  wizard: {
    exportPackage: async (state) => {
      const bridge = getElectronBridge();
      if (!bridge) return { ok: false, error: "Platform API unavailable" };
      return bridge.wizard.exportPackage(state);
    },
  },
};

let _platform: PlatformAPI = electronBackend;

export function setPlatform(p: PlatformAPI): void {
  _platform = p;
}

export function platform(): PlatformAPI {
  return _platform;
}
