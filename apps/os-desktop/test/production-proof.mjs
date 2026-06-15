#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(appRoot, "..", "..");
const distRoot = path.join(appRoot, "dist", "renderer");
const indexPath = path.join(distRoot, "index.html");
const proofDir = path.join(repoRoot, "proof-screenshots-os");
const summaryPath = path.join(proofDir, "production-smoke-summary.json");

const checks = [];

function pass(name, detail) {
  checks.push({ name, passed: true, detail });
  console.log(`PASS: ${name}${detail ? ` - ${detail}` : ""}`);
}

function fail(name, detail) {
  checks.push({ name, passed: false, detail });
  console.error(`FAIL: ${name}${detail ? ` - ${detail}` : ""}`);
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function normalizeAssetRef(ref) {
  if (ref.startsWith("./")) return ref.slice(2);
  return ref;
}

mkdirSync(proofDir, { recursive: true });

const pkg = readJson(path.join(appRoot, "package.json"));
const tauriConfig = readJson(path.join(appRoot, "src-tauri", "tauri.conf.json"));
const productionConfig = readJson(path.join(appRoot, "src-tauri", "tauri.conf.production.json"));

if (!existsSync(indexPath)) {
  fail("renderer-build-exists", `${path.relative(repoRoot, indexPath)} not found; run pnpm --dir apps/os-desktop build first`);
} else {
  pass("renderer-build-exists", path.relative(repoRoot, indexPath));

  const html = readFileSync(indexPath, "utf8");
  if (html.includes('<div id="root">')) {
    pass("renderer-root-present");
  } else {
    fail("renderer-root-present", "index.html has no root mount element");
  }

  if (!html.includes("/src/renderer/main.tsx")) {
    pass("renderer-uses-built-entrypoints");
  } else {
    fail("renderer-uses-built-entrypoints", "development entrypoint leaked into production HTML");
  }

  const assetRefs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
    .map((match) => normalizeAssetRef(match[1]))
    .filter((ref) => ref.startsWith("assets/"));
  const missingAssets = assetRefs.filter((ref) => !existsSync(path.join(distRoot, ref)));
  const emptyAssets = assetRefs.filter((ref) => {
    const assetPath = path.join(distRoot, ref);
    return existsSync(assetPath) && statSync(assetPath).size === 0;
  });

  if (assetRefs.length > 0 && missingAssets.length === 0 && emptyAssets.length === 0) {
    pass("renderer-assets-resolve", `${assetRefs.length} referenced assets`);
  } else {
    fail("renderer-assets-resolve", `missing=${missingAssets.join(",") || "none"} empty=${emptyAssets.join(",") || "none"}`);
  }

  const jsAssets = assetRefs.filter((ref) => ref.endsWith(".js"));
  const cssAssets = assetRefs.filter((ref) => ref.endsWith(".css"));
  if (jsAssets.length > 0 && cssAssets.length > 0) {
    pass("renderer-js-css-present", `js=${jsAssets.length} css=${cssAssets.length}`);
  } else {
    fail("renderer-js-css-present", `js=${jsAssets.length} css=${cssAssets.length}`);
  }

  const jsBundle = jsAssets
    .map((ref) => readFileSync(path.join(distRoot, ref), "utf8"))
    .join("\n");
  if (jsBundle.includes("Tauri runtime unavailable") && jsBundle.includes("service_call")) {
    pass("renderer-tauri-bridge-bundled");
  } else {
    fail("renderer-tauri-bridge-bundled", "Tauri service bridge markers were not found in built JS");
  }
}

if (tauriConfig.productName === "OudenOS" && tauriConfig.identifier === "cc.ouden.os") {
  pass("tauri-brand-config", `${tauriConfig.productName} / ${tauriConfig.identifier}`);
} else {
  fail("tauri-brand-config", `productName=${tauriConfig.productName} identifier=${tauriConfig.identifier}`);
}

if (tauriConfig.version === pkg.version) {
  pass("tauri-version-matches-package", pkg.version);
} else {
  fail("tauri-version-matches-package", `package=${pkg.version} tauri=${tauriConfig.version}`);
}

if (tauriConfig.build?.frontendDist === "../dist/renderer") {
  pass("tauri-front-end-dist-configured", tauriConfig.build.frontendDist);
} else {
  fail("tauri-front-end-dist-configured", String(tauriConfig.build?.frontendDist));
}

if (tauriConfig.app?.withGlobalTauri === true) {
  pass("tauri-global-api-enabled");
} else {
  fail("tauri-global-api-enabled", "withGlobalTauri must stay enabled for the renderer platform backend");
}

const productionResources = productionConfig.bundle?.resources ?? {};
if (productionResources["../../../services/os-service/target/release/oudenos-os-service.exe"] === "oudenos-os-service.exe") {
  pass("production-service-resource-configured");
} else {
  fail("production-service-resource-configured", "release service executable is not configured as a bundled resource");
}

const failed = checks.filter((check) => !check.passed);
const summary = {
  verdict: failed.length === 0 ? "PASS" : "FAIL",
  app: pkg.name,
  version: pkg.version,
  generatedAt: new Date().toISOString(),
  checks,
};

writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
console.log(`Summary: ${path.relative(repoRoot, summaryPath)}`);

if (failed.length > 0) {
  process.exit(1);
}
