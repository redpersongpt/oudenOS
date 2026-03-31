import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

export interface ApbxExportState {
  detectedProfile: {
    id: string;
    label: string;
    confidence: number;
    isWorkPc: boolean;
    machineName: string;
    signals: string[];
    accentColor: string;
    windowsBuild: number;
  } | null;
  playbookPreset: string;
  answers: Record<string, string | boolean | null>;
  resolvedPlaybook: Record<string, unknown> | null;
  decisionSummary?: Record<string, unknown> | null;
  actionProvenance?: Record<string, unknown>[] | null;
  executionJournal?: Record<string, unknown>[] | null;
  serviceJournalState?: Record<string, unknown> | null;
  personalization: Record<string, unknown>;
  selectedAppIds: string[];
}

export interface CreateApbxBundleOptions {
  outputPath: string;
  wizardMetadata: Record<string, any>;
  playbookRoot: string;
  version: string;
  commit: string;
  builtAt?: string;
  state?: ApbxExportState | null;
  sourceRepo?: string;
}

function getNestedRecordArray(
  record: Record<string, unknown> | null | undefined,
  key: string,
): Record<string, unknown>[] | null {
  const value = record?.[key];
  return Array.isArray(value) ? value.filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object") : null;
}

function hashFile(filePath: string): string {
  const hash = crypto.createHash("sha256");
  hash.update(fs.readFileSync(filePath));
  return hash.digest("hex");
}

function listFilesRecursive(rootDir: string): string[] {
  const entries = fs.readdirSync(rootDir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFilesRecursive(fullPath));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  return files;
}

