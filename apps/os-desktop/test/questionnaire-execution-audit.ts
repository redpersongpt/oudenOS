import {
  DEFAULT_QUESTIONNAIRE_ANSWERS,
  type QuestionnaireAnswers,
  type EdgeBehavior,
  type TelemetryLevel,
} from "../src/renderer/stores/decisions-store.ts";
import { applyDecisionOverrides } from "../src/renderer/lib/playbook-decision-overrides.ts";
import { buildMockResolvedPlaybook } from "../src/renderer/lib/mock-playbook.ts";
import type { ResolvedPlaybook } from "../src/renderer/stores/wizard-store.ts";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

type Scenario = {
  profile: string;
  preset: "balanced" | "aggressive" | "conservative";
  aggressionPreset: QuestionnaireAnswers["aggressionPreset"];
  windowsBuild: number;
};

type QuestionAuditResult = {
  key: keyof QuestionnaireAnswers;
  changedActionIds: string[];
  scenario: Scenario;
};

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, "..", "..", "..");
const playbookRoot = path.join(repoRoot, "playbooks");
const supportedExecutionKinds = new Set([
  "registryChanges",
  "serviceChanges",
  "bcdChanges",
  "powerChanges",
  "powerShellCommands",
  "packages",
  "tasks",
]);

function stripQuotes(value: string): string {
  return value.replace(/^"/, "").replace(/"$/, "").replace(/^'/, "").replace(/'$/, "");
}

function parseManifest(text: string): Array<string> {
  const lines = text.split(/\r?\n/);
  const modules: string[] = [];
  let inPhases = false;
  let readingModules = false;

  for (const line of lines) {
    if (line.startsWith("phases:")) {
      inPhases = true;
      continue;
    }
    if (!inPhases) continue;
    if (line.startsWith("profiles:")) break;
    if (line.startsWith("    type: builtin")) {
      readingModules = false;
      continue;
    }
    if (line.startsWith("    modules:")) {
      readingModules = true;
      continue;
    }
    if (readingModules && line.startsWith("      - ")) {
      modules.push(line.slice(8).trim());
      continue;
    }
    if (readingModules && !line.startsWith("      - ")) {
      readingModules = false;
    }
  }

  return modules;
}

function parseModule(modulePath: string): Array<{ id: string; executionKinds: string[] }> {
  const text = fs.readFileSync(modulePath, "utf8");
  const marker = "\nactions:\n";
  const actionStart = text.indexOf(marker);
  if (actionStart === -1) return [];

  const actionText = `\n${text.slice(actionStart + marker.length)}`;
  return actionText
    .split(/\n  - id: /)
    .slice(1)
    .map((chunk) => {
      const lines = chunk.trimStart().replace(/^id: /, "").split(/\r?\n/);
      const actionId = lines[0].trim();
      const executionKinds = lines
        .slice(1)
        .map((line) => line.trim())
        .flatMap((line) => {
          if (!line.includes(":")) return [];
          const key = line.split(":")[0];
          return supportedExecutionKinds.has(key) ? [stripQuotes(key)] : [];
        });
      return {
        id: actionId,
        executionKinds: Array.from(new Set(executionKinds)),
      };
    });
}

const manifestText = fs.readFileSync(path.join(playbookRoot, "manifest.yaml"), "utf8");
const sourceActions = parseManifest(manifestText).flatMap((modulePath) =>
  parseModule(path.join(playbookRoot, modulePath)),
);
const executableActionIds = new Set(
  sourceActions
    .filter((action) => action.executionKinds.length > 0)
    .map((action) => action.id),
);

const BALANCED_SCENARIO: Scenario = {
  profile: "gaming_desktop",
  preset: "balanced",
  aggressionPreset: "balanced",
  windowsBuild: 22631,
};

const AGGRESSIVE_SCENARIO: Scenario = {
  profile: "gaming_desktop",
  preset: "aggressive",
  aggressionPreset: "aggressive",
  windowsBuild: 22631,
};

const EXPERT_SCENARIO: Scenario = {
  profile: "gaming_desktop",
  preset: "aggressive",
  aggressionPreset: "expert",
  windowsBuild: 26100,
};

const scenarioOverrides: Partial<Record<keyof QuestionnaireAnswers, Scenario>> = {
  disableDynamicTick: AGGRESSIVE_SCENARIO,
  disableSmartScreen: AGGRESSIVE_SCENARIO,
  removeEdge: AGGRESSIVE_SCENARIO,
  preserveWebView2: AGGRESSIVE_SCENARIO,
  disableRecall: EXPERT_SCENARIO,
  disableClickToDo: EXPERT_SCENARIO,
  reduceMitigations: EXPERT_SCENARIO,
  disableHvci: EXPERT_SCENARIO,
  disableLlmnr: AGGRESSIVE_SCENARIO,
  // disableIpv6 removed — no backing playbook action
  disableTeredo: AGGRESSIVE_SCENARIO,
  disableNetbios: AGGRESSIVE_SCENARIO,
  disableNagle: AGGRESSIVE_SCENARIO,
  disableNicOffloading: AGGRESSIVE_SCENARIO,
  disableDeliveryOptimization: AGGRESSIVE_SCENARIO,
  disableUsbSelectiveSuspend: AGGRESSIVE_SCENARIO,
  disablePcieLinkStatePm: AGGRESSIVE_SCENARIO,
};

