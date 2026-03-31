#!/usr/bin/env node
// ─── Generate App Icons ────────────────────────────────────────────────────
// Generates production-grade app icons from the SVG mark.
// Outputs PNG files at required sizes + ICO with all sizes embedded.
//
// Requires: sharp (installed as devDep or via npx)
// Usage: node scripts/generate-app-icons.mjs

import { writeFileSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OS_RESOURCES = join(ROOT, "apps/os-desktop/resources");

// The hexagonal mark SVG — dark bg, transparent-safe, visible at all sizes
// Uses the same design as Logo.tsx LogoMark but optimized for icon rendering
const ICON_SVG = `<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="96" fill="#1e1e22"/>
  <path d="M256 64L448 175v222L256 508 64 397V175L256 64z" fill="#E8254B" opacity="0.15"/>
  <path d="M256 64L448 175v222L256 508 64 397V175L256 64z" stroke="#E8254B" stroke-width="12" fill="none"/>
  <circle cx="256" cy="286" r="120" stroke="#E8254B" stroke-width="12" fill="none" opacity="0.45"/>
  <circle cx="256" cy="286" r="64" fill="#E8254B"/>
  <path d="M352 172l24-14" stroke="#E8254B" stroke-width="10" stroke-linecap="round" opacity="0.6"/>
  <path d="M136 172l-24-14" stroke="#E8254B" stroke-width="10" stroke-linecap="round" opacity="0.3"/>
</svg>`;

// Write the updated SVG
writeFileSync(join(OS_RESOURCES, "icon.svg"), ICON_SVG);
console.log("  [wrote] icon.svg (512x512 mark, dark bg, rounded corners)");

// Generate PNGs at required sizes using sharp
const sizes = [16, 24, 32, 48, 64, 128, 256, 512];

async function generatePngs() {
  let sharp;
  try {
    sharp = (await import("sharp")).default;
  } catch {
    console.error("  sharp not available — install: pnpm add -D sharp");
    console.log("  Falling back to sips for PNG generation...");
    // Use sips on macOS as fallback — can resize PNGs but not render SVG
    // We'll write the SVG and instruct the user to use a proper tool
    console.log("  Manual step needed: render icon.svg to PNGs at sizes:", sizes.join(", "));
    return false;
  }

  const svgBuffer = Buffer.from(ICON_SVG);

  for (const size of sizes) {
    const png = await sharp(svgBuffer, { density: 300 })
      .resize(size, size)
      .png()
      .toBuffer();

    const filename = size === 512 ? "redcore-icon.png" : `icon-${size}.png`;
    writeFileSync(join(OS_RESOURCES, filename), png);
    console.log(`  [wrote] ${filename} (${size}x${size})`);
  }

  // Also write the main icon.png (256x256)
  const icon256 = await sharp(svgBuffer, { density: 300 })
    .resize(256, 256)
    .png()
    .toBuffer();
  writeFileSync(join(OS_RESOURCES, "icon.png"), icon256);
  console.log("  [wrote] icon.png (256x256)");

  // Write favicon.png (32x32)
  const favicon = await sharp(svgBuffer, { density: 300 })
    .resize(32, 32)
    .png()
    .toBuffer();
  writeFileSync(join(OS_RESOURCES, "favicon.png"), favicon);
  console.log("  [wrote] favicon.png (32x32)");

  return true;
}

async function generateIco() {
  // Use png-to-ico to create multi-size ICO from the PNG files
  const requiredSizes = [16, 24, 32, 48, 64, 128, 256];
  const pngPaths = requiredSizes.map(s => {
    const filename = s === 256 ? "icon.png" : `icon-${s}.png`;
    return join(OS_RESOURCES, filename);
  });

  // Check all PNGs exist
  const { existsSync } = await import("node:fs");
  const allExist = pngPaths.every(p => existsSync(p));
  if (!allExist) {
    console.log("  SKIP: ICO generation — not all PNG sizes available");
    return;
  }

  try {
    const icoPath = join(OS_RESOURCES, "redcore-icon.ico");
    execSync(`npx -y png-to-ico ${pngPaths.join(" ")} > "${icoPath}"`, {
      cwd: ROOT,
      stdio: ["pipe", "pipe", "pipe"],
      shell: true,
    });
    console.log("  [wrote] redcore-icon.ico (multi-size)");
  } catch (e) {
    console.error("  FAIL: ICO generation failed:", e.message);
  }
}

console.log("");
console.log("  redcore OS — Icon Generation");
console.log("  ────────────────────────────");

const pngsOk = await generatePngs();
if (pngsOk) {
  await generateIco();
}

console.log("");
console.log("  Done. Review icons in apps/os-desktop/resources/");
console.log("");
