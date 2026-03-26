import type { ConfigDiffEntry } from "@redcore/shared-schema/rollback";

export function generateDiff(
  beforeValues: Array<{ path: string; valueName: string; value: unknown; actionId: string; actionName: string }>,
  afterValues: Array<{ path: string; valueName: string; value: unknown }>,
): ConfigDiffEntry[] {
  const diffs: ConfigDiffEntry[] = [];

  for (const before of beforeValues) {
    const after = afterValues.find(
      (a) => a.path === before.path && a.valueName === before.valueName,
    );

    if (!after) {
      diffs.push({
        path: before.path,
        valueName: before.valueName,
        beforeValue: before.value as string | number | null,
        afterValue: null,
        changeType: "removed",
        actionId: before.actionId,
        actionName: before.actionName,
      });
    } else if (String(before.value) !== String(after.value)) {
      diffs.push({
        path: before.path,
        valueName: before.valueName,
        beforeValue: before.value as string | number | null,
        afterValue: after.value as string | number | null,
        changeType: "modified",
        actionId: before.actionId,
        actionName: before.actionName,
      });
    }
  }

  return diffs;
}
