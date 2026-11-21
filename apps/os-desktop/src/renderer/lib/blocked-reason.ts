// Human-readable classification of a resolved action's `blockedReason`
// (services/os-service/src/playbook/resolver.rs). "Not applicable" reasons —
// retired actions, duplicates, hardware that is not present, actions that
// only exist before a given Windows build — are facts about this PC, not
// problems, and are rendered neutrally and kept out of the "blocked" count.

export type BlockedKind = "notApplicable" | "choice" | "expert" | "safeguard";

export interface BlockedReasonView {
  kind: BlockedKind;
  /** i18n key, or null to show `raw` as-is */
  key: string | null;
  vars: Record<string, string | number>;
  raw: string;
}

export function classifyBlockedReason(reason: string | null | undefined, status?: string): BlockedReasonView | null {
  const raw = (reason ?? "").trim();
  if (!raw) {
    return status === "BuildGated" ? { kind: "notApplicable", key: "plan.reason.buildGated", vars: {}, raw } : null;
  }
  let m: RegExpMatchArray | null;
  if ((m = raw.match(/^retired\s*[:—-]\s*(.*)$/i))) {
    return { kind: "notApplicable", key: "plan.reason.retired", vars: { detail: m[1] }, raw };
  }
  if ((m = raw.match(/^duplicate of\s+(.+)$/i))) {
    return { kind: "notApplicable", key: "plan.reason.duplicate", vars: { of: m[1].replace(/\.$/, "") }, raw };
  }
  if ((m = raw.match(/^hardware not applicable\s*[:—-]?\s*(.*)$/i))) {
    return { kind: "notApplicable", key: "plan.reason.hardware", vars: { detail: m[1] }, raw };
  }
  if ((m = raw.match(/not applicable after windows build\s+(\d+)/i))) {
    return { kind: "notApplicable", key: "plan.reason.afterBuild", vars: { build: Number(m[1]) }, raw };
  }
  if (status === "BuildGated" || /requires windows build|minimum windows build/i.test(raw)) {
    return { kind: "notApplicable", key: "plan.reason.buildGated", vars: {}, raw };
  }
  if (/^expert-only/i.test(raw)) return { kind: "expert", key: "plan.reason.expert", vars: {}, raw };
  if (/^you chose\b/i.test(raw)) return { kind: "choice", key: null, vars: {}, raw };
  return { kind: "safeguard", key: null, vars: {}, raw };
}

export function isNotApplicable(reason: string | null | undefined, status?: string): boolean {
  return classifyBlockedReason(reason, status)?.kind === "notApplicable";
}
