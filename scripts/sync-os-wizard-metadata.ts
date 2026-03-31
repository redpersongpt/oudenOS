#!/usr/bin/env -S node --import tsx

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildWizardJsonPayload } from "../apps/os-desktop/src/renderer/lib/wizard-question-model.ts";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const outputPath = path.join(repoRoot, "playbooks", "wizard.json");
const shouldCheck = process.argv.includes("--check");

const payload = buildWizardJsonPayload();
const nextJson = `${JSON.stringify(payload, null, 2)}\n`;

if (shouldCheck) {
  const currentJson = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, "utf8") : "";
  if (currentJson !== nextJson) {
    console.error("playbooks/wizard.json is out of sync with the desktop wizard question model.");
    process.exit(1);
  }

  console.log(`Verified ${path.relative(repoRoot, outputPath)} against ${payload.desktopQuestions.length} desktop questions.`);
  process.exit(0);
}

fs.writeFileSync(outputPath, nextJson);

console.log(`Synced ${path.relative(repoRoot, outputPath)} with ${payload.desktopQuestions.length} desktop questions.`);
