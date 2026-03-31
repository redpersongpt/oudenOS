#!/usr/bin/env node
// ─── Action Parity Validator ────────────────────────────────────────────────
// Validates structural alignment between:
//   1. Playbook YAML action IDs (source of truth for what actions exist)
//   2. Wizard question model action references (what the UI can reach)
//
// Fails on:
//   - question model references a nonexistent playbook action ID (BROKEN)
//   - duplicate action IDs across playbook modules (COLLISION)
//
// Reports:
//   - wizard-reachable actions
//   - default-only actions (exist in playbook, not referenced by any question)
//   - intentionally unmapped actions (in the exempt list)
//   - unknown unmapped actions (not exempt — potential drift)
//
// Usage: node scripts/validate-action-parity.mjs
// Exit code 0 = pass, 1 = broken references or collisions found

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const PLAYBOOK_DIR = join(ROOT, "playbooks");
const QUESTION_MODEL = join(ROOT, "apps/os-desktop/src/renderer/lib/wizard-question-model.ts");

// ─── Intentionally unmapped actions ─────────────────────────────────────────
// These actions are playbook-default-only by design.
// Each entry must have a reason. Add/remove as the catalog evolves.
const INTENTIONALLY_UNMAPPED = new Map([
  ["perf.large-system-cache", "Safe default, no user decision needed"],
  ["perf.clear-page-file-on-shutdown", "Niche security option, default:false, no question category"],
  ["network.harden-windows-firewall-defaults", "Safe hardening default, no question needed"],
  ["network.disable-network-location-wizard", "Minor UX cleanup, no decision surface needed"],
  ["network.disable-mdns", "default:false, excluded from work_pc/office_laptop, niche"],
  ["perf.disable-sleep-study", "Safe default service disable, telemetry-adjacent"],
  ["perf.disable-memory-diagnostics", "Safe diagnostic disable, runs by default"],
]);

// ─── Step 1: Extract action IDs from playbook YAML files ────────────────────

function walkDir(dir) {
  const results = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkDir(full));
    } else if (entry.isFile() && entry.name.endsWith(".yaml")) {
      results.push(full);
    }
  }
  return results;
}

function extractYamlActionIds(yamlPath) {
  const content = readFileSync(yamlPath, "utf-8");
  const ids = [];
  const regex = /^\s+- id:\s+(.+)$/gm;
  let match;
  while ((match = regex.exec(content)) !== null) {
    ids.push(match[1].trim());
  }
  return ids;
}

const yamlFiles = walkDir(PLAYBOOK_DIR).filter(
  (f) => !f.endsWith("manifest.yaml") && !f.includes("/profiles/")
);

const playbookActions = new Map(); // actionId → source file
const duplicates = [];

for (const file of yamlFiles) {
  const ids = extractYamlActionIds(file);
  const rel = relative(ROOT, file);
  for (const id of ids) {
    if (playbookActions.has(id)) {
      duplicates.push({ id, file1: playbookActions.get(id), file2: rel });
    } else {
      playbookActions.set(id, rel);
    }
  }
}

// ─── Step 2: Extract action IDs referenced by wizard question model ─────────

const qmContent = readFileSync(QUESTION_MODEL, "utf-8");

// Find QUESTION_BEHAVIORS block start
const behaviorStart = qmContent.indexOf("QUESTION_BEHAVIORS");
if (behaviorStart === -1) {
  console.error("FATAL: Cannot find QUESTION_BEHAVIORS in wizard-question-model.ts");
  process.exit(1);
}

const behaviorText = qmContent.slice(behaviorStart);

// Extract all action-ID-shaped strings from the behavior definitions
// Pattern: lowercase word, dot, lowercase-with-hyphens
const actionIdPattern = /["']([a-z][a-z0-9]*\.[a-z][a-z0-9-]*)["']/g;
const wizardActionIds = new Set();
let idMatch;
while ((idMatch = actionIdPattern.exec(behaviorText)) !== null) {
  wizardActionIds.add(idMatch[1]);
}

// ─── Step 3: Validate ───────────────────────────────────────────────────────

let exitCode = 0;
const brokenRefs = [];
const wizardReachable = [];
const defaultOnly = [];
const intentionallyUnmapped = [];
const unknownUnmapped = [];

// Check every wizard-referenced ID exists in playbook catalog
for (const id of wizardActionIds) {
  if (playbookActions.has(id)) {
    wizardReachable.push(id);
  } else {
    brokenRefs.push(id);
  }
}

// Classify playbook actions by reachability
for (const [id] of playbookActions) {
  if (wizardActionIds.has(id)) continue; // already counted as wizard-reachable
  if (INTENTIONALLY_UNMAPPED.has(id)) {
    intentionallyUnmapped.push(id);
  } else {
    defaultOnly.push(id);
  }
}

// ─── Step 4: Report ─────────────────────────────────────────────────────────

console.log("╔═══════════════════════════════════════════════════════════╗");
console.log("║  redcore · OS — Action Parity Validator                   ║");
console.log("╠═══════════════════════════════════════════════════════════╣");
console.log(`║  Playbook actions:        ${String(playbookActions.size).padStart(4)}`);
console.log(`║  Wizard-referenced IDs:   ${String(wizardActionIds.size).padStart(4)}`);
console.log(`║  Wizard-reachable:        ${String(wizardReachable.length).padStart(4)}`);
console.log(`║  Default-only:            ${String(defaultOnly.length).padStart(4)}`);
console.log(`║  Intentionally unmapped:  ${String(intentionallyUnmapped.length).padStart(4)}`);
console.log(`║  Unknown unmapped:        ${String(defaultOnly.length - intentionallyUnmapped.length >= 0 ? defaultOnly.length : 0).padStart(4)}`);
console.log("╠═══════════════════════════════════════════════════════════╣");

// Broken references (FAIL)
if (brokenRefs.length > 0) {
  exitCode = 1;
  console.log("║  BROKEN REFERENCES (question model → nonexistent action)  ║");
  for (const id of brokenRefs.sort()) {
    console.log(`║    ✗ ${id}`);
  }
  console.log("╠═══════════════════════════════════════════════════════════╣");
}

// Duplicate IDs (FAIL)
if (duplicates.length > 0) {
  exitCode = 1;
  console.log("║  DUPLICATE ACTION IDS                                     ║");
  for (const { id, file1, file2 } of duplicates) {
    console.log(`║    ✗ ${id}`);
    console.log(`║      in: ${file1}`);
    console.log(`║      in: ${file2}`);
  }
  console.log("╠═══════════════════════════════════════════════════════════╣");
}

// Default-only (INFO — not a failure, but visible)
if (defaultOnly.length > 0) {
  console.log("║  DEFAULT-ONLY (playbook actions not in question model)    ║");
  for (const id of defaultOnly.sort()) {
    const source = playbookActions.get(id);
    const exempt = INTENTIONALLY_UNMAPPED.has(id);
    const marker = exempt ? "◇" : "○";
    console.log(`║    ${marker} ${id}${exempt ? " [exempt]" : ""}`);
  }
  console.log("╠═══════════════════════════════════════════════════════════╣");
}

// Final verdict
if (exitCode === 0) {
  console.log("║  RESULT: PASS                                             ║");
  console.log("║  All wizard action references are structurally valid.      ║");
} else {
  console.log("║  RESULT: FAIL                                             ║");
  console.log("║  Fix broken references or duplicates before shipping.      ║");
}
console.log("╚═══════════════════════════════════════════════════════════╝");

process.exit(exitCode);
