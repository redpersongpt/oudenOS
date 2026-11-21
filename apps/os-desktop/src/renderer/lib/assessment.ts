// Pure readers for the `assess.full` response (services/os-service/src/assessor.rs
// + health.rs). Shared by the Assessment step, unit tests and the headless
// contract check.

import type { HealthCheck } from "@/stores/wizard-store";

type Dict = Record<string, unknown>;
const isObject = (v: unknown): v is Dict => typeof v === "object" && v !== null && !Array.isArray(v);
const readString = (v: unknown): string | null => (typeof v === "string" && v.trim().length > 0 ? v : null);
function readInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string" && /^\d+$/.test(value.trim())) return Number.parseInt(value, 10);
  return null;
}

/**
 * The service-detected build: `detectedBuild` (number), else the
 * `windowsBuild` object `{ build, displayVersion, … }`, else `windows.BuildNumber`.
 * Never a client-side default — null when the service did not report one.
 */
export function readWindowsBuild(assessment: Dict): number | null {
  const wb = assessment.windowsBuild;
  const windows = isObject(assessment.windows) ? assessment.windows : {};
  const hardware = isObject(assessment.hardware) ? assessment.hardware : {};
  const build =
    readInt(assessment.detectedBuild) ??
    (isObject(wb) ? readInt(wb.build) : readInt(wb)) ??
    readInt(windows.BuildNumber) ??
    readInt(windows.buildNumber) ??
    readInt(hardware.windowsBuild);
  return build !== null && build >= 10000 ? build : null;
}

const HEALTH_STATUSES = new Set(["ok", "attention", "unknown"]);

/** `healthChecks: [{ id, status: ok|attention|unknown, title, detail, evidence }]`, invalid entries dropped. */
export function readHealthChecks(assessment: Dict): HealthCheck[] {
  const raw = assessment.healthChecks;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(isObject)
    .filter((h) => typeof h.id === "string" && typeof h.status === "string" && HEALTH_STATUSES.has(h.status))
    .map((h) => ({
      id: h.id as string,
      status: h.status as HealthCheck["status"],
      title: readString(h.title) ?? (h.id as string),
      detail: readString(h.detail) ?? "",
      evidence: isObject(h.evidence) ? h.evidence : null,
    }));
}
