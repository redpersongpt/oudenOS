#!/usr/bin/env -S node --import tsx

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { createApbxBundle, type ApbxExportState } from "../apps/os-desktop/src/main/lib/apbx.ts";

function readArg(name: string, fallback = ""): string {
  const index = process.argv.indexOf(name);
  if (index !== -1 && process.argv[index + 1]) {
    return process.argv[index + 1];
  }
  return fallback;
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const playbookRoot = path.join(repoRoot, "playbooks");
const wizardPath = path.join(playbookRoot, "wizard.json");

const syncResult = spawnSync(
  "pnpm",
  ["--dir", "apps/os-desktop", "exec", "tsx", "../../scripts/sync-os-wizard-metadata.ts"],
  { cwd: repoRoot, stdio: "inherit" },
);

if (syncResult.status !== 0) {
  throw new Error("Failed to sync wizard metadata before building APBX package");
}

const version = readArg("--version", "0.0.0");
const commit = readArg("--commit", "dev");
const stateFile = readArg("--state-file", "");
const outDir = path.resolve(readArg("--out-dir", path.join(repoRoot, "artifacts", "os-apbx-package")));
const packageName = readArg(
  "--package-name",
  stateFile
    ? `redcore-os-user-package-${version}-${commit}.apbx`
    : `redcore-os-template-${version}-${commit}.apbx`,
);

const wizardMetadata = JSON.parse(fs.readFileSync(wizardPath, "utf8"));
const state: ApbxExportState | null = stateFile
  ? JSON.parse(fs.readFileSync(path.isAbsolute(stateFile) ? stateFile : path.join(repoRoot, stateFile), "utf8"))
  : null;

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

const result = createApbxBundle({
  outputPath: path.join(outDir, packageName),
  wizardMetadata,
  playbookRoot,
  version,
  commit,
  state,
  sourceRepo: wizardMetadata.git,
});

console.log(`APBX package written to ${result.outputPath}`);
console.log(`sha256: ${result.sha256}`);
console.log(`size: ${result.sizeBytes}`);
