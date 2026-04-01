// Service helper
// Wraps all IPC calls with error handling and demo mode detection.
// If the Rust service is not running, returns null so callers can fallback.

import { platform } from "./platform";

export async function serviceCall<T = unknown>(
  method: string,
  params?: Record<string, unknown>
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const result = await platform().service.call<unknown>(method, params ?? {});

    // Check for structured error from main process
    const r = result as Record<string, unknown>;
    if (r?.__serviceUnavailable || r?.__serviceError) {
      return { ok: false, error: (r.error as string) || "Service unavailable" };
    }

    return { ok: true, data: result as T };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function isServiceRunning(): Promise<boolean> {
  try {
    const status = await platform().service.status();
    return status.running;
  } catch {
    return false;
  }
}
