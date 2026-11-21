// Runtime status normalisation — the ONE place that interprets what the Tauri
// shell reports about the platform and the privileged service.
//
// Tauri returns Rust's `std::env::consts::OS` ("windows", "macos", "linux");
// the renderer historically compared against Electron's "win32". Everything
// in the UI must go through `normalizeStatus` so that mismatch cannot return.

export type PlatformId = "win32" | "darwin" | "linux" | "unknown";
export type ServiceMode = "live" | "simulated" | "demo";

export interface RuntimeStatus {
  running: boolean;
  mode: ServiceMode;
  /** null = unknown (service not running yet, or the elevation query failed) */
  isAdmin: boolean | null;
  platform: PlatformId;
  startError: string | null;
  restarted: boolean;
}

export function normalizePlatform(raw: unknown): PlatformId {
  const value = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (value === "windows" || value === "win32" || value === "win64") return "win32";
  if (value === "macos" || value === "darwin" || value === "mac" || value === "osx") return "darwin";
  if (value === "linux") return "linux";
  return "unknown";
}

function normalizeMode(raw: unknown): ServiceMode {
  return raw === "live" || raw === "simulated" ? raw : "demo";
}

export function normalizeStatus(raw: unknown): RuntimeStatus {
  const r = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  return {
    running: r.running === true,
    mode: normalizeMode(r.mode),
    isAdmin: typeof r.isAdmin === "boolean" ? r.isAdmin : null,
    platform: normalizePlatform(r.platform),
    startError: typeof r.startError === "string" && r.startError.length > 0 ? r.startError : null,
    restarted: r.restarted === true,
  };
}

export const UNAVAILABLE_STATUS: RuntimeStatus = {
  running: false,
  mode: "demo",
  isAdmin: null,
  platform: "unknown",
  startError: null,
  restarted: false,
};

/** Real Windows with a running privileged service: changes are applied for real. */
export function isLiveWindows(status: RuntimeStatus): boolean {
  return status.platform === "win32" && status.mode === "live" && status.running;
}

/**
 * Sample/demo data is only ever allowed when we are NOT on Windows (macOS
 * preview, plain browser). On Windows a missing or failing service is an
 * error the user must see — never a silent switch to a fake profile.
 */
export function demoProfileAllowed(status: RuntimeStatus): boolean {
  return status.platform !== "win32";
}
