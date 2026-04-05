#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const playbookRoot = path.join(repoRoot, "playbooks");
const manifestPath = path.join(playbookRoot, "manifest.yaml");
const outputPath = path.join(
  repoRoot,
  "apps/os-desktop/src/renderer/lib/generated-playbook-fallback.json",
);
const supportedExecutionKinds = [
  "registryChanges",
  "serviceChanges",
  "bcdChanges",
  "powerChanges",
  "powerShellCommands",
  "packages",
  "tasks",
];
const transformerFallbackAdditions = [
  {
    phaseId: "networking",
    action: {
      id: "network.disable-teredo",
      name: "Disable Teredo Tunneling",
      description: "Disable Teredo IPv6 tunneling which encapsulates IPv6 packets within IPv4 UDP datagrams, adding latency overhead.",
      risk: "safe",
      default: false,
      expertOnly: false,
      requiresReboot: false,
      warningMessage: null,
      blockedProfiles: [],
      minWindowsBuild: null,
      executionKinds: ["registryChanges", "powerShellCommands"],
    },
  },
  {
    phaseId: "networking",
    action: {
      id: "network.disable-netbios",
      name: "Disable NetBIOS over TCP/IP",
      description: "Disable NetBIOS over TCP/IP by setting NodeType to P-node (2) and NetbiosOptions to disabled (2), preventing NetBIOS name resolution and session services.",
      risk: "low",
      default: false,
      expertOnly: false,
      requiresReboot: true,
      warningMessage: null,
      blockedProfiles: ["work_pc"],
      minWindowsBuild: null,
      executionKinds: ["registryChanges"],
    },
  },
  {
    phaseId: "networking",
    action: {
      id: "network.disable-nagle",
      name: "Disable Nagle's Algorithm (TCPNoDelay)",
      description: "Disable Nagle's algorithm and set TCP acknowledgement frequency to 1, sending small packets immediately instead of buffering them.",
      risk: "low",
      default: false,
      expertOnly: false,
      requiresReboot: false,
      warningMessage: null,
      blockedProfiles: [],
      minWindowsBuild: null,
      executionKinds: ["registryChanges"],
    },
  },
  {
    phaseId: "networking",
    action: {
      id: "network.rss-queues-2",
      name: "Set RSS Queues to 2",
      description: "Configure Receive Side Scaling to use 2 RSS queues, distributing NIC interrupt processing across 2 CPU cores without over-allocating.",
      risk: "low",
      default: false,
      expertOnly: false,
      requiresReboot: false,
      warningMessage: null,
      blockedProfiles: [],
      minWindowsBuild: null,
      executionKinds: ["registryChanges"],
    },
  },
];

function stripQuotes(value) {
  return value.replace(/^"/, "").replace(/"$/, "").replace(/^'/, "").replace(/'$/, "");
}

function parseManifest(text) {
  const lines = text.split(/\r?\n/);
  const phases = [];
  const profiles = {};

  let mode = "";
  let currentPhase = null;
  let currentProfile = null;
  let readingModules = false;

  for (const line of lines) {
    if (line.startsWith("name: ")) {
      continue;
    }

    if (line.startsWith("version: ")) {
      continue;
    }

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
        currentProfile = { id: profileMatch[1], overrides: null };
        profiles[currentProfile.id] = currentProfile;
        continue;
      }

      if (!currentProfile) continue;

      if (line.startsWith("    overrides: ")) {
        currentProfile.overrides = line.slice(15).trim();
      }
    }
  }

  if (currentPhase) phases.push(currentPhase);
  return { phases, profiles };
}

