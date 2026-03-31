#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const repoRoot = process.cwd();
const playbookRoot = path.join(repoRoot, "playbooks");
const manifestPath = path.join(playbookRoot, "manifest.yaml");
const defaultOutputRoot = path.join(repoRoot, "artifacts", "os-wizard-package");
const iconSourcePath = path.join(repoRoot, "apps", "os-desktop", "resources", "redcore-icon.png");

function readArg(name, fallback = "") {
  const index = process.argv.indexOf(name);
  if (index !== -1 && process.argv[index + 1]) {
    return process.argv[index + 1];
  }
  return fallback;
}

function stripQuotes(value) {
  return value.replace(/^"/, "").replace(/"$/, "").replace(/^'/, "").replace(/'$/, "");
}

function xmlEscape(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function yamlQuote(value) {
  return `"${String(value).replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}

function parseManifest(text) {
  const lines = text.split(/\r?\n/);
  const phases = [];
  const profiles = {};
  const manifest = {
    name: "redcore-os-default",
    version: "1.0.0",
    description: "",
    author: "redcore",
    minWindowsBuild: 19041,
    maxWindowsBuild: 99999,
    wizardConfig: "wizard.json",
    phases,
    profiles,
  };

  let mode = "";
  let currentPhase = null;
  let currentProfile = null;
  let readingModules = false;

  for (const line of lines) {
    if (line.startsWith("name: ")) manifest.name = stripQuotes(line.slice(6).trim());
    if (line.startsWith("version: ")) manifest.version = stripQuotes(line.slice(9).trim());
    if (line.startsWith("description: ")) manifest.description = stripQuotes(line.slice(13).trim());
    if (line.startsWith("author: ")) manifest.author = stripQuotes(line.slice(8).trim());
    if (line.startsWith("minWindowsBuild: ")) manifest.minWindowsBuild = Number.parseInt(line.slice(17).trim(), 10);
    if (line.startsWith("maxWindowsBuild: ")) manifest.maxWindowsBuild = Number.parseInt(line.slice(17).trim(), 10);
    if (line.startsWith("wizardConfig: ")) manifest.wizardConfig = stripQuotes(line.slice(14).trim());

    if (line.startsWith("phases:")) {
      mode = "phases";
      currentPhase = null;
      readingModules = false;
      continue;
    }

    if (line.startsWith("profiles:")) {
      if (currentPhase) phases.push(currentPhase);
      currentPhase = null;
      mode = "profiles";
      currentProfile = null;
      readingModules = false;
      continue;
    }

    if (mode === "phases") {
      if (line.startsWith("  - id: ")) {
        if (currentPhase) phases.push(currentPhase);
        currentPhase = {
          id: line.slice(8).trim(),
          name: "",
          description: "",
          type: null,
          modules: [],
        };
        readingModules = false;
        continue;
      }

      if (!currentPhase) continue;

      if (line.startsWith("    name: ")) {
        currentPhase.name = stripQuotes(line.slice(10).trim());
        continue;
      }

      if (line.startsWith("    description: ")) {
        currentPhase.description = stripQuotes(line.slice(17).trim());
        continue;
      }

      if (line.startsWith("    type: ")) {
        currentPhase.type = line.slice(10).trim().split("#")[0].trim();
        continue;
      }

      if (line.startsWith("    modules:")) {
        readingModules = true;
        continue;
      }

      if (readingModules && line.startsWith("      - ")) {
        currentPhase.modules.push(line.slice(8).trim());
        continue;
      }

      if (readingModules && !line.startsWith("      - ")) {
        readingModules = false;
      }

      continue;
    }

    if (mode === "profiles") {
      const profileMatch = line.match(/^  ([a-z0-9_]+):\s*$/);
      if (profileMatch) {
        currentProfile = { id: profileMatch[1], label: profileMatch[1], preset: "", overrides: "" };
        profiles[currentProfile.id] = currentProfile;
        continue;
      }

      if (!currentProfile) continue;

      if (line.startsWith("    label: ")) currentProfile.label = stripQuotes(line.slice(11).trim());
      if (line.startsWith("    preset: ")) currentProfile.preset = stripQuotes(line.slice(12).trim());
      if (line.startsWith("    overrides: ")) currentProfile.overrides = stripQuotes(line.slice(15).trim());
    }
  }

  if (currentPhase) phases.push(currentPhase);
  return manifest;
}

function renderFeaturePage(page) {
  const required = page.isRequired !== undefined ? ` IsRequired="${page.isRequired ? "true" : "false"}"` : "";
  if (page.type === "RadioPage") {
    const options = page.options
      .map((option) => [
        "                <RadioOption>",
        `                    <Text>${xmlEscape(option.text)}</Text>`,
        `                    <Name>${xmlEscape(option.name)}</Name>`,
        "                </RadioOption>",
      ].join("\n"))
      .join("\n");
    return [
      `        <RadioPage DefaultOption="${xmlEscape(page.defaultOption)}"${required} Description="${xmlEscape(page.description)}">`,
      "            <Options>",
      options,
      "            </Options>",
      "        </RadioPage>",
    ].join("\n");
  }

  const options = page.options
    .map((option) => [
      `                <CheckboxOption IsChecked="${option.isChecked ? "true" : "false"}">`,
      `                    <Text>${xmlEscape(option.text)}</Text>`,
      `                    <Name>${xmlEscape(option.name)}</Name>`,
      "                </CheckboxOption>",
    ].join("\n"))
    .join("\n");
  return [
    `        <CheckboxPage${required} Description="${xmlEscape(page.description)}">`,
    "            <Options>",
    options,
    "            </Options>",
    "        </CheckboxPage>",
  ].join("\n");
}

function renderPlaybookConf(manifest, wizard) {
  const supportedBuilds = wizard.supportedBuilds
    .map((build) => `        <string>${build}</string>`)
    .join("\n");
  const requirements = wizard.requirements
    .map((requirement) => `        <Requirement>${xmlEscape(requirement)}</Requirement>`)
    .join("\n");
  const bulletPoints = (wizard.oobe?.bulletPoints ?? [])
    .map((point) => `            <BulletPoint Icon="${xmlEscape(point.icon)}" Title="${xmlEscape(point.title)}" Description="${xmlEscape(point.description)}"/>`)
    .join("\n");
  const featurePages = wizard.featurePages.map(renderFeaturePage).join("\n");

  return `<?xml version="1.0" encoding="utf-8"?>
<Playbook>
    <Name>${xmlEscape(manifest.name)}</Name>
    <Username>${xmlEscape(manifest.author)}</Username>
    <Title>${xmlEscape(wizard.title)}</Title>
    <ShortDescription>${xmlEscape(wizard.shortDescription)}</ShortDescription>
    <Description>${xmlEscape(wizard.description)}</Description>
    <Details>${xmlEscape(wizard.details)}</Details>
    <Version>${xmlEscape(wizard.version)}</Version>
    <UniqueId>${xmlEscape(wizard.uniqueId)}</UniqueId>
    <UpgradableFrom>${xmlEscape(wizard.upgradableFrom)}</UpgradableFrom>
    <SupportedBuilds>
${supportedBuilds}
    </SupportedBuilds>
    <Requirements>
${requirements}
    </Requirements>
    <UseKernelDriver>${wizard.useKernelDriver ? "true" : "false"}</UseKernelDriver>
    <ProductCode>${wizard.productCode}</ProductCode>
    <Git>${xmlEscape(wizard.git)}</Git>
    <Website>${xmlEscape(wizard.website)}</Website>
    <DonateLink>${xmlEscape(wizard.donateLink ?? wizard.website)}</DonateLink>
    <SupportsISO>${wizard.supportsISO ? "true" : "false"}</SupportsISO>
    <ISO>
        <DisableBitLocker>${wizard.iso?.disableBitLocker ? "true" : "false"}</DisableBitLocker>
        <DisableHardwareRequirements>${wizard.iso?.disableHardwareRequirements ? "true" : "false"}</DisableHardwareRequirements>
    </ISO>
    <OOBE>
        <BulletPoints>
${bulletPoints}
        </BulletPoints>
        <Internet>${xmlEscape(wizard.oobe?.internet ?? "Request")}</Internet>
    </OOBE>
    <FeaturePages>
${featurePages}
    </FeaturePages>
</Playbook>
`;
}

function renderConfigurationYaml(manifest, wizard) {
  const lines = [
    "---",
    `title: ${yamlQuote(wizard.title)}`,
    `description: ${yamlQuote(wizard.description)}`,
    "privilege: Admin",
    "wizardMetadata:",
    `  packageId: ${yamlQuote(wizard.packageId)}`,
    `  injectPath: ${yamlQuote(wizard.iso?.injectPath ?? "sources/$OEM$/$1/redcore/wizard")}`,
    "pipeline:",
  ];

  for (const phase of manifest.phases) {
    lines.push(`  - id: ${phase.id}`);
    lines.push(`    name: ${yamlQuote(phase.name)}`);
    lines.push(`    builtin: ${phase.type === "builtin" ? "true" : "false"}`);
    if (phase.modules.length > 0) {
      lines.push("    modules:");
      for (const modulePath of phase.modules) {
        lines.push(`      - ${yamlQuote(modulePath)}`);
      }
    }
  }

  lines.push("profiles:");
  for (const profile of Object.values(manifest.profiles)) {
    lines.push(`  - id: ${profile.id}`);
    lines.push(`    label: ${yamlQuote(profile.label)}`);
    lines.push(`    preset: ${yamlQuote(profile.preset || "balanced")}`);
    if (profile.overrides) {
      lines.push(`    overrides: ${yamlQuote(profile.overrides)}`);
    }
  }

  lines.push("optionMappings:");
  for (const page of wizard.featurePages) {
    if (page.type !== "CheckboxPage") continue;
    for (const option of page.options) {
      lines.push(`  - name: ${yamlQuote(option.name)}`);
      lines.push(`    label: ${yamlQuote(option.text)}`);
      if (option.mapsTo?.length) {
        lines.push("    mapsToActions:");
        for (const actionId of option.mapsTo) {
          lines.push(`      - ${yamlQuote(actionId)}`);
        }
      }
      if (option.mapsToProfiles?.length) {
        lines.push("    mapsToProfiles:");
        for (const profileId of option.mapsToProfiles) {
          lines.push(`      - ${yamlQuote(profileId)}`);
        }
      }
    }
  }

  return `${lines.join("\n")}\n`;
}

function main() {
  const outputRoot = path.resolve(readArg("--out-dir", defaultOutputRoot));
  const version = readArg("--version", "");
  const commit = readArg("--commit", "");
  const packageDir = path.join(outputRoot, "redcore-os-wizard-playbook");
  const srcDir = path.join(packageDir, "src");
  const configurationDir = path.join(srcDir, "Configuration");
  const payloadDir = path.join(packageDir, "payload");
  const zipPath = path.join(outputRoot, "redcore-os-wizard-playbook.zip");

  fs.rmSync(outputRoot, { recursive: true, force: true });
  fs.mkdirSync(configurationDir, { recursive: true });
  fs.mkdirSync(payloadDir, { recursive: true });

  const syncResult = spawnSync(
    "pnpm",
    ["--dir", "apps/os-desktop", "exec", "tsx", "../../scripts/sync-os-wizard-metadata.ts"],
    { cwd: repoRoot, stdio: "inherit" },
  );
  if (syncResult.status !== 0) {
    throw new Error("Failed to sync wizard metadata from desktop question model");
  }

  const manifestText = fs.readFileSync(manifestPath, "utf8");
  const manifest = parseManifest(manifestText);
  const wizardPath = path.join(playbookRoot, manifest.wizardConfig);
  const wizard = JSON.parse(fs.readFileSync(wizardPath, "utf8"));

  fs.writeFileSync(path.join(srcDir, "playbook.conf"), renderPlaybookConf(manifest, wizard));
  fs.writeFileSync(path.join(configurationDir, "main.yml"), renderConfigurationYaml(manifest, wizard));
  fs.writeFileSync(
    path.join(packageDir, "wizard-package.json"),
    `${JSON.stringify(
      {
        packageId: wizard.packageId,
        title: wizard.title,
        version: version || manifest.version,
        manifestVersion: manifest.version,
        commit,
        generatedAt: new Date().toISOString(),
        injectPath: wizard.iso?.injectPath ?? null,
      },
      null,
      2,
    )}\n`,
  );

  if (fs.existsSync(iconSourcePath)) {
    fs.copyFileSync(iconSourcePath, path.join(srcDir, "playbook.png"));
  }

  fs.cpSync(playbookRoot, path.join(payloadDir, "playbooks"), { recursive: true });

  const zipResult = spawnSync("zip", ["-qr", zipPath, "redcore-os-wizard-playbook"], {
    cwd: outputRoot,
    stdio: "inherit",
  });

  if (zipResult.status !== 0) {
    throw new Error("zip failed while building wizard package");
  }

  console.log(`Wizard package written to ${packageDir}`);
  console.log(`Wizard zip written to ${zipPath}`);
}

main();