function yamlQuote(value: unknown): string {
  return `"${String(value).replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}

function renderResolvedConfiguration(options: {
  wizardMetadata: Record<string, any>;
  state?: ApbxExportState | null;
}): string {
  const { wizardMetadata, state } = options;
  const lines = [
    "---",
    `title: ${yamlQuote(wizardMetadata.title ?? "redcore OS Package")}`,
    `packageId: ${yamlQuote(wizardMetadata.packageId ?? "redcore-os")}`,
    `packageKind: ${yamlQuote(state ? "user-resolved" : "wizard-template")}`,
    `profile: ${yamlQuote(state?.detectedProfile?.id ?? "template")}`,
    `preset: ${yamlQuote(state?.playbookPreset ?? "balanced")}`,
    "requirements:",
  ];

  for (const requirement of wizardMetadata.requirements ?? []) {
    lines.push(`  - ${yamlQuote(requirement)}`);
  }

  lines.push("injection:");
  lines.push(`  supportsISO: ${wizardMetadata.supportsISO ? "true" : "false"}`);
  lines.push(`  injectPath: ${yamlQuote(wizardMetadata.iso?.injectPath ?? "sources/$OEM$/$1/redcore/wizard")}`);
  lines.push(`  disableBitLocker: ${wizardMetadata.iso?.disableBitLocker ? "true" : "false"}`);
  lines.push(`  disableHardwareRequirements: ${wizardMetadata.iso?.disableHardwareRequirements ? "true" : "false"}`);

  if (state) {
    lines.push("selectedApps:");
    if (state.selectedAppIds.length === 0) {
      lines.push("  []");
    } else {
      for (const appId of state.selectedAppIds) {
        lines.push(`  - ${yamlQuote(appId)}`);
      }
    }
    lines.push("answers:");
    for (const [key, value] of Object.entries(state.answers)) {
      lines.push(`  ${key}: ${yamlQuote(value ?? "null")}`);
    }
  }

  return `${lines.join("\n")}\n`;
}

export function createApbxBundle(options: CreateApbxBundleOptions): {
  outputPath: string;
  manifestPath: string;
  packageDirectory: string;
  sha256: string;
  sizeBytes: number;
} {
  const builtAt = options.builtAt ?? new Date().toISOString();
  const packageKind = options.state ? "user-resolved" : "wizard-template";
  const packageStem = packageKind === "user-resolved"
    ? `redcore-os-user-${options.version}-${options.commit}`
    : `redcore-os-template-${options.version}-${options.commit}`;

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "redcore-os-apbx-"));
  const packageDir = path.join(tempRoot, packageStem);
  const payloadDir = path.join(packageDir, "payload");
  const stateDir = path.join(packageDir, "state");
  const wizardDir = path.join(packageDir, "wizard");
  const configDir = path.join(packageDir, "Configuration");
  const injectionDir = path.join(packageDir, "injection");
  const metaDir = path.join(packageDir, "meta");

  fs.mkdirSync(payloadDir, { recursive: true });
  fs.mkdirSync(stateDir, { recursive: true });
  fs.mkdirSync(wizardDir, { recursive: true });
  fs.mkdirSync(configDir, { recursive: true });
  fs.mkdirSync(injectionDir, { recursive: true });
  fs.mkdirSync(metaDir, { recursive: true });

  fs.writeFileSync(path.join(wizardDir, "wizard.json"), `${JSON.stringify(options.wizardMetadata, null, 2)}\n`);
  fs.writeFileSync(path.join(configDir, "main.yml"), renderResolvedConfiguration({
    wizardMetadata: options.wizardMetadata,
    state: options.state,
  }));

  fs.writeFileSync(
    path.join(injectionDir, "staging.json"),
    `${JSON.stringify(
      {
        supportsISO: options.wizardMetadata.supportsISO ?? false,
        supportsOffline: true,
        supportsImageInjection: true,
        injectPath: options.wizardMetadata.iso?.injectPath ?? null,
        disableBitLocker: options.wizardMetadata.iso?.disableBitLocker ?? false,
        disableHardwareRequirements: options.wizardMetadata.iso?.disableHardwareRequirements ?? false,
        supportedBuilds: options.wizardMetadata.supportedBuilds ?? [],
      },
      null,
      2,
    )}\n`,
  );

  fs.writeFileSync(
    path.join(metaDir, "release.json"),
    `${JSON.stringify(
      {
        product: "redcore-os",
        packageRole: packageKind,
        artifactName: path.basename(options.outputPath),
        version: options.version,
        commit: options.commit,
        builtAt,
        sourceRepo: options.sourceRepo ?? options.wizardMetadata.git ?? "",
        sourceWizardConfig: "playbooks/wizard.json",
      },
      null,
      2,
    )}\n`,
  );

  fs.cpSync(options.playbookRoot, path.join(payloadDir, "playbooks"), { recursive: true });

  if (options.state) {
    const actionProvenance = options.state.actionProvenance ?? getNestedRecordArray(options.state.resolvedPlaybook, "actionProvenance");
    const executionJournal = options.state.executionJournal ?? null;
    fs.writeFileSync(path.join(stateDir, "answers.json"), `${JSON.stringify(options.state.answers, null, 2)}\n`);
    fs.writeFileSync(path.join(stateDir, "profile.json"), `${JSON.stringify(options.state.detectedProfile, null, 2)}\n`);
    fs.writeFileSync(path.join(stateDir, "personalization.json"), `${JSON.stringify(options.state.personalization, null, 2)}\n`);
    fs.writeFileSync(path.join(stateDir, "selected-apps.json"), `${JSON.stringify(options.state.selectedAppIds, null, 2)}\n`);
    fs.writeFileSync(path.join(stateDir, "resolved-playbook.json"), `${JSON.stringify(options.state.resolvedPlaybook, null, 2)}\n`);
    fs.writeFileSync(path.join(stateDir, "decision-summary.json"), `${JSON.stringify(options.state.decisionSummary ?? null, null, 2)}\n`);
    fs.writeFileSync(path.join(stateDir, "action-provenance.json"), `${JSON.stringify(actionProvenance ?? null, null, 2)}\n`);
    fs.writeFileSync(path.join(stateDir, "execution-journal.json"), `${JSON.stringify(executionJournal ?? null, null, 2)}\n`);
    fs.writeFileSync(path.join(stateDir, "service-journal-state.json"), `${JSON.stringify(options.state.serviceJournalState ?? null, null, 2)}\n`);
  }

  const filesForChecksums = listFilesRecursive(packageDir);
  const checksums = filesForChecksums.map((filePath) => ({
    path: path.relative(packageDir, filePath),
    sha256: hashFile(filePath),
    sizeBytes: fs.statSync(filePath).size,
  }));

  const warnings = Array.isArray(options.state?.decisionSummary?.warnings)
    ? (options.state?.decisionSummary?.warnings as string[])
    : [];
  const riskLevel = typeof options.state?.decisionSummary?.riskLevel === "string"
    ? options.state.decisionSummary.riskLevel
    : "template";
  const selectedQuestionCount = options.state
    ? Object.values(options.state.answers).filter((value) => value !== null).length
    : 0;
  const actionProvenance = options.state?.actionProvenance ?? getNestedRecordArray(options.state?.resolvedPlaybook, "actionProvenance");
  const executionJournal = options.state?.executionJournal ?? null;

  const manifest = {
    format: "redcore-os-apbx",
    formatVersion: 1,
    packageKind,
    packageId: options.wizardMetadata.packageId ?? "redcore-os",
    title: options.wizardMetadata.title ?? "redcore OS Package",
    packageVersion: options.version,
    commit: options.commit,
    builtAt,
    source: {
      repo: options.sourceRepo ?? options.wizardMetadata.git ?? "",
      wizardConfig: "playbooks/wizard.json",
    },
    supportedBuilds: options.wizardMetadata.supportedBuilds ?? [],
    requirements: options.wizardMetadata.requirements ?? [],
    warnings,
    riskLevel,
    selectedQuestionCount,
    release: {
      product: "redcore-os",
      packageRole: packageKind,
      artifactName: path.basename(options.outputPath),
      version: options.version,
      commit: options.commit,
      builtAt,
      sourceRepo: options.sourceRepo ?? options.wizardMetadata.git ?? "",
      sourceWizardConfig: "playbooks/wizard.json",
    },
    injection: {
      supportsISO: options.wizardMetadata.supportsISO ?? false,
      supportsOffline: true,
      supportsImageInjection: true,
      injectPath: options.wizardMetadata.iso?.injectPath ?? null,
      disableBitLocker: options.wizardMetadata.iso?.disableBitLocker ?? false,
      disableHardwareRequirements: options.wizardMetadata.iso?.disableHardwareRequirements ?? false,
      supportedBuilds: options.wizardMetadata.supportedBuilds ?? [],
    },
    payload: {
      includesPlaybooks: true,
      includesResolvedPlaybook: Boolean(options.state?.resolvedPlaybook),
      includesWizardMetadata: true,
      includesDecisionSummary: Boolean(options.state?.decisionSummary),
      includesAnswerState: Boolean(options.state),
      includesActionProvenance: Boolean(actionProvenance),
      includesExecutionJournal: Boolean(executionJournal),
      includesServiceJournalState: Boolean(options.state?.serviceJournalState),
    },
    provenance: {
      actionCount: Array.isArray(actionProvenance) ? actionProvenance.length : 0,
      journalEntryCount: Array.isArray(executionJournal) ? executionJournal.length : 0,
    },
    checksums,
  };

  const manifestPath = path.join(packageDir, "manifest.json");
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  fs.mkdirSync(path.dirname(options.outputPath), { recursive: true });
  const zipResult = spawnSync("zip", ["-qr", options.outputPath, packageStem], {
    cwd: tempRoot,
    stdio: "inherit",
  });
  if (zipResult.status !== 0) {
    throw new Error("zip failed while building APBX package");
  }

  const sha256 = hashFile(options.outputPath);
  const sizeBytes = fs.statSync(options.outputPath).size;

  return {
    outputPath: options.outputPath,
    manifestPath,
    packageDirectory: packageDir,
    sha256,
    sizeBytes,
  };
}