function parseActionChunk(chunk) {
  const lines = chunk.split(/\r?\n/);
  const action = {
    id: lines[0].trim(),
    name: "",
    description: "",
    risk: "safe",
    default: true,
    expertOnly: false,
    requiresReboot: false,
    warningMessage: null,
    blockedProfiles: [],
    minWindowsBuild: null,
    executionKinds: [],
  };

  let inBlockedProfiles = false;

  for (let index = 1; index < lines.length; index += 1) {
    const line = lines[index];

    if (line.startsWith("    name: ")) {
      action.name = stripQuotes(line.slice(10).trim());
      continue;
    }

    if (line.startsWith("    description: ")) {
      action.description = stripQuotes(line.slice(17).trim());
      continue;
    }

    if (line.startsWith("    risk: ")) {
      action.risk = line.slice(10).trim();
      continue;
    }

    if (line.startsWith("    default: ")) {
      action.default = line.slice(13).trim() === "true";
      continue;
    }

    if (line.startsWith("    expertOnly: ")) {
      action.expertOnly = line.slice(16).trim() === "true";
      continue;
    }

    if (line.startsWith("    requiresReboot: ")) {
      action.requiresReboot = line.slice(20).trim() === "true";
      continue;
    }

    if (line.startsWith("    warningMessage: ")) {
      action.warningMessage = stripQuotes(line.slice(20).trim());
      continue;
    }

    if (line.startsWith("    minWindowsBuild: ")) {
      action.minWindowsBuild = Number.parseInt(line.slice(21).trim(), 10);
      continue;
    }

    if (line.startsWith("    blockedProfiles:")) {
      const inline = line.slice(20).trim();
      if (inline.startsWith("[")) {
        action.blockedProfiles = inline
          .replace(/[[\]]/g, "")
          .split(",")
          .map((value) => stripQuotes(value.trim()))
          .filter(Boolean);
        inBlockedProfiles = false;
      } else {
        inBlockedProfiles = true;
      }
      continue;
    }

    const executionKind = supportedExecutionKinds.find((key) => line.startsWith(`    ${key}:`));
    if (executionKind) {
      if (!action.executionKinds.includes(executionKind)) {
        action.executionKinds.push(executionKind);
      }
      continue;
    }

    if (inBlockedProfiles && line.startsWith("      - ")) {
      action.blockedProfiles.push(stripQuotes(line.slice(8).trim()));
      continue;
    }

    if (inBlockedProfiles && !line.startsWith("      - ")) {
      inBlockedProfiles = false;
    }
  }

  return action;
}

function parseModule(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  const marker = "\nactions:\n";
  const actionStart = text.indexOf(marker);
  if (actionStart === -1) return [];

  const actionText = `\n${text.slice(actionStart + marker.length)}`;
  return actionText
    .split(/\n  - id: /)
    .slice(1)
    .map((chunk) => parseActionChunk(chunk.trimStart().replace(/^id: /, "")));
}

function parseProfileOverride(filePath) {
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  const profile = {
    blockedActions: [],
    optionalActions: [],
  };

  let mode = "";

  for (const line of lines) {
    if (line.startsWith("blockedActions:")) {
      mode = "blocked";
      continue;
    }

    if (line.startsWith("optionalActions:")) {
      mode = "optional";
      continue;
    }

    if (line.startsWith("preservationFlags:")) {
      mode = "";
      continue;
    }

    if (mode === "blocked") {
      if (line.startsWith("  - ")) {
        profile.blockedActions.push(line.slice(4).trim().split("#")[0].trim());
        continue;
      }

      if (line.trim() && !line.trim().startsWith("#")) {
        mode = "";
      }
      continue;
    }

    if (mode === "optional") {
      if (line.startsWith("  - ")) {
        profile.optionalActions.push(line.slice(4).trim().split("#")[0].trim());
        continue;
      }

      if (line.trim() && !line.trim().startsWith("#")) {
        mode = "";
      }
    }
  }

  return profile;
}

function main() {
  const manifestText = fs.readFileSync(manifestPath, "utf8");
  const manifest = parseManifest(manifestText);

  const name = stripQuotes(
    manifestText.match(/^name:\s*"([^"]+)"/m)?.[1] ?? "redcore-os-default",
  );
  const version = stripQuotes(
    manifestText.match(/^version:\s*"([^"]+)"/m)?.[1] ?? "1.0.0",
  );

  const output = {
    playbookName: name,
    playbookVersion: version,
    phases: [],
    profiles: {},
  };

  for (const [profileId, ref] of Object.entries(manifest.profiles)) {
    output.profiles[profileId] = ref.overrides
      ? parseProfileOverride(path.join(playbookRoot, ref.overrides))
      : { blockedActions: [], optionalActions: [] };
  }

  for (const phase of manifest.phases) {
    if (phase.type === "builtin") continue;

    const serializedPhase = {
      id: phase.id,
      name: phase.name,
      actions: [],
    };

    for (const modulePath of phase.modules) {
      const absoluteModulePath = path.join(playbookRoot, modulePath);
      if (!fs.existsSync(absoluteModulePath)) continue;
      serializedPhase.actions.push(...parseModule(absoluteModulePath));
    }

    if (serializedPhase.actions.length > 0) {
      output.phases.push(serializedPhase);
    }
  }

  for (const { phaseId, action } of transformerFallbackAdditions) {
    const phase = output.phases.find((entry) => entry.id === phaseId);
    if (!phase) continue;
    if (phase.actions.some((entry) => entry.id === action.id)) continue;
    phase.actions.push(action);
  }

  fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);

  const totalActions = output.phases.reduce(
    (sum, phase) => sum + phase.actions.length,
    0,
  );

  console.log(
    `Wrote ${path.relative(repoRoot, outputPath)} with ${output.phases.length} phases and ${totalActions} actions.`,
  );
}

main();
