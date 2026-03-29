import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync, type ChildProcessWithoutNullStreams } from "node:child_process";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_QUESTIONNAIRE_ANSWERS,
  type QuestionnaireAnswers,
  type AggressionPreset,
  type EdgeBehavior,
  type TelemetryLevel,
} from "../src/renderer/stores/decisions-store.ts";
import { applyDecisionOverrides } from "../src/renderer/lib/playbook-decision-overrides.ts";
import { resolveEffectivePersonalization } from "../src/renderer/lib/personalization-resolution.ts";
import { buildMockResolvedPlaybook } from "../src/renderer/lib/mock-playbook.ts";
import {
  getProfilePersonalizationDefaults,
  type PersonalizationPreferences,
  type ResolvedPlaybook,
} from "../src/renderer/stores/wizard-store.ts";

export type VerificationProofStatus =
  | "fully verified on real Windows"
  | "partially verified on real Windows"
  | "executable but readback not yet implemented"
  | "requires reboot to verify fully"
  | "blocked by profile by design"
  | "expert-only / intentionally not broadly verified yet"
  | "not safely machine-verifiable yet"
  | "legacy / weak / needs redesign";

export type VerificationTier = "tier1" | "tier2" | "tier3";

export interface RegistryChangeDefinition {
  hive: string;
  path: string;
  valueName: string;
  value: string | number | boolean | null;
  valueType: string;
}

export interface ServiceChangeDefinition {
  name: string;
  startupType: string;
}

export interface BcdChangeDefinition {
  element: string;
  newValue: string;
}

export interface PowerChangeDefinition {
  settingPath: string;
  newValue: string;
}

export interface TaskChangeDefinition {
  name: string;
  path: string;
  action: string;
}

export interface ActionCatalogEntry {
  actionId: string;
  name: string;
  description: string;
  rationale: string;
  module: string;
  moduleName: string;
  phaseId: string;
  phaseName: string;
  category: string;
  risk: string;
  tier: string;
  default: boolean;
  expertOnly: boolean;
  requiresReboot: boolean;
  reversible: boolean;
  estimatedSeconds: number;
  blockedProfiles: string[];
  minWindowsBuild: number | null;
  warningMessage: string | null;
  tags: string[];
  executionKinds: string[];
  registryChanges: RegistryChangeDefinition[];
  serviceChanges: ServiceChangeDefinition[];
  bcdChanges: BcdChangeDefinition[];
  powerChanges: PowerChangeDefinition[];
  powerShellCommands: string[];
  packages: string[];
  tasks: TaskChangeDefinition[];
}

export interface ProfileRuleSet {
  blockedActions: string[];
  optionalActions: string[];
}

export interface PlaybookCatalog {
  playbookName: string;
  playbookVersion: string;
  phases: Array<{ id: string; name: string; actions: ActionCatalogEntry[] }>;
  actions: ActionCatalogEntry[];
  profiles: Record<string, ProfileRuleSet>;
}

export interface QuestionScenario {
  profile: string;
  preset: "conservative" | "balanced" | "aggressive";
  aggressionPreset: Exclude<AggressionPreset, null>;
  windowsBuild: number;
}

export interface QuestionActionEffect {
  questionKey: keyof QuestionnaireAnswers;
  scenario: QuestionScenario;
  answerStatuses: Array<{
    value: string | boolean;
    status: string;
    blockedReason: string | null;
  }>;
  changesPlanReboot: boolean;
  changesPresetBehavior: boolean;
}

export interface QuestionPlanDelta {
  questionKey: keyof QuestionnaireAnswers;
  scenario: QuestionScenario;
  changedActionIds: string[];
  variants: Array<{
    value: string | boolean;
    totalIncluded: number;
    totalBlocked: number;
    totalOptional: number;
    requiresReboot: boolean;
  }>;
}

export interface ExpectedStateChange {
  kind: string;
  target: string;
  expected: string;
}

export interface ReadbackMethod {
  kind: string;
  detail: string;
}

export interface ActionVerificationMatrixEntry {
  actionId: string;
  name: string;
  phaseId: string;
  phaseName: string;
  module: string;
  category: string;
  risk: string;
  expertOnly: boolean;
  requiresReboot: boolean;
  reversible: boolean;
  executionKinds: string[];
  verificationTier: VerificationTier;
  expectedStateChanges: ExpectedStateChange[];
  readbackMethods: ReadbackMethod[];
  rollbackMethod: string;
  profileRestrictions: {
    blockedProfiles: string[];
    profileRuleHits: string[];
  };
  questionDependencies: QuestionActionEffect[];
  currentProofStatus: VerificationProofStatus;
  currentProofReason: string;
}

export interface SelectedQuestionDelta {
  questionKey: keyof QuestionnaireAnswers;
  selectedValue: string | boolean;
  scenario: QuestionScenario;
  includedActions: string[];
  blockedActions: string[];
  optionalActions: string[];
  changesPlanReboot: boolean;
}

export interface RegistryReadback {
  exists: boolean;
  currentValue: string | number | boolean | null;
}

export interface VerificationCheckResult {
  kind: string;
  target: string;
  expected: string;
  actual: string;
  status: "pass" | "fail" | "skip" | "partial";
  reason?: string;
}

export interface ActionRuntimeVerificationResult {
  actionId: string;
  actionName: string;
  phaseName: string;
  verificationTier: VerificationTier;
  questionDependencies: QuestionActionEffect[];
  baseline: VerificationCheckResult[];
  execute: Record<string, unknown>;
  readback: VerificationCheckResult[];
  readbackStatus: "pass" | "fail" | "partial" | "skip";
  rollback: {
    attempted: boolean;
    result: Record<string, unknown> | null;
    readback: VerificationCheckResult[];
    status: "pass" | "fail" | "partial" | "skip";
    reason?: string;
  };
}

export interface PersonalizationVerificationReport {
  baseline: VerificationCheckResult[];
  execute: Record<string, unknown> | null;
  readback: VerificationCheckResult[];
  readbackStatus: "pass" | "fail" | "partial" | "skip";
  rollback: {
    attempted: boolean;
    result: Record<string, unknown> | null;
    readback: VerificationCheckResult[];
    status: "pass" | "fail" | "partial" | "skip";
    reason?: string;
  };
}

export interface BlockedActionVerificationResult {
  actionId: string;
  actionName: string;
  reason: string;
  verificationTier: VerificationTier;
  baseline: VerificationCheckResult[];
  afterApply: VerificationCheckResult[];
  status: "pass" | "fail" | "partial" | "skip";
}

export interface CertificationSummary {
  startedAt: string;
  finishedAt: string;
  host: {
    platform: string;
    release: string;
    hostname: string;
  };
  profile: string;
  preset: string;
  windowsBuild: number;
  priority: string;
  selectedActionCount: number;
  blockedActionCount: number;
  overallStatus: "pass" | "fail" | "partial";
  readbackPassCount: number;
  readbackFailCount: number;
  rollbackPassCount: number;
  rollbackFailCount: number;
  blockedPreservationPassCount: number;
  blockedPreservationFailCount: number;
}

type ServiceResponse = {
  id: number;
  result?: Record<string, unknown>;
  error?: { message?: string };
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..", "..");
const playbookRoot = path.join(repoRoot, "playbooks");
const manifestPath = path.join(playbookRoot, "manifest.yaml");
const supportedExecutionKinds = [
  "registryChanges",
  "serviceChanges",
  "bcdChanges",
  "powerChanges",
  "powerShellCommands",
  "packages",
  "tasks",
] as const;
const supportedRegistryPlaceholders = [
  "<Interface GUID>",
  "<Adapter Index>",
  "<GPU Device ID>\\<Instance>",
  "<GPU Device ID>\\\\<Instance>",
  "<device>\\<instance>",
  "<device>\\\\<instance>",
];

const QUESTION_SCENARIOS: Partial<Record<keyof QuestionnaireAnswers, QuestionScenario>> = {
  disableDynamicTick: { profile: "gaming_desktop", preset: "aggressive", aggressionPreset: "aggressive", windowsBuild: 22631 },
  disableSmartScreen: { profile: "gaming_desktop", preset: "aggressive", aggressionPreset: "aggressive", windowsBuild: 22631 },
  removeEdge: { profile: "gaming_desktop", preset: "aggressive", aggressionPreset: "aggressive", windowsBuild: 22631 },
  preserveWebView2: { profile: "gaming_desktop", preset: "aggressive", aggressionPreset: "aggressive", windowsBuild: 22631 },
  disableRecall: { profile: "gaming_desktop", preset: "aggressive", aggressionPreset: "expert", windowsBuild: 26100 },
  disableClickToDo: { profile: "gaming_desktop", preset: "aggressive", aggressionPreset: "expert", windowsBuild: 26100 },
  reduceMitigations: { profile: "gaming_desktop", preset: "aggressive", aggressionPreset: "expert", windowsBuild: 26100 },
  disableHvci: { profile: "gaming_desktop", preset: "aggressive", aggressionPreset: "expert", windowsBuild: 26100 },
  disableLlmnr: { profile: "gaming_desktop", preset: "aggressive", aggressionPreset: "aggressive", windowsBuild: 22631 },
  disableIpv6: { profile: "gaming_desktop", preset: "aggressive", aggressionPreset: "aggressive", windowsBuild: 22631 },
  disableTeredo: { profile: "gaming_desktop", preset: "aggressive", aggressionPreset: "aggressive", windowsBuild: 22631 },
  disableNetbios: { profile: "gaming_desktop", preset: "aggressive", aggressionPreset: "aggressive", windowsBuild: 22631 },
  disableNagle: { profile: "gaming_desktop", preset: "aggressive", aggressionPreset: "aggressive", windowsBuild: 22631 },
  disableNicOffloading: { profile: "gaming_desktop", preset: "aggressive", aggressionPreset: "aggressive", windowsBuild: 22631 },
  disableDeliveryOptimization: { profile: "gaming_desktop", preset: "aggressive", aggressionPreset: "aggressive", windowsBuild: 22631 },
  disableUsbSelectiveSuspend: { profile: "gaming_desktop", preset: "aggressive", aggressionPreset: "aggressive", windowsBuild: 22631 },
  disablePcieLinkStatePm: { profile: "gaming_desktop", preset: "aggressive", aggressionPreset: "aggressive", windowsBuild: 22631 },
};

const BASE_SCENARIO: QuestionScenario = {
  profile: "gaming_desktop",
  preset: "balanced",
  aggressionPreset: "balanced",
  windowsBuild: 22631,
};

function stripQuotes(value: string): string {
  return value.replace(/^"/, "").replace(/"$/, "").replace(/^'/, "").replace(/'$/, "");
}

function parseBoolean(value: string, fallback = false): boolean {
  if (value.trim() === "true") return true;
  if (value.trim() === "false") return false;
  return fallback;
}

function parseScalar(value: string): string | number | boolean | null {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "null") return null;
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (/^-?\d+$/.test(trimmed)) return Number.parseInt(trimmed, 10);
  return stripQuotes(trimmed);
}

