#!/usr/bin/env node
// ─── Action Parity Validator ────────────────────────────────────────────────
// Enforces structural alignment between:
//   1. Playbook YAML action IDs (what actions exist)
//   2. Wizard question model QUESTION_BEHAVIORS (what the UI can reach)
//   3. QuestionnaireAnswers interface keys (what answers the store holds)
//   4. strategyQuestions array (what questions the UI shows)
//
// FAILS on:
//   - wizard behavior references a nonexistent playbook action ID
//   - duplicate action IDs across playbook modules
//   - QUESTION_BEHAVIORS key has no matching strategyQuestions entry
//   - strategyQuestions entry has no matching QUESTION_BEHAVIORS key
//   - QuestionnaireAnswers key has no matching strategyQuestions entry
//
// REPORTS:
//   - wizard-reachable actions
//   - default-only actions
//   - intentionally unmapped actions
//
// Usage: node scripts/validate-action-parity.mjs [--quiet]
// Exit code 0 = pass, 1 = structural violation found
// Integrated into: pnpm verify (runs alongside typecheck)

import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const PLAYBOOK_DIR = join(ROOT, "playbooks");
const QUESTION_MODEL = join(ROOT, "apps/os-desktop/src/renderer/lib/wizard-question-model.ts");
const DECISIONS_STORE = join(ROOT, "apps/os-desktop/src/renderer/stores/decisions-store.ts");
const quiet = process.argv.includes("--quiet");

// ─── Intentionally unmapped actions ─────────────────────────────────────────
const INTENTIONALLY_UNMAPPED = new Map([
  ["perf.large-system-cache", "Safe default, no user decision needed"],
  ["perf.clear-page-file-on-shutdown", "Niche security option, default:false"],
  ["network.harden-windows-firewall-defaults", "Safe hardening default"],
  ["network.disable-network-location-wizard", "Minor UX cleanup"],
  ["network.disable-mdns", "default:false, niche, excluded from work_pc"],
]);

const TRANSFORMER_ONLY_ACTIONS = new Map([
  ["network.disable-teredo", "Runtime-generated in transformer.rs"],
  ["network.disable-netbios", "Runtime-generated in transformer.rs"],
  ["network.disable-nagle", "Runtime-generated in transformer.rs"],
  ["network.rss-queues-2", "Runtime-generated in transformer.rs"],
]);

const COMPATIBILITY_ANSWER_KEYS = new Set([
  "disableIpv6",
  "globalTimerResolution",
  "disableDynamicTick",
  "disableMemoryCompression",
  "disableHags",
  "disableWindowsUpdate",
]);

// ─── Helpers ────────────────────────────────────────────────────────────────

function walkYaml(dir) {
  const results = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) results.push(...walkYaml(full));
    else if (entry.isFile() && entry.name.endsWith(".yaml")) results.push(full);
  }
  return results;
}

function fail(msg) {
  console.log(`  FAIL  ${msg}`);
}

// ─── 1. Playbook action IDs ────────────────────────────────────────────────

const yamlFiles = walkYaml(PLAYBOOK_DIR).filter(
  (f) => !f.endsWith("manifest.yaml") && !f.includes("/profiles/")
);

const playbookActions = new Map();
const duplicates = [];

for (const file of yamlFiles) {
  const content = readFileSync(file, "utf-8");
  const regex = /^\s+- id:\s+(.+)$/gm;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const id = match[1].trim();
    const rel = relative(ROOT, file);
    if (playbookActions.has(id)) {
      duplicates.push({ id, file1: playbookActions.get(id), file2: rel });
    } else {
      playbookActions.set(id, rel);
    }
  }
}

for (const [id] of TRANSFORMER_ONLY_ACTIONS) {
  if (!playbookActions.has(id)) {
    playbookActions.set(id, "services/os-service/src/transformer.rs");
  }
}

// ─── 2. Wizard QUESTION_BEHAVIORS action refs ──────────────────────────────

const qmContent = readFileSync(QUESTION_MODEL, "utf-8");

const behaviorStart = qmContent.indexOf("QUESTION_BEHAVIORS");
if (behaviorStart === -1) {
  console.error("FATAL: Cannot find QUESTION_BEHAVIORS in wizard-question-model.ts");
  process.exit(1);
}

