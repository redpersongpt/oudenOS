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
const fallback = JSON.parse(
  fs.readFileSync(
    path.join(repoRoot, "apps/os-desktop/src/renderer/lib/generated-playbook-fallback.json"),
    "utf8",
  ),
) as {
  phases: Array<{
    actions: Array<{
      id: string;
      executionKinds?: string[];
    }>;
  }>;
};

const executableActionIds = new Set(
  fallback.phases.flatMap((phase) =>
    phase.actions
      .filter((action) => Array.isArray(action.executionKinds) && action.executionKinds.length > 0)
      .map((action) => action.id),
  ),
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
  disableIpv6: AGGRESSIVE_SCENARIO,
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
  (key) => !["aggressionPreset", "edgeBehavior", "telemetryLevel"].includes(key),
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