function parseInlineArray(value: string): string[] {
  const trimmed = value.trim();
  if (!trimmed.startsWith("[") || !trimmed.endsWith("]")) return [];
  return trimmed
    .slice(1, -1)
    .split(",")
    .map((entry) => stripQuotes(entry.trim()))
    .filter(Boolean);
}

function parseManifest(text: string): {
  playbookName: string;
  playbookVersion: string;
  phases: Array<{ id: string; name: string; modules: string[]; type: string | null }>;
  profiles: Record<string, { overrides: string | null }>;
} {
  const lines = text.split(/\r?\n/);
  const phases: Array<{ id: string; name: string; modules: string[]; type: string | null }> = [];
  const profiles: Record<string, { overrides: string | null }> = {};
  const playbookName = stripQuotes(text.match(/^name:\s*"([^"]+)"/m)?.[1] ?? "redcore-os-default");
  const playbookVersion = stripQuotes(text.match(/^version:\s*"([^"]+)"/m)?.[1] ?? "1.0.0");

  let mode = "";
  let currentPhase: { id: string; name: string; modules: string[]; type: string | null } | null = null;
  let currentProfile: string | null = null;
  let readingModules = false;

  for (const line of lines) {
    if (line.startsWith("phases:")) {
      mode = "phases";
      currentPhase = null;
      readingModules = false;
      continue;
    }
    if (line.startsWith("profiles:")) {
      if (currentPhase) phases.push(currentPhase);
      currentPhase = null;
      mode = "profiles";
      currentProfile = null;
      readingModules = false;
      continue;
    }

    if (mode === "phases") {
      if (line.startsWith("  - id: ")) {
        if (currentPhase) phases.push(currentPhase);
        currentPhase = {
          id: line.slice(8).trim(),
          name: "",
          modules: [],
          type: null,
        };
        continue;
      }
      if (!currentPhase) continue;
      if (line.startsWith("    name: ")) {
        currentPhase.name = stripQuotes(line.slice(10).trim());
        continue;
      }
      if (line.startsWith("    type: ")) {
        currentPhase.type = line.slice(10).trim().split("#")[0].trim();
        continue;
      }
      if (line.startsWith("    modules:")) {
        readingModules = true;
        continue;
      }
      if (readingModules && line.startsWith("      - ")) {
        currentPhase.modules.push(line.slice(8).trim());
        continue;
      }
      if (readingModules && !line.startsWith("      - ")) {
        readingModules = false;
      }
      continue;
    }

    if (mode === "profiles") {
      const profileMatch = line.match(/^  ([a-z0-9_]+):\s*$/);
      if (profileMatch) {
        currentProfile = profileMatch[1];
        profiles[currentProfile] = { overrides: null };
        continue;
      }
      if (!currentProfile) continue;
      if (line.startsWith("    overrides: ")) {
        profiles[currentProfile].overrides = line.slice(15).trim();
      }
    }
  }

  if (currentPhase) phases.push(currentPhase);

  return { playbookName, playbookVersion, phases, profiles };
}

function parseProfileOverride(filePath: string): ProfileRuleSet {
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  const rules: ProfileRuleSet = { blockedActions: [], optionalActions: [] };
  let mode: "" | "blocked" | "optional" = "";

  for (const line of lines) {
    if (line.startsWith("blockedActions:")) {
      mode = "blocked";
      continue;
    }
    if (line.startsWith("optionalActions:")) {
      mode = "optional";
      continue;
    }
    if (line.startsWith("preservationFlags:")) {
      mode = "";
      continue;
    }
    if (mode === "blocked") {
      if (line.startsWith("  - ")) {
        rules.blockedActions.push(line.slice(4).trim().split("#")[0].trim());
        continue;
      }
      if (line.trim() && !line.trim().startsWith("#")) mode = "";
      continue;
    }
    if (mode === "optional") {
      if (line.startsWith("  - ")) {
        rules.optionalActions.push(line.slice(4).trim().split("#")[0].trim());
        continue;
      }
      if (line.trim() && !line.trim().startsWith("#")) mode = "";
    }
  }

  return rules;
}

function assignChangeField(target: Record<string, unknown>, rawLine: string): void {
  const separator = rawLine.indexOf(":");
  if (separator === -1) return;
  const key = rawLine.slice(0, separator).trim();
  const value = rawLine.slice(separator + 1).trim();
  target[key] = parseScalar(value);
}