function buildStatusMap(playbook: ResolvedPlaybook): Map<string, string> {
  return new Map(
    playbook.phases.flatMap((phase) =>
      phase.actions.map((action) => [action.id, `${action.status}:${action.blockedReason ?? ""}`] as const),
    ),
  );
}

function diffActionIds(left: ResolvedPlaybook, right: ResolvedPlaybook): string[] {
  const a = buildStatusMap(left);
  const b = buildStatusMap(right);
  const ids = new Set([...a.keys(), ...b.keys()]);
  return [...ids].filter((id) => a.get(id) !== b.get(id)).sort();
}

function resolveForAnswer<K extends keyof QuestionnaireAnswers>(
  key: K,
  value: QuestionnaireAnswers[K],
  scenario: Scenario,
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

function auditBooleanQuestion(key: keyof QuestionnaireAnswers, scenario: Scenario): QuestionAuditResult {
  const enabled = resolveForAnswer(key, true as never, scenario);
  const disabled = resolveForAnswer(key, false as never, scenario);
  const changedActionIds = diffActionIds(enabled, disabled);

  if (changedActionIds.length === 0) {
    throw new Error(`Question '${key}' does not change any playbook action statuses in scenario ${JSON.stringify(scenario)}`);
  }
  const nonExecutableIds = changedActionIds.filter((id) => !executableActionIds.has(id));
  if (nonExecutableIds.length > 0) {
    throw new Error(`Question '${key}' changes non-executable actions: ${nonExecutableIds.join(", ")}`);
  }

  return { key, changedActionIds, scenario };
}

function auditEnumQuestion<K extends keyof QuestionnaireAnswers>(
  key: K,
  variants: QuestionnaireAnswers[K][],
  scenario: Scenario,
): QuestionAuditResult {
  const resolved = variants.map((value) => resolveForAnswer(key, value, scenario));
  const changedActionIds = new Set<string>();

  for (let index = 0; index < resolved.length - 1; index += 1) {
    for (const id of diffActionIds(resolved[index], resolved[index + 1])) {
      changedActionIds.add(id);
    }
  }

  if (changedActionIds.size === 0) {
    throw new Error(`Question '${key}' does not change any playbook action statuses in scenario ${JSON.stringify(scenario)}`);
  }
  const nonExecutableIds = [...changedActionIds].filter((id) => !executableActionIds.has(id));
  if (nonExecutableIds.length > 0) {
    throw new Error(`Question '${key}' changes non-executable actions: ${nonExecutableIds.join(", ")}`);
  }

  return { key, changedActionIds: [...changedActionIds].sort(), scenario };
}

const booleanKeys = Object.keys(DEFAULT_QUESTIONNAIRE_ANSWERS).filter(
  (key) => !["aggressionPreset", "edgeBehavior", "telemetryLevel",
    // Questions with no backing playbook action — either removed for shell safety
    // or only exist in legacy transformer.rs embedded actions
    "disableIpv6", "disableTeredo", "disableNetbios", "disableNagle", "disableNicOffloading",
    "restoreClassicContextMenu", // shell.restore-classic-context-menu only in transformer.rs
    "disableFaultTolerantHeap", // removed: breaks Explorer crash recovery
    "disableMPOs",              // removed: breaks Explorer icon rendering / compositor
  ].includes(key),
) as Array<Exclude<keyof QuestionnaireAnswers, "aggressionPreset" | "edgeBehavior" | "telemetryLevel">>;

const results: QuestionAuditResult[] = [];

for (const key of booleanKeys) {
  results.push(auditBooleanQuestion(key, scenarioOverrides[key] ?? BALANCED_SCENARIO));
}

results.push(
  auditEnumQuestion("edgeBehavior", ["keep", "suppress", "suppress-and-freeze"] satisfies EdgeBehavior[], AGGRESSIVE_SCENARIO),
);
results.push(
  auditEnumQuestion("telemetryLevel", ["keep", "reduce", "aggressive"] satisfies TelemetryLevel[], BALANCED_SCENARIO),
);

console.log(
  JSON.stringify(
    {
      auditedQuestions: results.length,
      changedActionCount: new Set(results.flatMap((result) => result.changedActionIds)).size,
      sample: results.slice(0, 10),
    },
    null,
    2,
  ),
);
