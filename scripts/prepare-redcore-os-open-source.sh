#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUTPUT_DIR="${1:-$ROOT_DIR/artifacts/open-source/redcore-os}"
REPO_SLUG="${PUBLIC_REPO_SLUG:-redpersongpt/redcoreOS}"
WEBSITE_URL="${PUBLIC_WEBSITE_URL:-https://redcoreos.net}"
SUPPORT_EMAIL="${PUBLIC_SUPPORT_EMAIL:-support@redcoreos.net}"

rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR/apps" "$OUTPUT_DIR/services"

copy_tree() {
  local source_path="$1"
  local target_path="$2"
  mkdir -p "$target_path"
  rsync -a \
    --exclude "dist" \
    --exclude "node_modules" \
    --exclude ".turbo" \
    --exclude ".next" \
    "$source_path" "$target_path"
}

copy_tree "$ROOT_DIR/apps/os-desktop/" "$OUTPUT_DIR/apps/os-desktop/"
copy_tree "$ROOT_DIR/services/os-service/" "$OUTPUT_DIR/services/os-service/"
copy_tree "$ROOT_DIR/playbooks/" "$OUTPUT_DIR/playbooks/"
copy_tree "$ROOT_DIR/templates/open-source/redcore-os/" "$OUTPUT_DIR/"

REPO_SLUG="$REPO_SLUG" WEBSITE_URL="$WEBSITE_URL" SUPPORT_EMAIL="$SUPPORT_EMAIL" OUTPUT_DIR="$OUTPUT_DIR" node <<'NODE'
const fs = require("node:fs");
const path = require("node:path");

const outputDir = process.env.OUTPUT_DIR;
const repoSlug = process.env.REPO_SLUG;
const websiteUrl = process.env.WEBSITE_URL;
const supportEmail = process.env.SUPPORT_EMAIL;

const replacePlaceholders = (content) =>
  content
    .replaceAll("__REPO_SLUG__", repoSlug)
    .replaceAll("__WEBSITE_URL__", websiteUrl)
    .replaceAll("__SUPPORT_EMAIL__", supportEmail);

const stripStandaloneComments = (content) => {
  const lines = content.split("\n");
  const cleaned = [];
  let insideBlockComment = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (insideBlockComment) {
      if (trimmed.includes("*/")) {
        insideBlockComment = false;
      }
      continue;
    }

    if (/^\/\//.test(trimmed)) {
      continue;
    }

    if (/^\/\*/.test(trimmed)) {
      if (!trimmed.includes("*/")) {
        insideBlockComment = true;
      }
      continue;
    }

    cleaned.push(line);
  }

  return cleaned.join("\n").replace(/\n{3,}/g, "\n\n");
};

const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }
    const ext = path.extname(entry.name);
    const templated = [".md", ".json", ".yaml", ".yml", ".txt", ".gitignore"].includes(ext) || entry.name === ".gitignore";
    const source = fs.readFileSync(fullPath, "utf8");
    let next = source;
    if (templated) {
      next = replacePlaceholders(next);
    }
    if ([".ts", ".tsx", ".rs"].includes(ext)) {
      next = stripStandaloneComments(next);
    }
    if (next !== source) {
      fs.writeFileSync(fullPath, next);
    }
  }
};

walk(outputDir);

const desktopPackagePath = path.join(outputDir, "apps", "os-desktop", "package.json");
const desktopPackage = JSON.parse(fs.readFileSync(desktopPackagePath, "utf8"));
desktopPackage.author = { name: "redcore", email: supportEmail };
desktopPackage.homepage = websiteUrl;
desktopPackage.scripts["tauri:build"] = "cargo tauri build";
fs.writeFileSync(desktopPackagePath, JSON.stringify(desktopPackage, null, 2) + "\n");
NODE

bash "$ROOT_DIR/scripts/check-redcore-os-open-source.sh" "$OUTPUT_DIR"

echo "Prepared public repo at: $OUTPUT_DIR"