function parseActionChunk(
  chunk: string,
  meta: { phaseId: string; phaseName: string; module: string; moduleName: string; category: string },
): ActionCatalogEntry {
  const lines = chunk.split(/\r?\n/);
  const action: ActionCatalogEntry = {
    actionId: lines[0].trim(),
    name: "",
    description: "",
    rationale: "",
    module: meta.module,
    moduleName: meta.moduleName,
    phaseId: meta.phaseId,
    phaseName: meta.phaseName,
    category: meta.category,
    risk: "safe",
    tier: "free",
    default: true,
    expertOnly: false,
    requiresReboot: false,
    reversible: true,
    estimatedSeconds: 2,
    blockedProfiles: [],
    minWindowsBuild: null,
    warningMessage: null,
    tags: [],
    executionKinds: [],
    registryChanges: [],
    serviceChanges: [],
    bcdChanges: [],
    powerChanges: [],
    powerShellCommands: [],
    packages: [],
    tasks: [],
  };

  let mode:
    | ""
    | "blockedProfiles"
    | "tags"
    | "registryChanges"
    | "serviceChanges"
    | "bcdChanges"
    | "powerChanges"
    | "packages"
    | "tasks"
    | "powershell"
    | "powershellBlock" = "";
  let currentObject: Record<string, unknown> | null = null;
  let currentScript: string[] | null = null;

  const flushObject = () => {
    if (!currentObject) return;
    if (mode === "registryChanges") {
      action.registryChanges.push({
        hive: String(currentObject.hive ?? ""),
        path: String(currentObject.path ?? ""),
        valueName: String(currentObject.valueName ?? ""),
        value: (currentObject.value as string | number | boolean | null) ?? null,
        valueType: String(currentObject.valueType ?? "DWord"),
      });
    } else if (mode === "serviceChanges") {
      action.serviceChanges.push({
        name: String(currentObject.name ?? ""),
        startupType: String(currentObject.startupType ?? "Disabled"),
      });
    } else if (mode === "bcdChanges") {
      action.bcdChanges.push({
        element: String(currentObject.element ?? ""),
        newValue: String(currentObject.newValue ?? ""),
      });
    } else if (mode === "powerChanges") {
      action.powerChanges.push({
        settingPath: String(currentObject.settingPath ?? ""),
        newValue: String(currentObject.newValue ?? ""),
      });
    } else if (mode === "tasks") {
      action.tasks.push({
        name: String(currentObject.name ?? ""),
        path: String(currentObject.path ?? ""),
        action: String(currentObject.action ?? "disable"),
      });
    }
    currentObject = null;
  };

  const flushScript = () => {
    if (!currentScript) return;
    const script = currentScript.join("\n").trimEnd();
    if (script) action.powerShellCommands.push(script);
    currentScript = null;
  };

  for (let index = 1; index < lines.length; index += 1) {
    const line = lines[index];

    if (mode === "powershellBlock") {
      if (line.startsWith("        ")) {
        currentScript?.push(line.slice(8));
        continue;
      }
      flushScript();
      mode = "powershell";
    }

    if (mode === "registryChanges" || mode === "serviceChanges" || mode === "bcdChanges" || mode === "powerChanges" || mode === "tasks") {
      if (line.startsWith("      - ")) {
        flushObject();
        currentObject = {};
        assignChangeField(currentObject, line.slice(8));
        continue;
      }
      if (line.startsWith("        ")) {
        if (!currentObject) currentObject = {};
        assignChangeField(currentObject, line.slice(8));
        continue;
      }
      flushObject();
      mode = "";
    }

    if (mode === "blockedProfiles" || mode === "tags" || mode === "packages") {
      if (line.startsWith("      - ")) {
        const value = stripQuotes(line.slice(8).trim());
        if (mode === "blockedProfiles") action.blockedProfiles.push(value);
        if (mode === "tags") action.tags.push(value);
        if (mode === "packages") action.packages.push(value);
        continue;
      }
      mode = "";
    }

    if (mode === "powershell") {
      if (line.startsWith("      - |")) {
        flushScript();
        currentScript = [];
        mode = "powershellBlock";
        continue;
      }
      if (line.startsWith("      - ")) {
        action.powerShellCommands.push(stripQuotes(line.slice(8).trim()));
        continue;
      }
      mode = "";
    }

    if (line.startsWith("    name: ")) {
      action.name = stripQuotes(line.slice(10).trim());
      continue;
    }
    if (line.startsWith("    description: ")) {
      action.description = stripQuotes(line.slice(17).trim());
      continue;
    }
    if (line.startsWith("    rationale: ")) {
      action.rationale = stripQuotes(line.slice(15).trim());
      continue;
    }
    if (line.startsWith("    risk: ")) {
      action.risk = stripQuotes(line.slice(10).trim());
      continue;
    }
    if (line.startsWith("    tier: ")) {
      action.tier = stripQuotes(line.slice(10).trim());
      continue;
    }
    if (line.startsWith("    default: ")) {
      action.default = parseBoolean(line.slice(13), true);
      continue;
    }
    if (line.startsWith("    expertOnly: ")) {
      action.expertOnly = parseBoolean(line.slice(16), false);
      continue;
    }
    if (line.startsWith("    requiresReboot: ")) {
      action.requiresReboot = parseBoolean(line.slice(20), false);
      continue;
    }
    if (line.startsWith("    reversible: ")) {
      action.reversible = parseBoolean(line.slice(16), true);
      continue;
    }
    if (line.startsWith("    estimatedSeconds: ")) {
      action.estimatedSeconds = Number.parseInt(line.slice(22).trim(), 10) || 2;
      continue;
    }
    if (line.startsWith("    warningMessage: ")) {
      action.warningMessage = stripQuotes(line.slice(20).trim());
      continue;
    }
    if (line.startsWith("    minWindowsBuild: ")) {
      action.minWindowsBuild = Number.parseInt(line.slice(21).trim(), 10) || null;
      continue;
    }
    if (line.startsWith("    blockedProfiles: ")) {
      action.blockedProfiles = parseInlineArray(line.slice(20));
      continue;
    }
    if (line.startsWith("    blockedProfiles:")) {
      mode = "blockedProfiles";
      continue;
    }
    if (line.startsWith("    tags: ")) {
      action.tags = parseInlineArray(line.slice(10));
      continue;
    }
    if (line.startsWith("    tags:")) {
      mode = "tags";
      continue;
    }
    if (line.startsWith("    registryChanges:")) {
      action.executionKinds.push("registryChanges");
      mode = "registryChanges";
      currentObject = null;
      continue;
    }
    if (line.startsWith("    serviceChanges:")) {
      action.executionKinds.push("serviceChanges");
      mode = "serviceChanges";
      currentObject = null;
      continue;
    }
    if (line.startsWith("    bcdChanges:")) {
      action.executionKinds.push("bcdChanges");
      mode = "bcdChanges";
      currentObject = null;
      continue;
    }
    if (line.startsWith("    powerChanges:")) {
      action.executionKinds.push("powerChanges");
      mode = "powerChanges";
      currentObject = null;
      continue;
    }
    if (line.startsWith("    packages:")) {
      action.executionKinds.push("packages");
      mode = "packages";
      continue;
    }
    if (line.startsWith("    tasks:")) {
      action.executionKinds.push("tasks");
      mode = "tasks";
      currentObject = null;
      continue;
    }
    if (line.startsWith("    powerShellCommands:")) {
      action.executionKinds.push("powerShellCommands");
      mode = "powershell";
      continue;
    }
  }

  flushObject();
  flushScript();
  action.executionKinds = Array.from(new Set(action.executionKinds.filter((kind) => supportedExecutionKinds.includes(kind as never))));
  return action;
}

function parseModule(modulePath: string, phaseId: string, phaseName: string): ActionCatalogEntry[] {
  const text = fs.readFileSync(modulePath, "utf8");
  const moduleId = stripQuotes(text.match(/^module:\s*(.+)$/m)?.[1] ?? path.basename(modulePath, ".yaml"));
  const moduleName = stripQuotes(text.match(/^name:\s*"([^"]+)"/m)?.[1] ?? moduleId);
  const category = stripQuotes(text.match(/^category:\s*(.+)$/m)?.[1] ?? phaseId);
  const marker = "\nactions:\n";
  const actionStart = text.indexOf(marker);
  if (actionStart === -1) return [];

  const actionText = `\n${text.slice(actionStart + marker.length)}`;
  return actionText
    .split(/\n  - id: /)
    .slice(1)
    .map((chunk) => parseActionChunk(chunk.trimStart().replace(/^id: /, ""), {
      phaseId,
      phaseName,
      module: moduleId,
      moduleName,
      category,
    }));
}

export function loadPlaybookCatalog(): PlaybookCatalog {
  const manifestText = fs.readFileSync(manifestPath, "utf8");
  const manifest = parseManifest(manifestText);
  const catalog: PlaybookCatalog = {
    playbookName: manifest.playbookName,
    playbookVersion: manifest.playbookVersion,
    phases: [],
    actions: [],
    profiles: {},
  };

  for (const [profileId, ref] of Object.entries(manifest.profiles)) {
    catalog.profiles[profileId] = ref.overrides
      ? parseProfileOverride(path.join(playbookRoot, ref.overrides))
      : { blockedActions: [], optionalActions: [] };
  }

  for (const phase of manifest.phases) {
    if (phase.type === "builtin") continue;
    const phaseActions = phase.modules.flatMap((modulePath) => {
      const filePath = path.join(playbookRoot, modulePath);
      return fs.existsSync(filePath) ? parseModule(filePath, phase.id, phase.name) : [];
    });
    catalog.phases.push({ id: phase.id, name: phase.name, actions: phaseActions });
    catalog.actions.push(...phaseActions);
  }

  return catalog;
}

function buildStatusMap(playbook: ResolvedPlaybook): Map<string, { status: string; blockedReason: string | null }> {
  return new Map(
    playbook.phases.flatMap((phase) =>
      phase.actions.map((action) => [action.id, { status: action.status, blockedReason: action.blockedReason }]),
    ),
  );
}

function diffActionIds(left: ResolvedPlaybook, right: ResolvedPlaybook): string[] {
  const a = buildStatusMap(left);
  const b = buildStatusMap(right);
  const ids = new Set([...a.keys(), ...b.keys()]);
  return [...ids].filter((id) => {
    const leftStatus = a.get(id);
    const rightStatus = b.get(id);
    return leftStatus?.status !== rightStatus?.status || leftStatus?.blockedReason !== rightStatus?.blockedReason;
  }).sort();
}

function computePlanReboot(playbook: ResolvedPlaybook): boolean {
  return playbook.phases.some((phase) =>
    phase.actions.some((action) => action.status === "Included" && action.requiresReboot),
  );
}

function resolveQuestionScenario(key: keyof QuestionnaireAnswers): QuestionScenario {
  return QUESTION_SCENARIOS[key] ?? BASE_SCENARIO;
}

function resolveForAnswer<K extends keyof QuestionnaireAnswers>(
  key: K,
  value: QuestionnaireAnswers[K],
  scenario: QuestionScenario,
): ResolvedPlaybook {
  const answers: QuestionnaireAnswers = {
    ...DEFAULT_QUESTIONNAIRE_ANSWERS,
    aggressionPreset: scenario.aggressionPreset,
    [key]: value,
  };
  return applyDecisionOverrides(
    buildMockResolvedPlaybook(scenario.profile, scenario.preset, scenario.windowsBuild),
    answers,
  );
}

