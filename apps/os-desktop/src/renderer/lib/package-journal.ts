import type { ActionDecisionProvenance, ExecutionResult, ResolvedPlaybook } from "@/stores/wizard-store";

export function buildPackagePlanId(
  playbook: ResolvedPlaybook,
  profileId?: string | null,
): string {
  return [
    "apbx",
    "ouden-os",
    playbook.playbookVersion,
    playbook.preset,
    profileId ?? playbook.profile,
  ].join(":");
}

export function buildExecutionJournalContext(
  playbook: ResolvedPlaybook,
  provenance: ActionDecisionProvenance,
  profileId?: string | null,
) {
  return {
    package: {
      planId: buildPackagePlanId(playbook, profileId),
      packageId: "ouden-os",
      packageRole: "user-resolved" as const,
      packageVersion: playbook.playbookVersion,
      packageSourceRef: playbook.packageRefs?.manifestRef ?? "manifest.json",
      actionProvenanceRef: playbook.packageRefs?.actionProvenanceRef ?? "state/action-provenance.json",
      executionJournalRef: playbook.packageRefs?.executionJournalRef ?? "state/execution-journal.json",
      sourceCommit: null,
    },
    action: {
      actionId: provenance.actionId,
      label: provenance.actionName,
      phase: provenance.phaseName,
      packageSourceRef: provenance.packageSourceRef,
      provenanceRef: provenance.packageSourceRef,
      questionKeys: provenance.sourceQuestionIds,
      selectedValues: provenance.sourceOptionValues.map((value) => String(value)),
      requiresReboot: provenance.requiresReboot,
    },
  };
}

export function buildRebootJournalContext(
  playbook: ResolvedPlaybook,
  profileId?: string | null,
) {
  return {
    planId: buildPackagePlanId(playbook, profileId),
    packageId: "ouden-os",
    packageRole: "user-resolved" as const,
    packageVersion: playbook.playbookVersion,
  };
}

export function getPendingRebootProvenanceRefs(
  playbook: ResolvedPlaybook | null,
  executionResult: ExecutionResult | null,
): string[] {
  if (!playbook) return [];

  const appliedActionIds = new Set(
    executionResult?.journal
      .filter((entry) => entry.kind === "playbook-action" && entry.status === "applied")
      .map((entry) => entry.actionId) ?? [],
  );

  return (playbook.actionProvenance ?? [])
    .filter((entry) => entry.requiresReboot && appliedActionIds.has(entry.actionId))
    .map((entry) => entry.packageSourceRef);
}
