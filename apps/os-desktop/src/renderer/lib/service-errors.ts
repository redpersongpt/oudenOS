// Turns service results into honest outcomes + human-readable failure text.
//
// Contract (services/os-service/src/executor.rs `compute_status` /
// `status_after_rollback` / `record_outcome`):
//   status  success          → applied
//           partial          → applied, some sub-steps skipped, ZERO failures
//           skipped          → nothing to do (each results[] entry has a reason)
//           failed           → failed before anything changed (no rollback ran)
//           rolled_back      → a step failed; the applied steps were restored
//           rollback_failed  → a step failed and restoring FAILED → stop everything
//   top-level `error` (first failure), `nothingChanged`, `rollback`,
//   `snapshotId` (null when everything was skipped), `results[]`
//   (`status`, `reason`, `error`, `note`, target fields).
// RPC error codes (ipc.rs): -23 not applicable here, -3 invalid target,
//   -403 not elevated, -500 handler panicked.

import { en } from "../i18n/en";

export type OutcomeStatus = "applied" | "skipped" | "failed";

export const SKIP_REASONS = [
  "already_configured",
  "access_denied_protected",
  "not_found",
  "protected_target",
  "protected_service",
  "protected_package",
  "tamper_protection",
  "hardware_not_applicable",
  "preflight_failed",
] as const;
export type SkipReason = (typeof SKIP_REASONS)[number];

export const RPC_CODES = {
  invalidTarget: -3,
  notApplicable: -23,
  notElevated: -403,
  internal: -500,
} as const;

export interface StepNote {
  type: string;
  target: string | null;
  reason: string | null;
  note: string | null;
}

export interface ActionOutcome {
  status: OutcomeStatus;
  /** true when the system may be half-changed (rollback_failed) or nothing can work (not elevated): stop applying. */
  blocking: boolean;
  rpcStatus: string;
  errorMessage: string | null;
  /** sub-steps the service skipped (partial / skipped), with their reason codes */
  skippedSteps: StepNote[];
  rolledBack: boolean;
  nothingChanged: boolean;
  needsElevation: boolean;
  notApplicable: boolean;
  snapshotId: string | null;
}

type Dict = Record<string, unknown>;