export function buildQuestionPlanDeltas(): QuestionPlanDelta[] {
  const deltas: QuestionPlanDelta[] = [];
  const booleanKeys = Object.keys(DEFAULT_QUESTIONNAIRE_ANSWERS).filter(
    (key) => !["aggressionPreset", "edgeBehavior", "telemetryLevel"].includes(key),
  ) as Array<Exclude<keyof QuestionnaireAnswers, "aggressionPreset" | "edgeBehavior" | "telemetryLevel">>;

  for (const key of booleanKeys) {
    const scenario = resolveQuestionScenario(key);
    const whenTrue = resolveForAnswer(key, true as QuestionnaireAnswers[typeof key], scenario);
    const whenFalse = resolveForAnswer(key, false as QuestionnaireAnswers[typeof key], scenario);
    deltas.push({
      questionKey: key,
      scenario,
      changedActionIds: diffActionIds(whenTrue, whenFalse),
      variants: [
        {
          value: true,
          totalIncluded: whenTrue.totalIncluded,
          totalBlocked: whenTrue.totalBlocked,
          totalOptional: whenTrue.totalOptional,
          requiresReboot: computePlanReboot(whenTrue),
        },
        {
          value: false,
          totalIncluded: whenFalse.totalIncluded,
          totalBlocked: whenFalse.totalBlocked,
          totalOptional: whenFalse.totalOptional,
          requiresReboot: computePlanReboot(whenFalse),
        },
      ],
    });
  }

  const edgeScenario = resolveQuestionScenario("edgeBehavior");
  const edgeVariants: EdgeBehavior[] = ["keep", "suppress", "suppress-and-freeze"];
  const edgePlans = edgeVariants.map((variant) => resolveForAnswer("edgeBehavior", variant, edgeScenario));
  deltas.push({
    questionKey: "edgeBehavior",
    scenario: edgeScenario,
    changedActionIds: Array.from(new Set(edgePlans.flatMap((plan, index) => index === 0 ? [] : diffActionIds(edgePlans[index - 1], plan)))).sort(),
    variants: edgeVariants.map((variant, index) => ({
      value: variant,
      totalIncluded: edgePlans[index].totalIncluded,
      totalBlocked: edgePlans[index].totalBlocked,
      totalOptional: edgePlans[index].totalOptional,
      requiresReboot: computePlanReboot(edgePlans[index]),
    })),
  });

  const telemetryScenario = resolveQuestionScenario("telemetryLevel");
  const telemetryVariants: TelemetryLevel[] = ["keep", "reduce", "aggressive"];
  const telemetryPlans = telemetryVariants.map((variant) => resolveForAnswer("telemetryLevel", variant, telemetryScenario));
  deltas.push({
    questionKey: "telemetryLevel",
    scenario: telemetryScenario,
    changedActionIds: Array.from(new Set(telemetryPlans.flatMap((plan, index) => index === 0 ? [] : diffActionIds(telemetryPlans[index - 1], plan)))).sort(),
    variants: telemetryVariants.map((variant, index) => ({
      value: variant,
      totalIncluded: telemetryPlans[index].totalIncluded,
      totalBlocked: telemetryPlans[index].totalBlocked,
      totalOptional: telemetryPlans[index].totalOptional,
      requiresReboot: computePlanReboot(telemetryPlans[index]),
    })),
  });

  const aggressionVariants: AggressionPreset[] = ["conservative", "balanced", "aggressive", "expert"];
  const aggressionPlans = aggressionVariants.map((variant) => applyDecisionOverrides(
    buildMockResolvedPlaybook(BASE_SCENARIO.profile, variant === "conservative" ? "conservative" : "aggressive" === variant || "expert" === variant ? "aggressive" : "balanced", BASE_SCENARIO.windowsBuild),
    { ...DEFAULT_QUESTIONNAIRE_ANSWERS, aggressionPreset: variant },
  ));
  deltas.push({
    questionKey: "aggressionPreset",
    scenario: BASE_SCENARIO,
    changedActionIds: Array.from(new Set(aggressionPlans.flatMap((plan, index) => index === 0 ? [] : diffActionIds(aggressionPlans[index - 1], plan)))).sort(),
    variants: aggressionVariants.map((variant, index) => ({
      value: variant,
      totalIncluded: aggressionPlans[index].totalIncluded,
      totalBlocked: aggressionPlans[index].totalBlocked,
      totalOptional: aggressionPlans[index].totalOptional,
      requiresReboot: computePlanReboot(aggressionPlans[index]),
    })),
  });

  return deltas;
}

export function buildQuestionActionIndex(): Map<string, QuestionActionEffect[]> {
  const questionDeltas = buildQuestionPlanDeltas();
  const effects = new Map<string, QuestionActionEffect[]>();

  for (const delta of questionDeltas) {
    const variantPlans = new Map<string | boolean, ResolvedPlaybook>();
    for (const variant of delta.variants) {
      if (delta.questionKey === "aggressionPreset") {
        const selected = variant.value as Exclude<AggressionPreset, null>;
        const preset = selected === "conservative" ? "conservative" : selected === "balanced" ? "balanced" : "aggressive";
        const plan = applyDecisionOverrides(
          buildMockResolvedPlaybook(delta.scenario.profile, preset, delta.scenario.windowsBuild),
          { ...DEFAULT_QUESTIONNAIRE_ANSWERS, aggressionPreset: selected },
        );
        variantPlans.set(variant.value, plan);
      } else {
        variantPlans.set(
          variant.value,
          resolveForAnswer(delta.questionKey as keyof QuestionnaireAnswers, variant.value as never, delta.scenario),
        );
      }
    }

    for (const actionId of delta.changedActionIds) {
      const answerStatuses = delta.variants.map((variant) => {
        const plan = variantPlans.get(variant.value)!;
        const state = buildStatusMap(plan).get(actionId);
        return {
          value: variant.value,
          status: state?.status ?? "Missing",
          blockedReason: state?.blockedReason ?? null,
        };
      });
      const effect: QuestionActionEffect = {
        questionKey: delta.questionKey,
        scenario: delta.scenario,
        answerStatuses,
        changesPlanReboot: new Set(delta.variants.map((variant) => variant.requiresReboot)).size > 1,
        changesPresetBehavior: delta.questionKey === "aggressionPreset",
      };
      const existing = effects.get(actionId) ?? [];
      existing.push(effect);
      effects.set(actionId, existing);
    }
  }

  return effects;
}

function expectedStateChangesForAction(action: ActionCatalogEntry): ExpectedStateChange[] {
  const changes: ExpectedStateChange[] = [];
  for (const change of action.registryChanges) {
    changes.push({
      kind: "registry",
      target: `${change.hive}\\${change.path}\\${change.valueName || "(Default)"}`,
      expected: `${String(change.value)} (${change.valueType})`,
    });
  }
  for (const change of action.serviceChanges) {
    changes.push({
      kind: "service",
      target: change.name,
      expected: change.startupType,
    });
  }
  for (const task of action.tasks) {
    changes.push({
      kind: "task",
      target: `${task.path}${task.name}`,
      expected: task.action,
    });
  }
  for (const pkg of action.packages) {
    changes.push({
      kind: "package",
      target: pkg,
      expected: "removed",
    });
  }
  for (const change of action.bcdChanges) {
    changes.push({
      kind: "bcd",
      target: change.element,
      expected: change.newValue,
    });
  }
  for (const change of action.powerChanges) {
    changes.push({
      kind: "power",
      target: change.settingPath,
      expected: change.newValue,
    });
  }
  for (const command of action.powerShellCommands) {
    changes.push({
      kind: "powershell",
      target: action.actionId,
      expected: command.split("\n")[0]?.trim() ?? action.actionId,
    });
  }
  return changes;
}

function readbackMethodsForAction(action: ActionCatalogEntry): ReadbackMethod[] {
  const methods: ReadbackMethod[] = [];
  for (const change of action.registryChanges) {
    methods.push({
      kind: "registry",
      detail: `Read ${change.hive}\\${change.path}\\${change.valueName || "(Default)"} and compare to ${String(change.value)}.`,
    });
  }
  for (const change of action.serviceChanges) {
    methods.push({
      kind: "service",
      detail: `Read Win32_Service start mode for ${change.name} and confirm ${change.startupType}.`,
    });
  }
  for (const task of action.tasks) {
    methods.push({
      kind: "task",
      detail: `Read scheduled task ${task.path}${task.name} and confirm it is disabled.`,
    });
  }
  for (const pkg of action.packages) {
    methods.push({
      kind: "package",
      detail: `Query AppX package presence for ${pkg} across installed and provisioned packages.`,
    });
  }
  for (const change of action.bcdChanges) {
    methods.push({
      kind: "bcd",
      detail: `Read bcdedit current entry ${change.element} and compare to ${change.newValue}.`,
    });
  }
  for (const change of action.powerChanges) {
    methods.push({
      kind: "power",
      detail: `Read powercfg current setting ${change.settingPath} and compare to ${change.newValue}.`,
    });
  }
  if (action.powerShellCommands.length > 0) {
    if (["appx.remove-edge", "appx.remove-edge-webview", "network.disable-offloading", "network.tcp-autotuning-normal", "memory.disable-compression", "privacy.block-app-reprovisioning"].includes(action.actionId)) {
      methods.push({
        kind: "powershell-specialized",
        detail: `Run action-specific readback for ${action.actionId}.`,
      });
    } else {
      methods.push({
        kind: "powershell",
        detail: `No generic PowerShell readback exists; this action needs an explicit verifier.`,
      });
    }
  }
  return methods;
}

function matchesPattern(pattern: string, actionId: string): boolean {
  return pattern.endsWith(".*") ? actionId.startsWith(pattern.slice(0, -2)) : pattern === actionId;
}

function profileRuleHits(actionId: string, profiles: Record<string, ProfileRuleSet>): string[] {
  const hits: string[] = [];
  for (const [profile, rules] of Object.entries(profiles)) {
    if (rules.blockedActions.some((pattern) => matchesPattern(pattern, actionId))) {
      hits.push(profile);
    }
  }
  return hits.sort();
}

function hasUnknownPlaceholder(action: ActionCatalogEntry): boolean {
  return action.registryChanges.some((change) =>
    change.path.includes("<") &&
    !supportedRegistryPlaceholders.some((token) => change.path.includes(token)),
  );
}

function classifyVerificationTier(action: ActionCatalogEntry): VerificationTier {
  if (
    action.phaseId === "shell" ||
    action.phaseId === "privacy" ||
    action.phaseId === "personalization" ||
    action.actionId.startsWith("appx.disable-edge") ||
    action.actionId.startsWith("appx.remove-edge") ||
    action.actionId.startsWith("services.disable-remote") ||
    action.actionId.startsWith("services.disable-print")
  ) {
    return "tier1";
  }
  if (
    action.phaseId === "services" ||
    action.phaseId === "tasks" ||
    action.phaseId === "startup-shutdown" ||
    action.actionId.startsWith("privacy.disable-telemetry") ||
    action.actionId.startsWith("storage.disable-indexing")
  ) {
    return "tier2";
  }
  return "tier3";
}

