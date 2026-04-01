// Rollback Package
// Shared rollback logic: diff generation, snapshot serialization, undo plans.

export { generateDiff } from "./diff.js";

export function formatChangeForAudit(
  path: string,
  valueName: string,
  beforeValue: unknown,
  afterValue: unknown,
): string {
  const before = beforeValue === null ? "(not set)" : String(beforeValue);
  const after = afterValue === null ? "(deleted)" : String(afterValue);
  return `${path}\\${valueName}: ${before} → ${after}`;
}
