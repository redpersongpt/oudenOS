#!/usr/bin/env node
// Generate technical details JSON from YAML playbooks.
// Reads playbooks/**/*.yaml and extracts technical fields per action ID.
// Output: apps/os-desktop/src/renderer/lib/generated-technical-details.json

import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const PLAYBOOKS_DIR = join(ROOT, "playbooks");
const OUTPUT = join(
  ROOT,
  "apps/os-desktop/src/renderer/lib/generated-technical-details.json",
);

// ---------------------------------------------------------------------------
// Minimal YAML parser — only needs to handle the consistent playbook format.
// Uses indentation-based block parsing.
// ---------------------------------------------------------------------------

/**
 * Parse a simple YAML value (scalar, inline array, etc.)
 */
function parseScalar(raw) {
  const trimmed = raw.trim();
  if (trimmed === "" || trimmed === "~" || trimmed === "null") return null;
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  // Inline array: [a, b, c]
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    return trimmed
      .slice(1, -1)
      .split(",")
      .map((s) => s.trim().replace(/^["']|["']$/g, ""))
      .filter(Boolean);
  }
  // Number
  if (/^-?\d+$/.test(trimmed)) return parseInt(trimmed, 10);
  if (/^-?\d+\.\d+$/.test(trimmed)) return parseFloat(trimmed);
  // Quoted string — unescape common YAML escapes
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).replace(/\\\\/g, "\\");
  }
  return trimmed;
}

/**
 * Parse lines of YAML into a nested JS structure.
 * Handles only the subset used by playbooks: mappings, sequences of mappings,
 * sequences of scalars, and scalar values.
 */
function parseYamlLines(lines, startIdx, baseIndent) {
  const result = {};
  let i = startIdx;

  while (i < lines.length) {
    const line = lines[i];
    // Skip empty / comment lines
    if (line.trim() === "" || line.trim().startsWith("#")) {
      i++;
      continue;
    }
    const indent = line.search(/\S/);
    if (indent < baseIndent) break; // Dedented — parent scope
    if (indent > baseIndent) {
      i++;
      continue;
    } // Shouldn't happen at this level, skip

    // Sequence item: "- key: val" or "- scalar"
    if (line.trim().startsWith("- ")) {
      // This is a sequence at this indent — caller handles via parseSequence
      break;
    }

    // Mapping: "key: value"
    const mapMatch = line.match(/^(\s*)([\w\-.]+):\s*(.*)/);
    if (!mapMatch) {
      i++;
      continue;
    }
    const key = mapMatch[2];
    const inlineVal = mapMatch[3].trim();

    if (inlineVal && !inlineVal.startsWith("#")) {
      result[key] = parseScalar(inlineVal);
      i++;
    } else {
      // Check next non-empty line's indent to determine sub-structure
      let nextIdx = i + 1;
      while (
        nextIdx < lines.length &&
        (lines[nextIdx].trim() === "" || lines[nextIdx].trim().startsWith("#"))
      ) {
        nextIdx++;
      }
      if (nextIdx >= lines.length || lines[nextIdx].search(/\S/) <= indent) {
        result[key] = null;
        i++;
      } else {
        const nextIndent = lines[nextIdx].search(/\S/);
        const nextTrimmed = lines[nextIdx].trim();
        if (nextTrimmed.startsWith("- ")) {
          const { items, endIdx } = parseSequence(lines, nextIdx, nextIndent);
          result[key] = items;
          i = endIdx;
        } else {
          const { obj, endIdx } = parseMapping(lines, nextIdx, nextIndent);
          result[key] = obj;
          i = endIdx;
        }
      }
    }
  }
  return { obj: result, endIdx: i };
}

function parseMapping(lines, startIdx, baseIndent) {
  return parseYamlLines(lines, startIdx, baseIndent);
}

