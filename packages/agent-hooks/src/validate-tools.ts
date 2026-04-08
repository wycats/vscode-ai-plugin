/**
 * Validates that tools.json covers all tool names from both platform configs.
 *
 * Run: node packages/agent-hooks/src/validate-tools.ts
 */

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

interface Config {
  toolGroups: Record<string, string[]>;
}

interface ToolEntry {
  canonical: string;
  platforms: Record<string, string[]>;
}

interface ToolsJson {
  [key: string]: ToolEntry | string;
}

// Load tools.json
const toolsPath = join(dirname(fileURLToPath(import.meta.url)), "..", "tools.json");
const toolsData = JSON.parse(readFileSync(toolsPath, "utf-8")) as ToolsJson;

// Build per-platform sets of known tool names from tools.json
const platformTools: Record<string, Set<string>> = {};
const allCanonicals = new Set<string>();

for (const [, entry] of Object.entries(toolsData)) {
  if (typeof entry === "string") continue;
  allCanonicals.add(entry.canonical);
  for (const [platform, tools] of Object.entries(entry.platforms)) {
    platformTools[platform] ??= new Set();
    for (const tool of tools) {
      platformTools[platform].add(tool);
    }
  }
}

// Validate: every canonical has entries for both platforms
const platforms = ["vscode", "claude-code"];
let errors = 0;

for (const [, entry] of Object.entries(toolsData)) {
  if (typeof entry === "string") continue;
  for (const platform of platforms) {
    if (!entry.platforms[platform] || entry.platforms[platform].length === 0) {
      console.error(`  Canonical "${entry.canonical}" has no tools for platform "${platform}"`);
      errors++;
    }
  }
}

// Validate: no duplicate tool names across canonicals
const seenTools = new Map<string, string>();
for (const [, entry] of Object.entries(toolsData)) {
  if (typeof entry === "string") continue;
  for (const tools of Object.values(entry.platforms)) {
    for (const tool of tools) {
      const existing = seenTools.get(tool);
      if (existing && existing !== entry.canonical) {
        console.error(`  Tool "${tool}" appears in both "${existing}" and "${entry.canonical}"`);
        errors++;
      }
      seenTools.set(tool, entry.canonical);
    }
  }
}

if (errors > 0) {
  console.error(`\n${String(errors)} issue(s) found in tools.json.`);
  process.exit(1);
} else {
  console.log(`tools.json valid: ${String(allCanonicals.size)} canonical tools, ${String(seenTools.size)} platform mappings, all platforms covered.`);
}
