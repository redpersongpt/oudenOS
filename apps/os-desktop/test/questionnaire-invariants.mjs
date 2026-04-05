#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "..", "..");
const strategyPath = path.join(
  repoRoot,
  "apps/os-desktop/src/renderer/pages/wizard/steps/PlaybookStrategyStep.tsx",
);
const storePath = path.join(
  repoRoot,
  "apps/os-desktop/src/renderer/stores/decisions-store.ts",
);
const overridesPath = path.join(
  repoRoot,
  "apps/os-desktop/src/renderer/lib/wizard-question-model.ts",
);
const reviewPath = path.join(
  repoRoot,
  "apps/os-desktop/src/renderer/pages/wizard/steps/PlaybookReviewStep.tsx",
);
const fallbackPath = path.join(
  repoRoot,
  "apps/os-desktop/src/renderer/lib/generated-playbook-fallback.json",
);

const strategySource = fs.readFileSync(strategyPath, "utf8");
const storeSource = fs.readFileSync(storePath, "utf8");
const overridesSource = fs.readFileSync(overridesPath, "utf8");
const reviewSource = fs.readFileSync(reviewPath, "utf8");
const fallback = JSON.parse(fs.readFileSync(fallbackPath, "utf8"));

const defaultAnswersMatch = storeSource.match(/export const DEFAULT_QUESTIONNAIRE_ANSWERS:[\s\S]*?=\s*\{([\s\S]*?)\n\};/);
if (!defaultAnswersMatch) {
  console.error(JSON.stringify({ error: "Could not locate DEFAULT_QUESTIONNAIRE_ANSWERS block" }, null, 2));
  process.exit(1);
}

const uniqueAnswerKeys = [...defaultAnswersMatch[1].matchAll(/^  ([a-zA-Z0-9]+): /gm)].map((match) => match[1]);
// Keys that exist in the interface but have no backing playbook action at all
// (either removed for shell safety or only in legacy transformer.rs embedded actions).
const orphanKeys = new Set([
  "disableIpv6",            // removed: breaks many ISPs
  "disableFaultTolerantHeap", // removed: breaks Explorer crash recovery
  "disableMPOs",              // removed: breaks Explorer icon rendering
]);
const missingMappings = uniqueAnswerKeys.filter(
  (key) => key !== "aggressionPreset" &&
    !orphanKeys.has(key) &&
    // Match either QUESTION_BEHAVIORS property or legacy answers.key pattern
    !overridesSource.includes(`${key}:`) &&
    !overridesSource.includes(`answers.${key}`),
);

const overrideActionIds = [
  ...new Set(
    [...overridesSource.matchAll(/"([a-z0-9.-]+)"/g)]
      .map((match) => match[1])
      // Only match real action IDs (category.verb-noun), not version strings or filenames
      .filter((value) => /^[a-z]+\.[a-z].*-/.test(value)),
  ),
];

const fallbackActionIds = new Set(
  fallback.phases.flatMap((phase) => phase.actions.map((action) => action.id)),
);
const supportedExecutionKinds = new Set([
  "registryChanges",
  "serviceChanges",
  "bcdChanges",
  "powerChanges",
  "powerShellCommands",
  "packages",
  "tasks",
]);

const missingFallbackIds = overrideActionIds.filter((id) => !fallbackActionIds.has(id));
const nonExecutableFallbackIds = fallback.phases
  .flatMap((phase) => phase.actions)
  .filter((action) => !Array.isArray(action.executionKinds) || action.executionKinds.length === 0)
  .map((action) => action.id);
const unsupportedExecutionKinds = fallback.phases
  .flatMap((phase) => phase.actions)
  .flatMap((action) =>
    (action.executionKinds ?? [])
      .filter((kind) => !supportedExecutionKinds.has(kind))
      .map((kind) => ({ actionId: action.id, kind })),
  );
const nonExecutableOverrideIds = overrideActionIds.filter((id) =>
  fallback.phases
    .flatMap((phase) => phase.actions)
    .some((action) => action.id === id && (!Array.isArray(action.executionKinds) || action.executionKinds.length === 0)),
);

const requiredStrategyGuards = [
  { key: "disableRecall", pattern: /"disableRecall"[\s\S]*(ctx\.windowsBuild >= 26100|minWindowsBuild:\s*26100)/ },
  { key: "disableClickToDo", pattern: /"disableClickToDo"[\s\S]*(ctx\.windowsBuild >= 26100|minWindowsBuild:\s*26100)/ },
  { key: "enableEndTask", pattern: /"enableEndTask"[\s\S]*(ctx\.windowsBuild >= 22631|minWindowsBuild:\s*22631)/ },
];

const combinedSource = strategySource + "\n" + fs.readFileSync(overridesPath, "utf8");
const missingStrategyGuards = requiredStrategyGuards
  .filter(({ pattern }) => !pattern.test(combinedSource))
  .map(({ key }) => key);

const missingReviewBuildPropagation =
  !/const windowsBuild = detectedProfile\?\.windowsBuild \?\? 22631;/.test(reviewSource) ||
  !/buildMockResolvedPlaybook\(profile, playbookPreset, windowsBuild\)/.test(reviewSource) ||
  !/preset:\s*playbookPreset,\s*[\r\n]+\s*windowsBuild,/.test(reviewSource);

const forbiddenNames = ["One" + "click", "PC-" + "Tuning", "Quaked" + "K", "valley" + "ofdoom"];
const visibleForbiddenCopy = forbiddenNames.flatMap((term) => {
  const pattern = new RegExp(`"([^"]*${term.replace("-", "\\-")}[^"]*)"`, "gi");
  return [...strategySource.matchAll(pattern)].map((match) => match[1]);
});

// NOTE: nonExecutableFallbackIds and nonExecutableOverrideIds are NOT error conditions here.
// The fallback JSON is a UI-side preview, not the execution manifest.
// Execution-capability checks are done by questionnaire-execution-audit.ts which reads
// the actual YAML playbooks. The fallback intentionally omits executionKinds.

if (
  missingMappings.length > 0 ||
  missingFallbackIds.length > 0 ||
  unsupportedExecutionKinds.length > 0 ||
  visibleForbiddenCopy.length > 0 ||
  missingStrategyGuards.length > 0 ||
  missingReviewBuildPropagation
) {
  console.error(
    JSON.stringify(
      {
        missingMappings,
        missingFallbackIds,
        unsupportedExecutionKinds,
        forbiddenCopyMatches: visibleForbiddenCopy,
        missingStrategyGuards,
        missingReviewBuildPropagation,
      },
      null,
      2,
    ),
  );
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      questionCount: uniqueAnswerKeys.length,
      mappedAnswers: uniqueAnswerKeys.length - 1,
      overrideActionCount: overrideActionIds.length,
      fallbackActionCount: fallbackActionIds.size,
      executableFallbackActionCount: fallback.phases
        .flatMap((phase) => phase.actions)
        .filter((action) => Array.isArray(action.executionKinds) && action.executionKinds.length > 0)
        .length,
    },
    null,
    2,
  ),
);
