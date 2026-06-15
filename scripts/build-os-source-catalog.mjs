#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const sourcePath = path.join(repoRoot, "third_party", "winutil", "config", "tweaks.json");
const outputPath = path.join(repoRoot, "artifacts", "os-source-catalog.json");

const winutilSource = {
  source: "winutil",
  upstreamRepo: "ChrisTitusTech/winutil",
  upstreamCommit: "87a5779f0b610743b090fd0d72fb0ab179b97101",
  upstreamPath: "config/tweaks.json",
  upstreamUrl:
    "https://github.com/ChrisTitusTech/winutil/blob/87a5779f0b610743b090fd0d72fb0ab179b97101/config/tweaks.json",
};

const expectedCounts = new Map([
  ["Essential Tweaks", 16],
  ["z__Advanced Tweaks - CAUTION", 23],
  ["Customize Preferences", 19],
  ["Performance Plans", 2],
]);

const requiredActions = new Set(["WPFTweaksActivity", "WPFTweaksTelemetry"]);

function fail(message) {
  throw new Error(`build-os-source-catalog: ${message}`);
}

function escapeRawControlCharsInStrings(text) {
  let output = "";
  let inString = false;
  let escaped = false;

  for (const char of text) {
    if (inString) {
      if (escaped) {
        output += char;
        escaped = false;
        continue;
      }

      if (char === "\\") {
        output += char;
        escaped = true;
        continue;
      }

      if (char === "\"") {
        output += char;
        inString = false;
        continue;
      }

      if (char === "\n") {
        output += "\\n";
        continue;
      }

      if (char === "\r") {
        output += "\\r";
        continue;
      }

      if (char === "\t") {
        output += "\\t";
        continue;
      }

      output += char;
      continue;
    }

    if (char === "\"") {
      inString = true;
    }
    output += char;
  }

  return output;
}

function parseWinutilTweaks(text) {
  try {
    return JSON.parse(escapeRawControlCharsInStrings(text));
  } catch (error) {
    fail(`failed to parse ${path.relative(repoRoot, sourcePath)}: ${error.message}`);
  }
}

function assertPlainObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(`${label} must be an object`);
  }
}

function optionalString(value, label) {
  if (value == null) {
    return undefined;
  }
  if (typeof value !== "string") {
    fail(`${label} must be a string when present`);
  }
  return value;
}

function requiredString(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    fail(`${label} must be a non-empty string`);
  }
  return value;
}

function countOperation(value, label) {
  if (value == null) {
    return 0;
  }
  if (!Array.isArray(value)) {
    fail(`${label} must be an array when present`);
  }
  return value.length;
}

function normalizeAction(id, tweak) {
  assertPlainObject(tweak, `tweak ${id}`);

  return {
    id,
    title: requiredString(tweak.Content, `${id}.Content`),
    description: optionalString(tweak.Description, `${id}.Description`) ?? "",
    category: requiredString(tweak.category, `${id}.category`),
    link: optionalString(tweak.link, `${id}.link`),
    operations: {
      registry: countOperation(tweak.registry, `${id}.registry`),
      service: countOperation(tweak.service, `${id}.service`),
      scheduledTask: countOperation(tweak.scheduledTask, `${id}.scheduledTask`),
      invokeScript: countOperation(tweak.InvokeScript, `${id}.InvokeScript`),
      undoScript: countOperation(tweak.UndoScript, `${id}.UndoScript`),
      appx: countOperation(tweak.appx, `${id}.appx`),
    },
  };
}

function validateCatalog(actions) {
  const ids = new Set();
  const counts = new Map();

  for (const action of actions) {
    if (ids.has(action.id)) {
      fail(`duplicate action id ${action.id}`);
    }
    ids.add(action.id);
    counts.set(action.category, (counts.get(action.category) ?? 0) + 1);
  }

  for (const requiredAction of requiredActions) {
    if (!ids.has(requiredAction)) {
      fail(`required WinUtil action ${requiredAction} is missing`);
    }
  }

  for (const [category, expected] of expectedCounts) {
    const actual = counts.get(category) ?? 0;
    if (actual !== expected) {
      fail(`expected ${expected} '${category}' actions, found ${actual}`);
    }
  }

  const unexpectedCategories = [...counts.keys()].filter((category) => !expectedCounts.has(category));
  if (unexpectedCategories.length > 0) {
    fail(`unexpected WinUtil categories: ${unexpectedCategories.join(", ")}`);
  }
}

function buildCatalog() {
  const sourceText = fs.readFileSync(sourcePath, "utf8");
  const tweaks = parseWinutilTweaks(sourceText);
  assertPlainObject(tweaks, "WinUtil tweaks source");

  const actions = Object.entries(tweaks).map(([id, tweak]) => normalizeAction(id, tweak));
  validateCatalog(actions);

  return {
    schemaVersion: 1,
    generatedBy: "scripts/build-os-source-catalog.mjs",
    sources: [
      {
        ...winutilSource,
        actions,
      },
    ],
  };
}

const catalog = buildCatalog();
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(catalog, null, 2)}\n`);

const actionCount = catalog.sources.reduce((total, source) => total + source.actions.length, 0);
console.log(
  `Wrote ${path.relative(repoRoot, outputPath)} from ${path.relative(
    repoRoot,
    sourcePath,
  )} (${actionCount} actions)`,
);