const behaviorText = qmContent.slice(behaviorStart);
const actionIdPattern = /["']([a-z][a-z0-9]*\.[a-z][a-z0-9-]*)["']/g;
const wizardActionIds = new Set();
let idMatch;
while ((idMatch = actionIdPattern.exec(behaviorText)) !== null) {
  wizardActionIds.add(idMatch[1]);
}

// ─── 3. QuestionnaireAnswers keys ──────────────────────────────────────────

const storeContent = readFileSync(DECISIONS_STORE, "utf-8");
const ifaceStart = storeContent.indexOf("export interface QuestionnaireAnswers");
const ifaceEnd = storeContent.indexOf("}", ifaceStart);
const ifaceText = storeContent.slice(ifaceStart, ifaceEnd);
const answerKeys = new Set(
  [...ifaceText.matchAll(/^\s+(\w+):/gm)].map((m) => m[1])
);

// ─── 4. strategyQuestions keys ─────────────────────────────────────────────

const qStart = qmContent.indexOf("strategyQuestions:");
const qEnd = qmContent.indexOf("];\n", qStart);
const qText = qmContent.slice(qStart, qEnd);
const questionKeys = new Set([
  ...[...qText.matchAll(/makeBooleanQuestion\(\s*"(\w+)"/g)].map((m) => m[1]),
  ...[...qText.matchAll(/key:\s*"(\w+)"/g)].map((m) => m[1]),
]);

// ─── 5. QUESTION_BEHAVIORS top-level keys ──────────────────────────────────
// Extract keys between QUESTION_BEHAVIORS declaration and the closing };
// These are the first-level object keys like: disableCopilot: createBooleanBehavior(...)

const behaviorBlockEnd = qmContent.indexOf("\n};", behaviorStart);
const behaviorBlock = qmContent.slice(behaviorStart, behaviorBlockEnd);
// Match lines like "  keyName: createBooleanBehavior(" or "  keyName: {"
const behaviorKeyPattern = /^\s{2}(\w+):\s+(?:createBooleanBehavior|{)/gm;
const behaviorKeys = new Set(
  [...behaviorBlock.matchAll(behaviorKeyPattern)].map((m) => m[1])
);

// ─── Validate ───────────────────────────────────────────────────────────────

let exitCode = 0;
const checks = [];

// Check 1: wizard action refs → playbook catalog
const brokenRefs = [...wizardActionIds].filter((id) => !playbookActions.has(id));
if (brokenRefs.length > 0) {
  exitCode = 1;
  for (const id of brokenRefs.sort()) {
    checks.push({ type: "FAIL", msg: `Broken ref: wizard references "${id}" but no playbook action exists` });
  }
}

// Check 2: duplicate playbook IDs
if (duplicates.length > 0) {
  exitCode = 1;
  for (const { id, file1, file2 } of duplicates) {
    checks.push({ type: "FAIL", msg: `Duplicate ID: "${id}" in ${file1} AND ${file2}` });
  }
}

// Check 3: QUESTION_BEHAVIORS keys ↔ strategyQuestions keys
const orphanedBehaviors = [...behaviorKeys].filter((k) => !questionKeys.has(k) && !COMPATIBILITY_ANSWER_KEYS.has(k));
const orphanedQuestions = [...questionKeys].filter((k) => !behaviorKeys.has(k));

if (orphanedBehaviors.length > 0) {
  exitCode = 1;
  for (const k of orphanedBehaviors.sort()) {
    checks.push({ type: "FAIL", msg: `Orphaned behavior: "${k}" has QUESTION_BEHAVIORS entry but no strategyQuestions definition` });
  }
}
if (orphanedQuestions.length > 0) {
  exitCode = 1;
  for (const k of orphanedQuestions.sort()) {
    checks.push({ type: "FAIL", msg: `Orphaned question: "${k}" has strategyQuestions definition but no QUESTION_BEHAVIORS entry` });
  }
}

// Check 4: QuestionnaireAnswers ↔ strategyQuestions
const answerWithoutQuestion = [...answerKeys].filter((k) => !questionKeys.has(k) && !COMPATIBILITY_ANSWER_KEYS.has(k));
const questionWithoutAnswer = [...questionKeys].filter((k) => !answerKeys.has(k));

if (answerWithoutQuestion.length > 0) {
  exitCode = 1;
  for (const k of answerWithoutQuestion.sort()) {
    checks.push({ type: "FAIL", msg: `Answer without question: "${k}" in QuestionnaireAnswers but no strategyQuestions entry` });
  }
}
if (questionWithoutAnswer.length > 0) {
  exitCode = 1;
  for (const k of questionWithoutAnswer.sort()) {
    checks.push({ type: "FAIL", msg: `Question without answer: "${k}" in strategyQuestions but not in QuestionnaireAnswers` });
  }
}

// Classify reachability
const wizardReachable = [...wizardActionIds].filter((id) => playbookActions.has(id));
const defaultOnly = [...playbookActions.keys()].filter((id) => !wizardActionIds.has(id));
const exempt = defaultOnly.filter((id) => INTENTIONALLY_UNMAPPED.has(id));
const unclassified = defaultOnly.filter((id) => !INTENTIONALLY_UNMAPPED.has(id));

// ─── Report ─────────────────────────────────────────────────────────────────

console.log("");
console.log("  redcore OS — Action Parity Validator");
console.log("  ────────────────────────────────────");
console.log(`  Playbook actions:       ${playbookActions.size}`);
console.log(`  Wizard-referenced:      ${wizardActionIds.size}`);
console.log(`  Wizard-reachable:       ${wizardReachable.length}`);
console.log(`  Default-only:           ${defaultOnly.length} (${exempt.length} exempt, ${unclassified.length} unclassified)`);
console.log(`  Answer keys:            ${answerKeys.size}`);
console.log(`  Strategy questions:     ${questionKeys.size}`);
console.log(`  Behavior keys:          ${behaviorKeys.size}`);
console.log("");

if (checks.length > 0) {
  for (const { type, msg } of checks) {
    console.log(`  ${type}  ${msg}`);
  }
  console.log("");
}

if (!quiet && defaultOnly.length > 0) {
  console.log("  Default-only actions (not wizard-gated):");
  for (const id of defaultOnly.sort()) {
    const tag = INTENTIONALLY_UNMAPPED.has(id) ? " [exempt]" : "";
    console.log(`    ${id}${tag}`);
  }
  console.log("");
}

if (exitCode === 0) {
  console.log("  RESULT: PASS");
  console.log("  All structural parity checks passed.");
} else {
  console.log("  RESULT: FAIL");
  console.log("  Fix the violations above before shipping.");
}
console.log("");

process.exit(exitCode);
