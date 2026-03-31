export type OsPackageKind = "wizard-template" | "user-resolved";

export interface OsPackageReleaseMetadata {
  product: "redcore-os";
  packageRole?: OsPackageKind;
  artifactName?: string;
  version: string;
  commit: string;
  builtAt: string;
  sourceRepo?: string;
  sourceWizardConfig?: string;
}

export interface OsPackageInjectionMetadata {
  supportsISO: boolean;
  supportsOffline: boolean;
  supportsImageInjection: boolean;
  injectPath: string | null;
  disableBitLocker?: boolean;
  disableHardwareRequirements?: boolean;
  supportedBuilds: number[];
}

export interface OsPackageChecksumEntry {
  path: string;
  sha256: string;
  sizeBytes: number;
}

export interface OsPackageActionProvenanceSource {
  effect: "include" | "block";
  questionKey: string;
  questionLabel: string;
  selectedValue: string | boolean;
  selectedTitle: string;
  blockedReason: string | null;
  warnings: string[];
  riskLevel: "safe" | "mixed" | "aggressive" | "expert";
  requiresReboot: boolean;
  estimatedPreserved: number;
  optionSourceRef: string;
}

export interface OsPackageActionProvenance {
  actionId: string;
  actionName: string;
  phaseId: string;
  phaseName: string;
  description: string;
  defaultStatus: string;
  finalStatus: string;
  inclusionReason: string | null;
  blockedReason: string | null;
  preservedReason: string | null;
  reasonOrigin: "base-playbook" | "user-choice" | "profile-safeguard" | "build-gate";
  warnings: string[];
  riskLevel: "safe" | "mixed" | "aggressive" | "expert";
  expertOnly: boolean;
  requiresReboot: boolean;
  offlineApplicable: boolean;
  imageApplicable: boolean;
  sourceQuestionIds: string[];
  sourceOptionValues: Array<string | boolean>;
  sources: OsPackageActionProvenanceSource[];
  packageSourceRef: string;
  journalRecordRefs: string[];
  executionResultRef: string | null;
}

export interface OsPackageExecutionJournalEntry {
  id: string;
  kind: "playbook-action" | "personalization" | "app-install";
  actionId: string;
  label: string;
  phase: string;
  status: "applied" | "failed";
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  questionKeys: string[];
  selectedValues: Array<string | boolean>;
  packageSourceRef: string | null;
  provenanceRef: string | null;
  resultRef: string;
  errorMessage: string | null;
}

export interface OsPackageManifest {
  format: "redcore-os-apbx";
  formatVersion: 1;
  packageKind: OsPackageKind;
  packageId: string;
  title: string;
  packageVersion: string;
  commit: string;
  builtAt: string;
  source: {
    repo: string;
    wizardConfig: string;
  };
  supportedBuilds: number[];
  requirements: string[];
  warnings: string[];
  riskLevel: "safe" | "mixed" | "aggressive" | "expert" | "template";
  selectedQuestionCount: number;
  release: OsPackageReleaseMetadata;
  injection: OsPackageInjectionMetadata;
  payload: {
    includesPlaybooks: boolean;
    includesResolvedPlaybook: boolean;
    includesWizardMetadata: boolean;
    includesDecisionSummary: boolean;
    includesAnswerState: boolean;
    includesActionProvenance?: boolean;
    includesExecutionJournal?: boolean;
    includesServiceJournalState?: boolean;
    includesExecutionLedger?: boolean;
  };
  provenance?: {
    actionCount: number;
    journalEntryCount: number;
  };
  checksums: OsPackageChecksumEntry[];
}
