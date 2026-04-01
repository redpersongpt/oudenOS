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
  const icoSizes = [16, 24, 32, 48, 64, 128, 256];
  const pngBuffers = [];

  let sharp;
  try {
    sharp = (await import("sharp")).default;
  } catch {
    console.log("  SKIP: ICO generation — sharp not available");
    return;
  }

  const svgBuffer = Buffer.from(ICON_SVG);

  for (const size of icoSizes) {
    const png = await sharp(svgBuffer, { density: 300 })
      .resize(size, size)
      .png()
      .toBuffer();
    pngBuffers.push({ size, data: png });
  }

  // Build ICO file manually (Vista+ format: 256x256 stored as PNG inside ICO)
  const numImages = pngBuffers.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  let dataOffset = headerSize + dirEntrySize * numImages;

  const parts = [];

  // ICO header (6 bytes)
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);         // Reserved
  header.writeUInt16LE(1, 2);         // Type: 1 = ICO
  header.writeUInt16LE(numImages, 4); // Number of images
  parts.push(header);

  // Directory entries (16 bytes each)
  for (const { size, data } of pngBuffers) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0); // Width (0 means 256)
    entry.writeUInt8(size >= 256 ? 0 : size, 1); // Height (0 means 256)
    entry.writeUInt8(0, 2);                       // Color palette
    entry.writeUInt8(0, 3);                       // Reserved
    entry.writeUInt16LE(1, 4);                    // Color planes
    entry.writeUInt16LE(32, 6);                   // Bits per pixel
    entry.writeUInt32LE(data.length, 8);          // Size of image data
    entry.writeUInt32LE(dataOffset, 12);          // Offset to image data
    parts.push(entry);
    dataOffset += data.length;
  }

  // Image data (raw PNG buffers — Windows uses PNG compression for 256x256)
  for (const { data } of pngBuffers) {
    parts.push(data);
  }

  const icoBuffer = Buffer.concat(parts);
  const icoPath = join(OS_RESOURCES, "redcore-icon.ico");
  writeFileSync(icoPath, icoBuffer);
  console.log(`  [wrote] redcore-icon.ico (${numImages} sizes, ${Math.round(icoBuffer.length / 1024)}KB)`);
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
