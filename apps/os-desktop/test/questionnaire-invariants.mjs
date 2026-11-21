#!/usr/bin/env node
// Questionnaire / playbook DATA invariants (Windows-proof gate).
//
// This never re-implements plan resolution — the Rust resolver
// (services/os-service/src/playbook/resolver.rs + questionnaire.rs) is the
// source of truth and is covered by `cargo test`. These checks only assert
// that the shipped data is well-formed and internally consistent:
//
//   1. playbooks/wizard.json (the questionnaire the service loads):
//      unique question keys, ≥2 options, unique option values, and every
//      includeActions / blockActions id exists in playbooks/**/*.yaml.
//   2. Build-gate invariants on the bundled preview fallback.
//   3. Only supported execution kinds in the preview fallback.
//   4. No hard-coded Windows build on the live renderer path (the real build
//      comes from the assessment; only the preview mock may assume one).
//   5. No forbidden third-party names in user-visible copy.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const rendererRoot = path.join(repoRoot, "apps/os-desktop/src/renderer");
const wizardPath = path.join(repoRoot, "playbooks/wizard.json");
const fallbackPath = path.join(rendererRoot, "lib/generated-playbook-fallback.json");

const errors = {};
const fail = (name, detail) => {
  (errors[name] ??= []).push(detail);
};

// ── 1. wizard.json ──────────────────────────────────────────────────────
function walkYaml(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const full = path.join(dir, d.name);
    if (d.isDirectory()) return walkYaml(full);
    return /\.ya?ml$/.test(d.name) ? [full] : [];
  });
}
const playbookActionIds = new Set();
for (const file of walkYaml(path.join(repoRoot, "playbooks"))) {
  const text = fs.readFileSync(file, "utf8");
  for (const m of text.matchAll(/^\s*-\s+id:\s*["']?([A-Za-z0-9_.-]+)["']?\s*(?:#.*)?$/gm)) {
    playbookActionIds.add(m[1]);
  }
}

const wizard = JSON.parse(fs.readFileSync(wizardPath, "utf8"));
const questions = Array.isArray(wizard.desktopQuestions) ? wizard.desktopQuestions : [];
if (questions.length === 0) fail("wizardQuestions", "playbooks/wizard.json has no desktopQuestions");
const seenKeys = new Set();
let referencedActions = 0;
for (const q of questions) {
  if (typeof q.key !== "string" || q.key.length === 0) {
    fail("wizardQuestions", `question without key: ${JSON.stringify(q).slice(0, 80)}`);
    continue;
  }
  if (seenKeys.has(q.key)) fail("wizardQuestions", `duplicate question key ${q.key}`);
  seenKeys.add(q.key);
  if (!Array.isArray(q.options) || q.options.length < 2) {
    fail("wizardQuestions", `${q.key}: needs at least 2 options`);
    continue;
  }
  const values = q.options.map((o) => JSON.stringify(o.value));
  if (new Set(values).size !== values.length) fail("wizardQuestions", `${q.key}: duplicate option values`);
  for (const option of q.options) {
    const behavior = option.behavior ?? {};
    for (const listName of ["includeActions", "blockActions"]) {
      for (const actionId of behavior[listName] ?? []) {
        referencedActions += 1;
        if (!playbookActionIds.has(actionId)) {
          fail("unknownActionIds", `${q.key}=${JSON.stringify(option.value)} ${listName} → ${actionId}`);
        }
      }
    }
  }
}

// ── 2/3. preview fallback ───────────────────────────────────────────────
const fallback = JSON.parse(fs.readFileSync(fallbackPath, "utf8"));
const fallbackActions = fallback.phases.flatMap((phase) => phase.actions);
const supportedExecutionKinds = new Set([
  "registryChanges", "serviceChanges", "bcdChanges", "powerChanges", "powerShellCommands", "packages", "tasks",
  "fileRenames", // executor.rs contract.file_renames (rollback type "file_rename")
]);
for (const action of fallbackActions) {
  for (const kind of action.executionKinds ?? []) {
    if (!supportedExecutionKinds.has(kind)) fail("unsupportedExecutionKinds", `${action.id}: ${kind}`);
  }
}
// Build-gating is data-driven (minWindowsBuild) and enforced by the Rust resolver
// (test_build_gated_actions_resolve_by_windows_build). Verify the gate exists.
const requiredActionBuildGates = [
  { actionId: "privacy.disable-recall", minBuild: 26100 },     // Windows Recall — 24H2+
  { actionId: "privacy.disable-click-to-do", minBuild: 26100 }, // Click to Do — 24H2+
  { actionId: "shell.enable-end-task", minBuild: 22631 },       // End Task — 23H2+
];
const fallbackById = new Map(fallbackActions.map((a) => [a.id, a]));
for (const { actionId, minBuild } of requiredActionBuildGates) {
  const action = fallbackById.get(actionId);
  if (!action || action.minWindowsBuild !== minBuild) fail("missingBuildGates", actionId);
}

// ── 4. no hard-coded build on the live path ─────────────────────────────
function walkSource(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const full = path.join(dir, d.name);
    if (d.isDirectory()) return walkSource(full);
    return /\.(ts|tsx)$/.test(d.name) ? [full] : [];
  });
}
const BUILD_LITERAL_ALLOWED = new Set(["lib/mock-playbook.ts"]); // preview-only mock
for (const file of walkSource(rendererRoot)) {
  const rel = path.relative(rendererRoot, file).replaceAll(path.sep, "/");
  if (BUILD_LITERAL_ALLOWED.has(rel)) continue;
  const text = fs.readFileSync(file, "utf8");
  for (const m of text.matchAll(/\b(19041|19045|22000|22621|22631|26100)\b/g)) {
    const line = text.slice(0, m.index).split("\n").length;
    const lineText = text.split("\n")[line - 1] ?? "";
    if (/^\s*(\/\/|\*)/.test(lineText)) continue; // comments are fine
    fail("hardcodedWindowsBuild", `${rel}:${line}`);
  }
}

// ── 5. forbidden names in user-visible copy ─────────────────────────────
const forbiddenNames = ["One" + "click", "PC-" + "Tuning", "Quaked" + "K", "valley" + "ofdoom"];
const copyFiles = [
  path.join(rendererRoot, "pages/wizard/steps/PlaybookStrategyStep.tsx"),
  path.join(rendererRoot, "i18n/en.ts"),
  path.join(rendererRoot, "i18n/tr.ts"),
];
for (const file of copyFiles) {
  const text = fs.readFileSync(file, "utf8");
  for (const term of forbiddenNames) {
    const pattern = new RegExp(`"([^"]*${term.replace("-", "\\-")}[^"]*)"`, "gi");
    for (const m of text.matchAll(pattern)) fail("forbiddenCopy", `${path.basename(file)}: ${m[1]}`);
  }
}

const summary = {
  wizardQuestions: questions.length,
  wizardOptions: questions.reduce((n, q) => n + (q.options?.length ?? 0), 0),
  referencedActionIds: referencedActions,
  playbookActionIds: playbookActionIds.size,
  fallbackActionCount: fallbackActions.length,
};

if (Object.keys(errors).length > 0) {
  console.error(JSON.stringify({ ...summary, errors }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify(summary, null, 2));
