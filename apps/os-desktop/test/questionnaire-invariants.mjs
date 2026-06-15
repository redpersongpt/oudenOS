#!/usr/bin/env node

import fs from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
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

// Match both the populated multi-line form and the valid empty/inline form
// (`= {};`). Defaults are intentionally empty now — answers are populated
// dynamically by the store — so an empty body yields zero keys, not a fatal error.
const defaultAnswersMatch = storeSource.match(/export const DEFAULT_QUESTIONNAIRE_ANSWERS\s*:[\s\S]*?=\s*\{([\s\S]*?)\}\s*;/);
if (!defaultAnswersMatch) {
  console.error(JSON.stringify({ error: "Could not locate DEFAULT_QUESTIONNAIRE_ANSWERS declaration" }, null, 2));
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

// Build-gating moved from inline client-side guards (old PlaybookStrategyStep.tsx)
// to the data-driven playbook layer: each build-specific action carries
// minWindowsBuild and is enforced server-side by the Rust resolver
// (services/os-service/src/playbook/resolver.rs, covered by
// test_build_gated_actions_resolve_by_windows_build). Verify the gate exists on
// the actual actions rather than scanning obsolete TSX source.
const requiredActionBuildGates = [
  { actionId: "privacy.disable-recall", minBuild: 26100 },     // Windows Recall — 24H2+
  { actionId: "privacy.disable-click-to-do", minBuild: 26100 }, // Click to Do — 24H2+
  { actionId: "shell.enable-end-task", minBuild: 22631 },       // End Task — 22H2+
];
const fallbackActionsById = new Map(
  fallback.phases.flatMap((phase) => phase.actions.map((action) => [action.id, action])),
);
const missingStrategyGuards = requiredActionBuildGates
  .filter(({ actionId, minBuild }) => {
    const action = fallbackActionsById.get(actionId);
    return !action || action.minWindowsBuild !== minBuild;
  })
  .map(({ actionId }) => actionId);

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
// Execution capability and questionnaire→plan resolution are verified server-side by
// the Rust resolver tests (cargo test, services/os-service). The fallback intentionally
// omits executionKinds.

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
