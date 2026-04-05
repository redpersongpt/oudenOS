#!/usr/bin/env -S node --import tsx

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  getQuestionBehaviorDefinition,
  strategyQuestions,
  wizardBundleMetadata,
} from "../apps/os-desktop/src/renderer/lib/wizard-question-model.ts";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const outputPath = path.join(repoRoot, "playbooks", "wizard.json");
const shouldCheck = process.argv.includes("--check");

function buildWizardJsonPayload() {
  const desktopQuestions = strategyQuestions.map((question) => {
    const behaviorDefinition = getQuestionBehaviorDefinition(question.key);
    return {
      key: question.key,
      icon: question.icon,
      label: question.label,
      title: question.title,
      desc: question.desc,
      note: question.note ?? null,
      visibility: question.visibility ?? null,
      options: question.options.map((option) => ({
        value: option.value,
        title: option.title,
        desc: option.desc,
        badge: option.badge ?? null,
        badgeColor: option.badgeColor ?? null,
        danger: option.danger ?? false,
        behavior: behaviorDefinition.options.find((entry) => entry.value === option.value) ?? null,
      })),
    };
  });

  const featurePages = desktopQuestions.map((question) => ({
    type: "RadioPage",
    description: question.desc,
    isRequired: true,
    defaultOption: `${String(question.key)}__${String(question.options[0]?.value ?? "")}`,
    questionKey: question.key,
    visibility: question.visibility,
    options: question.options.map((option) => ({
      text: option.title,
      name: `${String(question.key)}__${String(option.value)}`,
      value: option.value,
      desc: option.desc,
      badge: option.badge,
      badgeColor: option.badgeColor,
      danger: option.danger,
      behavior: option.behavior,
    })),
  }));

  return {
    ...wizardBundleMetadata,
    desktopQuestions,
    featurePages,
  };
}

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