function parseSequence(lines, startIdx, baseIndent) {
  const items = [];
  let i = startIdx;

  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === "" || line.trim().startsWith("#")) {
      i++;
      continue;
    }
    const indent = line.search(/\S/);
    if (indent < baseIndent) break;
    if (indent > baseIndent) {
      i++;
      continue;
    }

    if (!line.trim().startsWith("- ")) break;

    // "- key: val" or "- scalar"
    const afterDash = line.trim().slice(2);
    const kvMatch = afterDash.match(/^([\w\-.]+):\s*(.*)/);

    if (kvMatch) {
      // Mapping item — first key is on same line as dash
      const firstKey = kvMatch[1];
      const firstVal = kvMatch[2].trim();
      const item = {};
      item[firstKey] =
        firstVal && !firstVal.startsWith("#") ? parseScalar(firstVal) : null;
      i++;
      // Continue reading mapping keys at indent + 2 (aligned after "- ")
      const subIndent = indent + 2;
      while (i < lines.length) {
        const subLine = lines[i];
        if (subLine.trim() === "" || subLine.trim().startsWith("#")) {
          i++;
          continue;
        }
        const subLnIndent = subLine.search(/\S/);
        if (subLnIndent < subIndent) break;
        if (subLine.trim().startsWith("- ") && subLnIndent === baseIndent)
          break;

        const subKv = subLine.match(/^(\s*)([\w\-.]+):\s*(.*)/);
        if (subKv && subLnIndent === subIndent) {
          const sk = subKv[2];
          const sv = subKv[3].trim();
          if (sv && !sv.startsWith("#")) {
            item[sk] = parseScalar(sv);
            i++;
          } else {
            // Check for nested block
            let nextIdx = i + 1;
            while (
              nextIdx < lines.length &&
              (lines[nextIdx].trim() === "" ||
                lines[nextIdx].trim().startsWith("#"))
            ) {
              nextIdx++;
            }
            if (
              nextIdx < lines.length &&
              lines[nextIdx].search(/\S/) > subIndent
            ) {
              const nestedIndent = lines[nextIdx].search(/\S/);
              if (lines[nextIdx].trim().startsWith("- ")) {
                const { items: nestedItems, endIdx } = parseSequence(
                  lines,
                  nextIdx,
                  nestedIndent,
                );
                item[sk] = nestedItems;
                i = endIdx;
              } else {
                const { obj, endIdx } = parseMapping(
                  lines,
                  nextIdx,
                  nestedIndent,
                );
                item[sk] = obj;
                i = endIdx;
              }
            } else {
              item[sk] = null;
              i++;
            }
          }
        } else {
          i++;
        }
      }
      items.push(item);
    } else {
      // Scalar item: "- someValue"
      items.push(parseScalar(afterDash));
      i++;
    }
  }
  return { items, endIdx: i };
}

function parseYaml(text) {
  const lines = text.split("\n");
  const { obj } = parseYamlLines(lines, 0, 0);
  return obj;
}

// ---------------------------------------------------------------------------
// Walk playbooks and extract technical details
// ---------------------------------------------------------------------------

const TECHNICAL_KEYS = [
  "registryChanges",
  "serviceChanges",
  "packages",
  "fileRenames",
  "bcdChanges",
  "powerChanges",
];

function walkDir(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      files.push(...walkDir(full));
    } else if (entry.endsWith(".yaml")) {
      files.push(full);
    }
  }
  return files;
}

const lookup = {};
const yamlFiles = walkDir(PLAYBOOKS_DIR);

for (const filePath of yamlFiles) {
  const text = readFileSync(filePath, "utf-8");
  let doc;
  try {
    doc = parseYaml(text);
  } catch (err) {
    console.warn(`WARN: Failed to parse ${filePath}: ${err.message}`);
    continue;
  }

  const actions = doc.actions;
  if (!Array.isArray(actions)) continue;

  for (const action of actions) {
    if (!action || !action.id) continue;

    const details = {};
    let hasTechnical = false;

    for (const key of TECHNICAL_KEYS) {
      if (action[key] && (Array.isArray(action[key]) ? action[key].length > 0 : true)) {
        details[key] = action[key];
        hasTechnical = true;
      }
    }

    if (hasTechnical) {
      lookup[action.id] = details;
    }
  }
}

const actionCount = Object.keys(lookup).length;
writeFileSync(OUTPUT, JSON.stringify(lookup, null, 2) + "\n");
console.log(
  `Generated technical details for ${actionCount} actions -> ${OUTPUT}`,
);
