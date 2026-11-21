// Service helper
// Wraps all IPC calls with error handling and demo mode detection.
// Failures carry the JSON-RPC `code` when the service answered with an error
// object (see lib/service-errors.ts → RPC_CODES); transport failures have none.

import { platform } from "./platform";

export type ServiceCallResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: number | null };

export async function serviceCall<T = unknown>(
  method: string,
  params?: Record<string, unknown>
): Promise<ServiceCallResult<T>> {
  try {
    const result = await platform().service.call<unknown>(method, params ?? {});

    // Structured error from the Tauri shell
    const r = result as Record<string, unknown>;
    if (r?.__serviceUnavailable || r?.__serviceError) {
      return {
        ok: false,
        error: (r.error as string) || "Service unavailable",
        code: typeof r.code === "number" ? r.code : null,
      };
    }

    return { ok: true, data: result as T };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error", code: null };
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