function classifyProofStatus(action: ActionCatalogEntry): { status: VerificationProofStatus; reason: string } {
  if (hasUnknownPlaceholder(action)) {
    return {
      status: "legacy / weak / needs redesign",
      reason: "This action still depends on an unknown placeholder-backed target path with no resolver.",
    };
  }
  if (action.powerShellCommands.length > 0 && action.executionKinds.length === 1) {
    const special = ["appx.remove-edge", "appx.remove-edge-webview", "network.disable-offloading", "network.tcp-autotuning-normal", "memory.disable-compression", "privacy.block-app-reprovisioning"];
    if (!special.includes(action.actionId)) {
      return {
        status: "executable but readback not yet implemented",
        reason: "Pure PowerShell action with no generic state reader and no action-specific verifier.",
      };
    }
  }
  if (!action.reversible && (action.packages.length > 0 || action.actionId.startsWith("appx.remove-edge"))) {
    return {
      status: "not safely machine-verifiable yet",
      reason: "Apply state can be read back, but automated rollback is intentionally not available for this irreversible removal.",
    };
  }
  if (action.requiresReboot) {
    return {
      status: "requires reboot to verify fully",
      reason: "Immediate readback is possible, but full trust for this action still requires a post-reboot assertion.",
    };
  }
  if (action.expertOnly) {
    return {
      status: "expert-only / intentionally not broadly verified yet",
      reason: "Action is gated behind expert mode; verification exists, but broad consumer proof should stay narrower by default.",
    };
  }
  return {
    status: "partially verified on real Windows",
    reason: "This action has a defined readback and rollback strategy, but consumer-Windows certification still depends on running the harness.",
  };
}

export function buildActionVerificationMatrix(catalog = loadPlaybookCatalog()): ActionVerificationMatrixEntry[] {
  const questionIndex = buildQuestionActionIndex();
  return catalog.actions.map((action) => {
    const profileHits = profileRuleHits(action.actionId, catalog.profiles);
    const proof = classifyProofStatus(action);
    return {
      actionId: action.actionId,
      name: action.name,
      phaseId: action.phaseId,
      phaseName: action.phaseName,
      module: action.module,
      category: action.category,
      risk: action.risk,
      expertOnly: action.expertOnly,
      requiresReboot: action.requiresReboot,
      reversible: action.reversible,
      executionKinds: action.executionKinds,
      verificationTier: classifyVerificationTier(action),
      expectedStateChanges: expectedStateChangesForAction(action),
      readbackMethods: readbackMethodsForAction(action),
      rollbackMethod: action.reversible
        ? "Restore the snapshot captured immediately before apply, then read back the same targets and compare against baseline."
        : "Rollback is manual or external for this action; the harness records the honest limitation.",
      profileRestrictions: {
        blockedProfiles: [...action.blockedProfiles].sort(),
        profileRuleHits: profileHits,
      },
      questionDependencies: questionIndex.get(action.actionId) ?? [],
      currentProofStatus: action.blockedProfiles.length > 0 && proof.status === "partially verified on real Windows"
        ? "blocked by profile by design"
        : proof.status,
      currentProofReason: action.blockedProfiles.length > 0 && proof.status === "partially verified on real Windows"
        ? `This action is intentionally blocked on ${action.blockedProfiles.join(", ")} profile(s); harness proof focuses on the profiles that can legally include it.`
        : proof.reason,
    };
  }).sort((left, right) => left.actionId.localeCompare(right.actionId));
}

export function buildSelectedQuestionDeltas(
  answers: QuestionnaireAnswers,
  matrix: ActionVerificationMatrixEntry[],
): SelectedQuestionDelta[] {
  const selected: SelectedQuestionDelta[] = [];
  const questionKeys = Object.keys(answers) as Array<keyof QuestionnaireAnswers>;
  for (const key of questionKeys) {
    const selectedValue = answers[key];
    if (selectedValue === null) continue;
    const matching = matrix.flatMap((entry) =>
      entry.questionDependencies
        .filter((effect) => effect.questionKey === key)
        .map((effect) => ({ entry, effect })),
    );
    const includedActions = matching
      .filter(({ effect }) => effect.answerStatuses.some((status) => status.value === selectedValue && status.status === "Included"))
      .map(({ entry }) => entry.actionId)
      .sort();
    const blockedActions = matching
      .filter(({ effect }) => effect.answerStatuses.some((status) => status.value === selectedValue && (status.status === "Blocked" || status.status === "BuildGated")))
      .map(({ entry }) => entry.actionId)
      .sort();
    const optionalActions = matching
      .filter(({ effect }) => effect.answerStatuses.some((status) => status.value === selectedValue && status.status === "Optional"))
      .map(({ entry }) => entry.actionId)
      .sort();
    const sample = matching[0]?.effect;
    selected.push({
      questionKey: key,
      selectedValue,
      scenario: sample?.scenario ?? resolveQuestionScenario(key),
      includedActions,
      blockedActions,
      optionalActions,
      changesPlanReboot: matching.some(({ effect }) => effect.changesPlanReboot),
    });
  }
  return selected.sort((left, right) => String(left.questionKey).localeCompare(String(right.questionKey)));
}

export function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

