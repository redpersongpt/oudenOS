// ─── IPC Error & Response Types ───────────────────────────────────────────────
// Structured error handling across the IPC boundary.
// Main process and renderer use these to communicate failures without throwing.

export interface IpcError {
  code: string;                  // Machine-readable error code, e.g. "SERVICE_UNAVAILABLE"
  message: string;               // Human-readable message for logging
  detail?: string;               // Additional context
}

// Generic IPC response wrapper — for callers that want explicit ok/err branching.
export type IpcResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: IpcError };

// ─── Sentinel types returned by Electron main process ────────────────────────
// When the Rust service is not running, main returns one of these objects.
// The renderer's serviceCall wrapper checks for these markers.

export interface ServiceUnavailableError {
  __serviceUnavailable: true;
  error: string;
}

export interface ServiceRpcError {
  __serviceError: true;
  error: string;
}

export type ServiceErrorResponse = ServiceUnavailableError | ServiceRpcError;

export function isServiceError(v: unknown): v is ServiceErrorResponse {
  if (typeof v !== "object" || v === null) return false;
  return "__serviceUnavailable" in v || "__serviceError" in v;
}
