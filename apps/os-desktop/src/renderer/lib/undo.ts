// "Undo everything" for one run, via the existing allowlisted service methods:
//   rollback.list            → snapshots (newest first)
//   rollback.restore {snapshotId}
//   personalize.revert {snapshotId}
// Only snapshots created at/after the run started are restored, newest first,
// so earlier runs are untouched. Removed AppX packages cannot be reinstalled
// automatically (the service reports them as a "note").

import { serviceCall } from "@/lib/service";

interface SnapshotSummary {
  id: string;
  createdAt: string;
  scope?: string;
}

export interface UndoResult {
  restored: number;
  failed: number;
  errors: string[];
  personalizationReverted: boolean | null;
}

/** Pure: which snapshots belong to the run (1 s clock slack). */
export function snapshotsForRun(
  snapshots: SnapshotSummary[],
  startedAt: string,
  excludeIds: string[] = [],
): SnapshotSummary[] {
  const start = Date.parse(startedAt);
  if (!Number.isFinite(start)) return [];
  return snapshots
    .filter((s) => !excludeIds.includes(s.id))
    .filter((s) => {
      const created = Date.parse(s.createdAt);
      return Number.isFinite(created) && created >= start - 1000;
    })
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

function failedCount(data: unknown): number {
  if (typeof data !== "object" || data === null) return 0;
  const d = data as Record<string, unknown>;
  // rollback.restore → actionsFailed; personalize.revert → failed
  if (typeof d.actionsFailed === "number") return d.actionsFailed;
  if (typeof d.failed === "number") return d.failed;
  return 0;
}

export async function undoRun(
  startedAt: string,
  personalizationSnapshotId: string | null | undefined,
  onProgress?: (done: number, total: number) => void,
): Promise<UndoResult> {
  const result: UndoResult = { restored: 0, failed: 0, errors: [], personalizationReverted: null };

  const list = await serviceCall<SnapshotSummary[]>("rollback.list");
  if (!list.ok) {
    result.failed += 1;
    result.errors.push(list.error);
    return result;
  }
  const exclude = personalizationSnapshotId ? [personalizationSnapshotId] : [];
  const targets = snapshotsForRun(Array.isArray(list.data) ? list.data : [], startedAt, exclude);
  const total = targets.length + (personalizationSnapshotId ? 1 : 0);
  let done = 0;

  if (personalizationSnapshotId) {
    const pr = await serviceCall("personalize.revert", { snapshotId: personalizationSnapshotId });
    result.personalizationReverted = pr.ok && failedCount(pr.data) === 0;
    if (!pr.ok) result.errors.push(pr.error);
    onProgress?.(++done, total);
  }

  for (const snapshot of targets) {
    const r = await serviceCall("rollback.restore", { snapshotId: snapshot.id });
    if (r.ok && failedCount(r.data) === 0) {
      result.restored += 1;
    } else {
      result.failed += 1;
      result.errors.push(r.ok ? `snapshot ${snapshot.id}: ${failedCount(r.data)} item(s) not restored` : r.error);
    }
    onProgress?.(++done, total);
  }
  return result;
}