export function writeJson(filePath: string, value: unknown): void {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

export function writeMatrixMarkdown(filePath: string, matrix: ActionVerificationMatrixEntry[]): void {
  const lines: string[] = [];
  lines.push("# redcore OS Action Verification Matrix");
  lines.push("");
  lines.push("| Action ID | Tier | Proof Status | Readback | Rollback |");
  lines.push("| --- | --- | --- | --- | --- |");
  for (const entry of matrix) {
    const readback = entry.readbackMethods.map((method) => method.kind).join(", ");
    lines.push(`| ${entry.actionId} | ${entry.verificationTier} | ${entry.currentProofStatus} | ${readback || "none"} | ${entry.reversible ? "snapshot" : "manual"} |`);
  }
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`);
}

export function parseArgs(argv: string[]): Record<string, string | boolean> {
  const parsed: Record<string, string | boolean> = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) continue;
    const [rawKey, inlineValue] = arg.slice(2).split("=", 2);
    if (inlineValue !== undefined) {
      parsed[rawKey] = inlineValue;
      continue;
    }
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      parsed[rawKey] = true;
      continue;
    }
    parsed[rawKey] = next;
    index += 1;
  }
  return parsed;
}

export function loadAnswers(answersPath?: string): QuestionnaireAnswers {
  if (!answersPath) {
    return {
      ...DEFAULT_QUESTIONNAIRE_ANSWERS,
      aggressionPreset: "balanced",
      highPerformancePlan: true,
      optimizeThreadPriority: true,
      globalTimerResolution: true,
      disableGameDvr: true,
      disableFullscreenOptimizations: true,
      stripSearchWebNoise: true,
      edgeBehavior: "suppress",
      disableCopilot: true,
      disableAiApps: true,
      telemetryLevel: "reduce",
      disableClipboardHistory: true,
      disableActivityFeed: true,
      disableTailoredExperiences: true,
      restoreClassicContextMenu: true,
      enableEndTask: true,
      disableBackgroundApps: true,
      disableAutomaticMaintenance: true,
      enableGameMode: true,
      disableTransparency: true,
    };
  }
  return {
    ...DEFAULT_QUESTIONNAIRE_ANSWERS,
    ...JSON.parse(fs.readFileSync(answersPath, "utf8")),
  };
}

function normalizeValueForCompare(value: unknown): string {
  if (value === null || value === undefined) return "<missing>";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function runPowerShell(script: string): { success: boolean; stdout: string; stderr: string } {
  const result = spawnSync("powershell.exe", [
    "-NoProfile",
    "-NonInteractive",
    "-ExecutionPolicy",
    "Bypass",
    "-Command",
    script,
  ], {
    encoding: "utf8",
  });

  return {
    success: result.status === 0,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

function runPowerShellJson(script: string): unknown {
  const wrapped = `${script} | ConvertTo-Json -Compress -Depth 10`;
  const result = runPowerShell(wrapped);
  if (!result.success) {
    throw new Error(result.stderr.trim() || "PowerShell command failed");
  }
  const trimmed = result.stdout.trim();
  return trimmed ? JSON.parse(trimmed) : null;
}

function psString(value: string): string {
  return value.replace(/'/g, "''");
}

export function resolveRegistryTargets(change: RegistryChangeDefinition): string[] {
  if (!process.platform.startsWith("win")) {
    return [`${change.hive}\\${change.path}`];
  }
  if (!change.path.includes("<")) {
    return [`${change.hive}\\${change.path}`];
  }
  const token = /<Interface GUID>|<Adapter Index>|<GPU Device ID>\\<Instance>|<device>\\<instance>/.exec(change.path)?.[0];
  if (!token) return [`${change.hive}\\${change.path}`];

  const replacements = (() => {
    if (token === "<Interface GUID>") {
      return runPowerShellJson("\
        Get-NetAdapter | Where-Object { $_.Status -eq 'Up' -and $_.HardwareInterface -eq $true -and $_.InterfaceDescription -notmatch 'Virtual|Hyper-V|VPN|Loopback' } | \
        Select-Object -ExpandProperty InterfaceGuid | ForEach-Object { $guid = [string]$_; if ($guid -and -not $guid.StartsWith('{')) { '{' + $guid.Trim('{}') + '}' } else { $guid } }") as string[];
    }
    if (token === "<Adapter Index>") {
      return runPowerShellJson("\
        $wanted = Get-NetAdapter | Where-Object { $_.Status -eq 'Up' -and $_.HardwareInterface -eq $true -and $_.InterfaceDescription -notmatch 'Virtual|Hyper-V|VPN|Loopback' } | \
          Select-Object -ExpandProperty InterfaceGuid | ForEach-Object { ([string]$_).Trim('{}') }; \
        $classRoot = 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Class\\{4d36e972-e325-11ce-bfc1-08002be10318}'; \
        @(foreach ($key in Get-ChildItem $classRoot -ErrorAction SilentlyContinue) { $props = Get-ItemProperty $key.PSPath -ErrorAction SilentlyContinue; $instance = [string]$props.NetCfgInstanceId; if ($instance -and ($wanted -contains $instance.Trim('{}'))) { $key.PSChildName } })") as string[];
    }
    if (token === "<GPU Device ID>\\<Instance>") {
      return runPowerShellJson("Get-CimInstance Win32_VideoController | Select-Object -ExpandProperty PNPDeviceID | Where-Object { $_ -like 'PCI\\\\*' } | ForEach-Object { $_.Substring(4) }") as string[];
    }
    return runPowerShellJson("Get-CimInstance Win32_DiskDrive | Select-Object -ExpandProperty PNPDeviceID | Where-Object { $_ -like 'SCSI\\\\*' } | ForEach-Object { $_.Substring(5) }") as string[];
  })();

  const values = Array.isArray(replacements) ? replacements : [String(replacements)];
  return values.map((replacement) => `${change.hive}\\${change.path.replace(token, replacement)}`);
}

function readRegistryValue(target: string, valueName: string): RegistryReadback {
  const valueKey = valueName || "(Default)";
  const psName = `'${psString(valueKey)}'`;
  const script = `\
    try { \
      $item = Get-ItemProperty -Path 'Registry::${psString(target)}' -Name ${psName} -ErrorAction Stop; \
      $raw = $item.PSObject.Properties[${psName}].Value; \
      [pscustomobject]@{ exists = $true; currentValue = if ($null -eq $raw) { '' } else { $raw } } \
    } catch { \
      [pscustomobject]@{ exists = $false; currentValue = $null } \
    }`;
  return runPowerShellJson(script) as RegistryReadback;
}

function readServiceState(serviceName: string): { exists: boolean; startMode: string | null; state: string | null } {
  const script = `\
    $svc = Get-CimInstance Win32_Service -Filter "Name='${psString(serviceName)}'" -ErrorAction SilentlyContinue; \
    if ($svc) { [pscustomobject]@{ exists = $true; startMode = [string]$svc.StartMode; state = [string]$svc.State } } \
    else { [pscustomobject]@{ exists = $false; startMode = $null; state = $null } }`;
  return runPowerShellJson(script) as { exists: boolean; startMode: string | null; state: string | null };
}

function readTaskState(task: TaskChangeDefinition): { exists: boolean; state: string | null } {
  const script = `\
    $task = Get-ScheduledTask -TaskName '${psString(task.name)}' -TaskPath '${psString(task.path)}' -ErrorAction SilentlyContinue; \
    if ($task) { [pscustomobject]@{ exists = $true; state = [string]$task.State } } \
    else { [pscustomobject]@{ exists = $false; state = $null } }`;
  return runPowerShellJson(script) as { exists: boolean; state: string | null };
}

function readPackageState(packageName: string): { installedCount: number; provisionedCount: number } {
  const script = `\
    $installed = @(Get-AppxPackage -AllUsers -Name '${psString(packageName)}' -ErrorAction SilentlyContinue).Count; \
    $provisioned = @(Get-AppxProvisionedPackage -Online -ErrorAction SilentlyContinue | Where-Object { $_.PackageName -like '*${psString(packageName)}*' }).Count; \
    [pscustomobject]@{ installedCount = $installed; provisionedCount = $provisioned }`;
  return runPowerShellJson(script) as { installedCount: number; provisionedCount: number };
}

function readBcdValue(element: string): string | null {
  const result = runPowerShell(`(bcdedit /enum {current} 2>$null | Select-String -Pattern '${psString(element)}').Line`);
  if (!result.success) return null;
  const line = result.stdout.trim();
  if (!line) return null;
  return line.split(/\s+/).pop() ?? null;
}

function readPowerValue(settingPath: string): string | null {
  const [subGroup, setting] = settingPath.split("/");
  if (!subGroup || !setting) return null;
  const result = runPowerShell(`powercfg /query SCHEME_CURRENT ${subGroup} ${setting}`);
  if (!result.success) return null;
  for (const line of result.stdout.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.startsWith("Current AC Power Setting Index:")) {
      return trimmed.split(":").at(-1)?.trim() ?? null;
    }
  }
  return null;
}

function runSpecialReadback(action: ActionCatalogEntry): VerificationCheckResult[] {
  if (action.actionId === "network.tcp-autotuning-normal") {
    const result = runPowerShell("netsh interface tcp show global");
    const actual = result.stdout.match(/Receive Window Auto-Tuning Level\s*:\s*(.+)$/im)?.[1]?.trim() ?? "<unknown>";
    return [{
      kind: "powershell-specialized",
      target: action.actionId,
      expected: "normal",
      actual,
      status: /normal/i.test(actual) ? "pass" : "fail",
    }];
  }
  if (action.actionId === "memory.disable-compression") {
    const actual = runPowerShellJson("Get-MMAgent | Select-Object -ExpandProperty MemoryCompression");
    return [{
      kind: "powershell-specialized",
      target: action.actionId,
      expected: "False",
      actual: normalizeValueForCompare(actual),
      status: actual === false ? "pass" : "fail",
    }];
  }
  if (action.actionId === "privacy.block-app-reprovisioning") {
    const keyState = runPowerShellJson("Test-Path 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Appx\\AppxAllUserStore\\Deprovisioned'");
    return [{
      kind: "powershell-specialized",
      target: "HKLM\\...\\Deprovisioned",
      expected: "exists",
      actual: keyState === true ? "exists" : "missing",
      status: keyState === true ? "pass" : "fail",
    }];
  }
  if (action.actionId === "appx.remove-edge") {
    const edgeBase = process.env["ProgramFiles(x86)"] ?? "C:\\Program Files (x86)";
    const edgePath = psString(`${edgeBase}\\Microsoft\\Edge\\Application`);
    const exists = runPowerShellJson("\
      [pscustomobject]@{ \
        edgePath = Test-Path '" + edgePath + "'; \
        appxCount = @(Get-AppxPackage -AllUsers *MicrosoftEdge* -ErrorAction SilentlyContinue).Count \
      }") as { edgePath: boolean; appxCount: number };
    return [{
      kind: "powershell-specialized",
      target: action.actionId,
      expected: "Edge removed",
      actual: `path=${exists.edgePath} appx=${exists.appxCount}`,
      status: exists.edgePath === false && exists.appxCount === 0 ? "pass" : "fail",
    }];
  }
  if (action.actionId === "appx.remove-edge-webview") {
    const webviewBase = process.env["ProgramFiles(x86)"] ?? "C:\\Program Files (x86)";
    const webviewPath = psString(`${webviewBase}\\Microsoft\\EdgeWebView\\Application`);
    const exists = runPowerShellJson("\
      [pscustomobject]@{ \
        webviewPath = Test-Path '" + webviewPath + "'; \
        appxCount = @(Get-AppxPackage -AllUsers *WebView* -ErrorAction SilentlyContinue).Count \
      }") as { webviewPath: boolean; appxCount: number };
    return [{
      kind: "powershell-specialized",
      target: action.actionId,
      expected: "WebView removed",
      actual: `path=${exists.webviewPath} appx=${exists.appxCount}`,
      status: exists.webviewPath === false && exists.appxCount === 0 ? "pass" : "fail",
    }];
  }
  if (action.actionId === "network.disable-offloading") {
    const result = runPowerShellJson("\
      $adapter = Get-NetAdapter | Where-Object { $_.Status -eq 'Up' -and $_.HardwareInterface -eq $true -and $_.InterfaceDescription -notmatch 'Virtual|Hyper-V|VPN|Loopback' } | Select-Object -First 1; \
      if (-not $adapter) { [pscustomobject]@{ adapter = $null; disabled = 0; total = 0 } } \
      else { \
        $props = Get-NetAdapterAdvancedProperty -Name $adapter.Name -ErrorAction SilentlyContinue | Where-Object { $_.DisplayName -in @('Flow Control','IPv4 Checksum Offload','TCP Checksum Offload (IPv4)','UDP Checksum Offload (IPv4)','Large Send Offload V2 (IPv4)','Large Send Offload V2 (IPv6)','Energy-Efficient Ethernet','Green Ethernet','Power Saving Mode','Wake on Magic Packet','Wake on Pattern Match') }; \
        $disabled = @($props | Where-Object { $_.DisplayValue -eq 'Disabled' }).Count; \
        [pscustomobject]@{ adapter = $adapter.Name; disabled = $disabled; total = @($props).Count } \
      }") as { adapter: string | null; disabled: number; total: number };
    return [{
      kind: "powershell-specialized",
      target: result.adapter ?? action.actionId,
      expected: "adapter offload settings disabled",
      actual: `${result.disabled}/${result.total} visible properties disabled`,
      status: result.total > 0 && result.disabled === result.total ? "pass" : result.total > 0 && result.disabled > 0 ? "partial" : "skip",
      reason: result.total === 0 ? "No matching adapter properties exposed by this NIC." : undefined,
    }];
  }
  return [{
    kind: "powershell",
    target: action.actionId,
    expected: "explicit verifier",
    actual: "not implemented",
    status: "skip",
    reason: "No action-specific readback exists yet.",
  }];
}

export function captureActionState(action: ActionCatalogEntry): VerificationCheckResult[] {
  if (!process.platform.startsWith("win")) {
    return [{
      kind: "environment",
      target: action.actionId,
      expected: "Windows",
      actual: process.platform,
      status: "skip",
      reason: "Runtime readback only works on Windows.",
    }];
  }

  const results: VerificationCheckResult[] = [];

  for (const change of action.registryChanges) {
    for (const target of resolveRegistryTargets(change)) {
      const actual = readRegistryValue(target, change.valueName);
      results.push({
        kind: "registry",
        target: `${target}\\${change.valueName || "(Default)"}`,
        expected: normalizeValueForCompare(change.value),
        actual: actual.exists ? normalizeValueForCompare(actual.currentValue) : "<missing>",
        status: "skip",
      });
    }
  }

  for (const change of action.serviceChanges) {
    const actual = readServiceState(change.name);
    results.push({
      kind: "service",
      target: change.name,
      expected: change.startupType,
      actual: actual.exists ? `${actual.startMode ?? "<unknown>"} / ${actual.state ?? "<unknown>"}` : "<missing>",
      status: "skip",
    });
  }

  for (const task of action.tasks) {
    const actual = readTaskState(task);
    results.push({
      kind: "task",
      target: `${task.path}${task.name}`,
      expected: "Disabled",
      actual: actual.exists ? (actual.state ?? "<unknown>") : "<missing>",
      status: "skip",
    });
  }

  for (const pkg of action.packages) {
    const actual = readPackageState(pkg);
    results.push({
      kind: "package",
      target: pkg,
      expected: "0 installed / 0 provisioned",
      actual: `${actual.installedCount} installed / ${actual.provisionedCount} provisioned`,
      status: "skip",
    });
  }

  for (const change of action.bcdChanges) {
    const actual = readBcdValue(change.element);
    results.push({
      kind: "bcd",
      target: change.element,
      expected: change.newValue,
      actual: normalizeValueForCompare(actual),
      status: "skip",
    });
  }

  for (const change of action.powerChanges) {
    const actual = readPowerValue(change.settingPath);
    results.push({
      kind: "power",
      target: change.settingPath,
      expected: change.newValue,
      actual: normalizeValueForCompare(actual),
      status: "skip",
    });
  }

  if (action.powerShellCommands.length > 0) {
    results.push(...runSpecialReadback(action));
  }

  return results;
}

export function evaluateReadback(action: ActionCatalogEntry, checks: VerificationCheckResult[]): VerificationCheckResult[] {
  return checks.map((check) => {
    if (check.kind === "registry") {
      return {
        ...check,
        status: check.actual === check.expected ? "pass" : "fail",
      };
    }
    if (check.kind === "service") {
      return {
        ...check,
        status: check.actual.toLowerCase().includes(check.expected.toLowerCase()) ? "pass" : "fail",
      };
    }
    if (check.kind === "task") {
      return {
        ...check,
        status: check.actual.toLowerCase().includes("disabled") ? "pass" : "fail",
      };
    }
    if (check.kind === "package") {
      return {
        ...check,
        status: check.actual === check.expected ? "pass" : "fail",
      };
    }
    if (check.kind === "bcd" || check.kind === "power") {
      return {
        ...check,
        status: check.actual.toLowerCase().includes(String(check.expected).toLowerCase()) ? "pass" : "fail",
      };
    }
    if (check.kind === "powershell" || check.kind === "powershell-specialized") {
      return check;
    }
    return {
      ...check,
      status: "skip",
    };
  });
}

export function evaluateRollback(before: VerificationCheckResult[], after: VerificationCheckResult[]): VerificationCheckResult[] {
  const afterMap = new Map(after.map((check) => [check.target, check]));
  return before.map((baseline) => {
    const current = afterMap.get(baseline.target);
    if (!current) {
      return {
        ...baseline,
        actual: "<missing>",
        status: "fail",
        reason: "Rollback readback target missing.",
      };
    }
    return {
      ...baseline,
      actual: current.actual,
      status: current.actual === baseline.actual ? "pass" : "fail",
    };
  });
}

function evaluatePreservedState(before: VerificationCheckResult[], after: VerificationCheckResult[]): VerificationCheckResult[] {
  const afterMap = new Map(after.map((check) => [check.target, check]));
  return before.map((baseline) => {
    const current = afterMap.get(baseline.target);
    if (!current) {
      return {
        ...baseline,
        actual: "<missing>",
        status: "fail",
        reason: "Blocked-action readback target missing after apply.",
      };
    }
    const machineReadableKinds = new Set(["registry", "service", "task", "package", "bcd", "power"]);
    if (!machineReadableKinds.has(baseline.kind)) {
      return {
        ...baseline,
        actual: current.actual,
        status: "skip",
        reason: baseline.reason ?? "No machine-readable blocked-state assertion exists for this target.",
      };
    }
    return {
      ...baseline,
      actual: current.actual,
      status: current.actual === baseline.actual ? "pass" : "fail",
    };
  });
}

function summarizeChecks(checks: VerificationCheckResult[]): "pass" | "fail" | "partial" | "skip" {
  if (checks.length === 0) return "skip";
  const passCount = checks.filter((check) => check.status === "pass").length;
  const failCount = checks.filter((check) => check.status === "fail").length;
  const partialCount = checks.filter((check) => check.status === "partial").length;
  if (failCount === 0 && partialCount === 0 && passCount === checks.length) return "pass";
  if (passCount === 0 && partialCount === 0) return "fail";
  return "partial";
}

export function readWindowsBuild(): number {
  if (!process.platform.startsWith("win")) return 22631;
  const raw = runPowerShell("(Get-ItemProperty 'HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion').CurrentBuild");
  return Number.parseInt(raw.stdout.trim(), 10) || 22631;
}

class RpcClient {
  private readonly process: ChildProcessWithoutNullStreams;
  private readonly pending = new Map<number, { resolve: (value: Record<string, unknown>) => void; reject: (error: Error) => void; timer: NodeJS.Timeout }>();
  private nextId = 1;

  constructor(private readonly serviceExe: string) {
    this.process = spawn(serviceExe, [], { stdio: ["pipe", "pipe", "pipe"] });
    const reader = createInterface({ input: this.process.stdout });
    reader.on("line", (line) => {
      try {
        const payload = JSON.parse(line) as ServiceResponse;
        const pending = this.pending.get(payload.id);
        if (!pending) return;
        clearTimeout(pending.timer);
        this.pending.delete(payload.id);
        if (payload.error?.message) {
          pending.reject(new Error(payload.error.message));
          return;
        }
        pending.resolve((payload.result ?? {}) as Record<string, unknown>);
      } catch (error) {
        // Ignore malformed stderr-adjacent output from the service.
        console.warn("[verification] Ignoring non-JSON RPC line", error);
      }
    });
  }

  async call(method: string, params: Record<string, unknown>, timeoutMs = 30000): Promise<Record<string, unknown>> {
    const id = this.nextId++;
    const payload = JSON.stringify({ id, method, params });
    return await new Promise<Record<string, unknown>>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`RPC timeout for ${method}`));
      }, timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      this.process.stdin.write(`${payload}\n`);
    });
  }

  async close(): Promise<void> {
    this.process.kill();
  }
}

function findServiceExecutable(explicitPath?: string): string {
  const candidates = [
    explicitPath,
    path.join(repoRoot, "services", "os-service", "target", "debug", "redcore-os-service.exe"),
    path.join(repoRoot, "services", "os-service", "target", "release", "redcore-os-service.exe"),
  ].filter(Boolean) as string[];

  const match = candidates.find((candidate) => fs.existsSync(candidate));
  if (!match) {
    throw new Error("redcore-os-service.exe not found. Build services/os-service on Windows first.");
  }
  return match;
}

function filterActionsByPriority(actions: ActionCatalogEntry[], priority: string): ActionCatalogEntry[] {
  if (priority === "all") return actions;
  return actions.filter((action) => classifyVerificationTier(action) === priority);
}

function capturePersonalizationState(): VerificationCheckResult[] {
  const checks: VerificationCheckResult[] = [];
  const definitions: Array<{ target: string; hive: string; path: string; valueName: string; expected: string }> = [
    { target: "dark.apps", hive: "HKCU", path: "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize", valueName: "AppsUseLightTheme", expected: "0" },
    { target: "dark.system", hive: "HKCU", path: "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize", valueName: "SystemUsesLightTheme", expected: "0" },
    { target: "accent.color", hive: "HKCU", path: "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Accent", valueName: "AccentColorMenu", expected: "4924904" },
    { target: "accent.start", hive: "HKCU", path: "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Accent", valueName: "StartColorMenu", expected: "4924904" },
    { target: "accent.prevalence", hive: "HKCU", path: "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize", valueName: "ColorPrevalence", expected: "1" },
    { target: "accent.dwm", hive: "HKCU", path: "SOFTWARE\\Microsoft\\Windows\\DWM", valueName: "ColorizationColor", expected: "3293259240" },
    { target: "accent.afterglow", hive: "HKCU", path: "SOFTWARE\\Microsoft\\Windows\\DWM", valueName: "ColorizationAfterglow", expected: "3293259240" },
    { target: "taskbar.taskview", hive: "HKCU", path: "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced", valueName: "ShowTaskViewButton", expected: "0" },
    { target: "taskbar.searchbox", hive: "HKCU", path: "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Search", valueName: "SearchboxTaskbarMode", expected: "1" },
    { target: "taskbar.widgets", hive: "HKCU", path: "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced", valueName: "TaskbarDa", expected: "0" },
    { target: "taskbar.chat", hive: "HKCU", path: "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced", valueName: "TaskbarMn", expected: "0" },
    { target: "explorer.extensions", hive: "HKCU", path: "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced", valueName: "HideFileExt", expected: "0" },
    { target: "explorer.hidden", hive: "HKCU", path: "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced", valueName: "Hidden", expected: "1" },
    { target: "transparency", hive: "HKCU", path: "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize", valueName: "EnableTransparency", expected: "1" },
  ];

  for (const definition of definitions) {
    const readback = readRegistryValue(`${definition.hive}\\${definition.path}`, definition.valueName);
    checks.push({
      kind: "registry",
      target: definition.target,
      expected: definition.expected,
      actual: readback.exists ? normalizeValueForCompare(readback.currentValue) : "<missing>",
      status: "skip",
    });
  }

  const explorerRunning = runPowerShellJson("@(Get-Process explorer -ErrorAction SilentlyContinue).Count") as number;
  checks.push({
    kind: "shell",
    target: "explorer.process",
    expected: "running",
    actual: explorerRunning > 0 ? "running" : "stopped",
    status: "skip",
    reason: "Process liveness is the honest partial proxy for shell refresh; WM_SETTINGCHANGE broadcast itself is not directly machine-readable.",
  });

  return checks;
}

export async function runWindowsCertification(options: {
  answersPath?: string;
  outputDir: string;
  profile: string;
  preset: "conservative" | "balanced" | "aggressive";
  priority: "tier1" | "tier2" | "tier3" | "all";
  windowsBuild?: number;
  serviceExe?: string;
}): Promise<{
  summary: CertificationSummary;
  selectedQuestionDeltas: SelectedQuestionDelta[];
  actionResults: ActionRuntimeVerificationResult[];
  personalization: PersonalizationVerificationReport | null;
  blockedActions: Array<{ actionId: string; reason: string }>;
  blockedActionResults: BlockedActionVerificationResult[];
}> {
  if (!process.platform.startsWith("win")) {
    throw new Error("Consumer Windows certification must run on Windows.");
  }

  const windowsBuild = options.windowsBuild ?? readWindowsBuild();
  const answers = loadAnswers(options.answersPath);
  const catalog = loadPlaybookCatalog();
  const matrix = buildActionVerificationMatrix(catalog);
  const matrixById = new Map(matrix.map((entry) => [entry.actionId, entry]));
  const selectedQuestionDeltas = buildSelectedQuestionDeltas(answers, matrix);
  const serviceExe = findServiceExecutable(options.serviceExe);
  const client = new RpcClient(serviceExe);
  ensureDir(options.outputDir);

  const startedAt = new Date().toISOString();
  const basePlan = await client.call("playbook.resolve", {
    profile: options.profile,
    preset: options.preset,
    windowsBuild,
  });
  const resolvedPlaybook = applyDecisionOverrides(basePlan as unknown as ResolvedPlaybook, answers);
  const blockedActions = resolvedPlaybook.blockedReasons.map((entry) => ({
    actionId: entry.actionId,
    reason: entry.reason,
  }));
  const blockedActionResults: BlockedActionVerificationResult[] = [];

  writeJson(path.join(options.outputDir, "resolved-playbook.json"), resolvedPlaybook);
  writeJson(path.join(options.outputDir, "selected-question-deltas.json"), selectedQuestionDeltas);

  const includedIds = resolvedPlaybook.phases.flatMap((phase) =>
    phase.actions.filter((action) => action.status === "Included").map((action) => action.id),
  );
  const selectedCatalogActions = filterActionsByPriority(
    catalog.actions.filter((action) => includedIds.includes(action.actionId)),
    options.priority,
  );
  const blockedCatalogActions = filterActionsByPriority(
    catalog.actions.filter((action) => blockedActions.some((entry) => entry.actionId === action.actionId)),
    options.priority,
  );
  const blockedBaselines = new Map(
    blockedCatalogActions.map((action) => [action.actionId, captureActionState(action)]),
  );

  const actionResults: ActionRuntimeVerificationResult[] = [];
  for (const action of selectedCatalogActions) {
    const baseline = captureActionState(action);
    const execute = await client.call("execute.applyAction", { actionId: action.actionId });
    const readback = evaluateReadback(action, captureActionState(action));
    const rollback = {
      attempted: false,
      result: null as Record<string, unknown> | null,
      readback: [] as VerificationCheckResult[],
      status: "skip" as const,
      reason: undefined as string | undefined,
    };

    const snapshotId = typeof execute.snapshotId === "string" ? execute.snapshotId : null;
    if (action.reversible && snapshotId) {
      rollback.attempted = true;
      rollback.result = await client.call("rollback.restore", { snapshotId });
      rollback.readback = evaluateRollback(baseline, captureActionState(action));
      rollback.status = summarizeChecks(rollback.readback);
    } else {
      rollback.reason = action.reversible
        ? "No snapshotId was returned by execute.applyAction."
        : "This action is intentionally irreversible.";
    }

    actionResults.push({
      actionId: action.actionId,
      actionName: action.name,
      phaseName: action.phaseName,
      verificationTier: classifyVerificationTier(action),
      questionDependencies: matrixById.get(action.actionId)?.questionDependencies ?? [],
      baseline,
      execute,
      readback,
      readbackStatus: summarizeChecks(readback),
      rollback,
    });
  }

  const effectivePersonalization: PersonalizationPreferences & { wallpaper: boolean } = {
    ...resolveEffectivePersonalization(
      options.profile,
      getProfilePersonalizationDefaults(options.profile),
      answers,
    ),
    wallpaper: false,
  };

  const personalizationBaseline = capturePersonalizationState();
  const personalizationApply = await client.call("personalize.apply", {
    profile: options.profile,
    options: effectivePersonalization,
  });
  const personalizationReadback = capturePersonalizationState().map((check) => {
    if (check.kind === "shell") {
      return {
        ...check,
        status: check.actual === check.expected ? "pass" : "partial",
      };
    }
    return {
      ...check,
      status: check.actual === check.expected ? "pass" : "fail",
    };
  });

  const personalizationReport: PersonalizationVerificationReport = {
    baseline: personalizationBaseline,
    execute: personalizationApply,
    readback: personalizationReadback,
    readbackStatus: summarizeChecks(personalizationReadback),
    rollback: {
      attempted: false,
      result: null,
      readback: [],
      status: "skip",
      reason: "No personalization snapshot id was returned by personalize.apply.",
    },
  };

  const personalizationSnapshotId = typeof personalizationApply.snapshotId === "string" ? personalizationApply.snapshotId : null;
  if (personalizationSnapshotId) {
    personalizationReport.rollback.attempted = true;
    personalizationReport.rollback.result = await client.call("personalize.revert", { snapshotId: personalizationSnapshotId });
    personalizationReport.rollback.readback = evaluateRollback(personalizationBaseline, capturePersonalizationState());
    personalizationReport.rollback.status = summarizeChecks(personalizationReport.rollback.readback);
    delete personalizationReport.rollback.reason;
  }

  for (const action of blockedCatalogActions) {
    const baseline = blockedBaselines.get(action.actionId) ?? captureActionState(action);
    const afterApply = evaluatePreservedState(baseline, captureActionState(action));
    blockedActionResults.push({
      actionId: action.actionId,
      actionName: action.name,
      reason: blockedActions.find((entry) => entry.actionId === action.actionId)?.reason ?? "Blocked by profile or questionnaire",
      verificationTier: classifyVerificationTier(action),
      baseline,
      afterApply,
      status: summarizeChecks(afterApply),
    });
  }

  await client.close();

  const summary: CertificationSummary = {
    startedAt,
    finishedAt: new Date().toISOString(),
    host: {
      platform: os.platform(),
      release: os.release(),
      hostname: os.hostname(),
    },
    profile: options.profile,
    preset: options.preset,
    windowsBuild,
    priority: options.priority,
    selectedActionCount: actionResults.length,
    blockedActionCount: blockedActions.length,
    overallStatus: actionResults.some((entry) => entry.readbackStatus === "fail" || entry.rollback.status === "fail")
      || blockedActionResults.some((entry) => entry.status === "fail")
      ? "fail"
      : actionResults.some((entry) => entry.readbackStatus === "partial" || entry.rollback.status === "partial")
        || blockedActionResults.some((entry) => entry.status === "partial")
        ? "partial"
        : "pass",
    readbackPassCount: actionResults.filter((entry) => entry.readbackStatus === "pass").length,
    readbackFailCount: actionResults.filter((entry) => entry.readbackStatus === "fail").length,
    rollbackPassCount: actionResults.filter((entry) => entry.rollback.status === "pass").length,
    rollbackFailCount: actionResults.filter((entry) => entry.rollback.status === "fail").length,
    blockedPreservationPassCount: blockedActionResults.filter((entry) => entry.status === "pass").length,
    blockedPreservationFailCount: blockedActionResults.filter((entry) => entry.status === "fail").length,
  };

  writeJson(path.join(options.outputDir, "action-results.json"), actionResults);
  writeJson(path.join(options.outputDir, "blocked-action-results.json"), blockedActionResults);
  writeJson(path.join(options.outputDir, "personalization-report.json"), personalizationReport);
  writeJson(path.join(options.outputDir, "certification-summary.json"), summary);

  return {
    summary,
    selectedQuestionDeltas,
    actionResults,
    personalization: personalizationReport,
    blockedActions,
    blockedActionResults,
  };
}