function isDict(value: unknown): value is Dict {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

const TARGET_KEYS = [
  "package", "taskName", "service", "serviceName", "name", "valueName", "element", "settingPath", "path", "key", "target",
] as const;

function targetOf(entry: Dict): string | null {
  for (const k of TARGET_KEYS) {
    const v = str(entry[k]);
    if (v) return v;
  }
  return null;
}

/** Label key for a results[].reason code (falls back to a generic label). */
export function reasonLabelKey(reason: string | null | undefined): string {
  return reason && (SKIP_REASONS as readonly string[]).includes(reason) ? `reason.${reason}` : "reason.unknown";
}

/** English label (logs / exported log are English so bug reports are readable). */
export function reasonLabelEn(reason: string | null | undefined): string {
  return en[reasonLabelKey(reason)] ?? reason ?? "skipped";
}

export function skippedSteps(data: unknown): StepNote[] {
  if (!isDict(data) || !Array.isArray(data.results)) return [];
  return data.results
    .filter((e): e is Dict => isDict(e) && e.status === "skipped")
    .map((e) => ({ type: str(e.type) ?? "step", target: targetOf(e), reason: str(e.reason), note: str(e.note) }));
}

/** "appx_remove [Microsoft.BingNews]: Access is denied" for each failed nested operation. */
export function describeFailedOperations(data: unknown, max = 4): string | null {
  if (!isDict(data) || !Array.isArray(data.results)) return null;
  const parts: string[] = [];
  for (const entry of data.results) {
    if (!isDict(entry) || entry.status !== "failed") continue;
    if (entry.type === "auto_rollback") continue; // reported via rolled_back / rollback_failed
    const type = str(entry.type) ?? "operation";
    const target = targetOf(entry);
    const reason = str(entry.reason);
    const error = str(entry.error) ?? str(entry.message) ?? (reason ? reasonLabelEn(reason) : "failed");
    parts.push(`${type}${target ? ` [${target}]` : ""}: ${error}`);
  }
  if (parts.length === 0) return null;
  const shown = parts.slice(0, max);
  if (parts.length > max) shown.push(`+${parts.length - max} more`);
  return shown.join("; ");
}

/** "registry [X]: Protected by Windows (skipped)" — English, for the activity log. */
export function describeSkippedStepsEn(steps: StepNote[], max = 6): string | null {
  if (steps.length === 0) return null;
  const parts = steps.slice(0, max).map((s) => `${s.type}${s.target ? ` [${s.target}]` : ""}: ${reasonLabelEn(s.reason)}`);
  if (steps.length > max) parts.push(`+${steps.length - max} more`);
  return parts.join("; ");
}

function base(rpcStatus: string): ActionOutcome {
  return {
    status: "failed",
    blocking: false,
    rpcStatus,
    errorMessage: null,
    skippedSteps: [],
    rolledBack: false,
    nothingChanged: false,
    needsElevation: false,
    notApplicable: false,
    snapshotId: null,
  };
}

/** Classify a successful `execute.applyAction` response body. */
export function classifyActionResult(data: unknown): ActionOutcome {
  if (!isDict(data)) {
    return { ...base("invalid"), errorMessage: "The service returned no result." };
  }
  const rpcStatus = str(data.status) ?? "failed";
  const failed = typeof data.failed === "number" ? data.failed : 0;
  const out: ActionOutcome = {
    ...base(rpcStatus),
    skippedSteps: skippedSteps(data),
    nothingChanged: data.nothingChanged === true,
    snapshotId: str(data.snapshotId),
  };

  if ((rpcStatus === "success" || rpcStatus === "partial") && failed === 0) {
    return { ...out, status: "applied" };
  }
  if (rpcStatus === "skipped" && failed === 0) {
    const first = out.skippedSteps[0];
    return {
      ...out,
      status: "skipped",
      notApplicable: first?.reason === "hardware_not_applicable",
      errorMessage: describeSkippedStepsEn(out.skippedSteps),
    };
  }

  const nested = describeFailedOperations(data);
  const top = str(data.error);
  // The nested description carries the target ("registry [X]: …"); the
  // top-level `error` is the same first failure without it.
  const detail = nested ?? top;
  if (rpcStatus === "rollback_failed") {
    return { ...out, blocking: true, errorMessage: `Rollback FAILED — system may be partially changed${detail ? `: ${detail}` : ""}` };
  }
  if (rpcStatus === "rolled_back") {
    return { ...out, rolledBack: true, errorMessage: `Rolled back after failure${detail ? `: ${detail}` : ""}` };
  }
  return {
    ...out,
    errorMessage:
      (out.nothingChanged ? `Failed before anything changed${detail ? `: ${detail}` : ""}` : detail) ??
      `Action returned status "${rpcStatus}" with ${failed} failed operation(s)`,
  };
}

/** Classify the whole call, including JSON-RPC error codes. */
export function classifyActionCall(
  call: { ok: true; data: unknown } | { ok: false; error: string; code?: number | null },
): ActionOutcome {
  if (call.ok) return classifyActionResult(call.data);
  const code = call.code ?? null;
  if (code === RPC_CODES.notApplicable) {
    return { ...base("not_applicable"), status: "skipped", notApplicable: true, nothingChanged: true, errorMessage: call.error };
  }
  if (code === RPC_CODES.notElevated) {
    return { ...base("not_elevated"), blocking: true, needsElevation: true, nothingChanged: true, errorMessage: call.error };
  }
  if (code === RPC_CODES.invalidTarget) {
    return { ...base("invalid_target"), nothingChanged: true, errorMessage: `Invalid target: ${call.error}` };
  }
  if (code === RPC_CODES.internal) {
    return { ...base("internal_error"), errorMessage: `Internal service error: ${call.error}` };
  }
  return { ...base("error"), errorMessage: call.error || "Service call failed" };
}

export interface PersonalizationOutcome {
  applied: boolean;
  errorMessage: string | null;
  snapshotId: string | null;
  needsElevation: boolean;
  /** per-value items Windows refused (e.g. UCPD), flattened from results[].items */
  skippedItems: StepNote[];
  /** the Widgets taskbar button / its policy was protected (UCPD): change it in Settings instead */
  widgetsProtected: boolean;
}

/**
 * Classify a `personalize.apply` result (personalizer.rs). Each results[]
 * entry is a feature with `status` success | partial | skipped | failed and an
 * optional `items` array of per-value results. partial/skipped features are
 * NOT failures: Windows protected some values and nothing changed for them.
 * Note: the overall `status: "partial"` here means some *features failed*
 * (unlike the executor), so failure is decided by the `failed` count.
 */
export function classifyPersonalizationResult(
  call: { ok: true; data: unknown } | { ok: false; error: string; code?: number | null },
): PersonalizationOutcome {
  if (!call.ok) {
    return {
      applied: false,
      errorMessage: call.error || "Personalization could not be applied.",
      snapshotId: null,
      needsElevation: call.code === RPC_CODES.notElevated,
      skippedItems: [],
      widgetsProtected: false,
    };
  }
  const data = isDict(call.data) ? call.data : {};
  const snapshotId = str(data.snapshotId);
  const rpcStatus = str(data.status) ?? "failed";
  const failed = typeof data.failed === "number" ? data.failed : 0;
  const skippedItems: StepNote[] = [];
  for (const feature of Array.isArray(data.results) ? data.results : []) {
    if (!isDict(feature)) continue;
    const featureKey = str(feature.feature) ?? str(feature.type) ?? "feature";
    const items = Array.isArray(feature.items) ? feature.items : [];
    for (const item of items) {
      if (!isDict(item) || item.status !== "skipped") continue;
      skippedItems.push({ type: featureKey, target: str(item.valueName) ?? targetOf(item), reason: str(item.reason), note: str(item.note) });
    }
    if (items.length === 0 && feature.status === "skipped") {
      skippedItems.push({ type: featureKey, target: null, reason: str(feature.reason), note: str(feature.note) });
    }
  }
  const widgetsProtected = skippedItems.some(
    (s) => s.target === "TaskbarDa" || /\\Dsh\b|widget/i.test(`${s.target ?? ""} ${s.note ?? ""}`),
  );
  if (failed === 0 && rpcStatus !== "failed") {
    return { applied: true, errorMessage: null, snapshotId, needsElevation: false, skippedItems, widgetsProtected };
  }
  const nested = describeFailedOperations(data);
  return {
    applied: false,
    errorMessage: str(data.error) ?? nested ?? `status "${rpcStatus}", ${failed} failed`,
    snapshotId,
    needsElevation: false,
    skippedItems,
    widgetsProtected,
  };
}

export type RestorePointOutcome = "created" | "throttled" | "unavailable" | "failed";

/** `system.createRestorePoint` → created | throttled (skipped, 24 h) | unavailable (System Protection off) | failed. */
export function describeRestorePoint(
  call: { ok: true; data: unknown } | { ok: false; error: string; code?: number | null },
): { status: RestorePointOutcome; detail: string | null } {
  if (!call.ok) return { status: "failed", detail: call.error };
  const data = isDict(call.data) ? call.data : {};
  const detail = [str(data.message), str(data.error)].filter(Boolean).join(" — ") || null;
  if (data.status === "created") return { status: "created", detail };
  if (data.status === "skipped") return { status: "throttled", detail };
  if (data.status === "unavailable") return { status: "unavailable", detail };
  return { status: "failed", detail };
}
