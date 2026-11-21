#!/usr/bin/env node
// Translation coverage gate (data-only).
//   1. UI dictionaries: en.ts and tr.ts have the same keys and the same {vars}.
//   2. Questionnaire content: every question key and option value in
//      playbooks/wizard.json (what the service actually serves) has a Turkish
//      overlay entry in questionnaire-tr.json.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const renderer = path.join(repoRoot, "apps/os-desktop/src/renderer");

function readDict(file) {
  const text = fs.readFileSync(file, "utf8");
  const dict = new Map();
  for (const m of text.matchAll(/^\s*"([^"]+)":\s*(?:\r?\n\s*)?"((?:[^"\\]|\\.)*)"\s*,?\s*$/gm)) {
    dict.set(m[1], m[2]);
  }
  return dict;
}
const varsOf = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");

const en = readDict(path.join(renderer, "i18n/en.ts"));
const tr = readDict(path.join(renderer, "i18n/tr.ts"));
const missingInTr = [...en.keys()].filter((k) => !tr.has(k));
const extraInTr = [...tr.keys()].filter((k) => !en.has(k));
const varMismatch = [...en.keys()].filter((k) => tr.has(k) && varsOf(en.get(k)) !== varsOf(tr.get(k)));

const wizard = JSON.parse(fs.readFileSync(path.join(repoRoot, "playbooks/wizard.json"), "utf8"));
const overlay = JSON.parse(fs.readFileSync(path.join(renderer, "lib/questionnaire-tr.json"), "utf8"));
const missingQuestions = [];
const missingOptions = [];
for (const q of wizard.desktopQuestions ?? []) {
  const entry = overlay.questions?.[q.key];
  if (!entry || !entry.title) missingQuestions.push(q.key);
  for (const option of q.options ?? []) {
    const key = `${q.key}::${String(option.value)}`;
    if (!overlay.options?.[key]?.title) missingOptions.push(key);
  }
}

// Service-contract labels that must exist in both dictionaries: every
// results[].reason code (executor.rs / personalizer.rs) and every assess.full
// healthChecks id (health.rs). Plus the guide.health.* advisories (advisory.rs)
// need a Turkish name in the action overlay.
const SKIP_REASONS = [
  "already_configured", "access_denied_protected", "not_found", "protected_target", "protected_service",
  "protected_package", "tamper_protection", "hardware_not_applicable", "preflight_failed",
];
const HEALTH_IDS = [
  "gpu-pcie-link", "ram-profile", "vbs-hypervisor", "refresh-rate", "power-plan",
  "bios-age", "chipset-driver", "thermals", "smt-state",
];
const requiredKeys = [...SKIP_REASONS.map((r) => `reason.${r}`), ...HEALTH_IDS.map((h) => `health.title.${h}`)];
const missingContractLabels = requiredKeys.filter((k) => !en.has(k) || !tr.has(k));
const playbookTr = JSON.parse(fs.readFileSync(path.join(renderer, "lib/playbook-tr.json"), "utf8"));
const missingGuideTranslations = HEALTH_IDS.map((h) => `guide.health.${h}`).filter((id) => !playbookTr[id]?.name);

const result = {
  uiKeys: en.size,
  missingContractLabels,
  missingGuideTranslations,
  missingInTr,
  extraInTr,
  varMismatch,
  wizardQuestions: (wizard.desktopQuestions ?? []).length,
  missingQuestionTranslations: missingQuestions,
  missingOptionTranslations: missingOptions,
};
const failed =
  missingInTr.length + extraInTr.length + varMismatch.length + missingQuestions.length + missingOptions.length +
    missingContractLabels.length + missingGuideTranslations.length > 0;
(failed ? console.error : console.log)(JSON.stringify(result, null, 2));
process.exit(failed ? 1 : 0);
