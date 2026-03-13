/**
 * Validates the plugin source tree:
 * - Every skill directory has a SKILL.md with valid frontmatter
 * - Every agent file has valid frontmatter with a description
 * - plugin.json references only files that exist
 * - Skill directory names match the `name` field in SKILL.md
 */

import { readFile, stat } from "node:fs/promises";
import { join, basename, dirname } from "node:path";

interface PluginEntry {
  path: string;
}

interface PluginJson {
  skills?: PluginEntry[];
  agents?: PluginEntry[];
  prompts?: PluginEntry[];
}

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");

let errors = 0;

function error(msg: string) {
  console.error(`  ERROR: ${msg}`);
  errors++;
}

function extractFrontmatter(content: string): Record<string, string> | null {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;

  const fields: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const colonIdx = line.indexOf(":");
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim();
      const value = line
        .slice(colonIdx + 1)
        .trim()
        .replace(/^["']|["']$/g, "");
      fields[key] = value;
    }
  }
  return fields;
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function validatePluginJson() {
  console.log("Checking plugin.json...");
  const pluginPath = join(ROOT, "plugin.json");

  if (!(await fileExists(pluginPath))) {
    error("plugin.json not found. Run `npm run build` first.");
    return;
  }

  const plugin = JSON.parse(await readFile(pluginPath, "utf-8")) as PluginJson;

  for (const section of ["skills", "agents", "prompts"] as const) {
    const entries = plugin[section] ?? [];
    for (const entry of entries) {
      const fullPath = join(ROOT, entry.path);
      if (!(await fileExists(fullPath))) {
        error(`${section} entry references missing file: ${entry.path}`);
      }
    }
  }
}

async function validateSkills() {
  console.log("Checking skills...");
  const plugin = JSON.parse(
    await readFile(join(ROOT, "plugin.json"), "utf-8"),
  ) as PluginJson;

  for (const entry of plugin.skills ?? []) {
    const fullPath = join(ROOT, entry.path);
    const content = await readFile(fullPath, "utf-8");
    const fm = extractFrontmatter(content);

    if (!fm) {
      error(`${entry.path}: missing YAML frontmatter`);
      continue;
    }

    if (!fm.name) {
      error(`${entry.path}: missing 'name' in frontmatter`);
    }

    if (!fm.description) {
      error(`${entry.path}: missing 'description' in frontmatter`);
    }

    // Check name matches directory
    const dirName = basename(dirname(fullPath));
    if (fm.name && fm.name !== dirName) {
      error(
        `${entry.path}: name '${fm.name}' does not match directory '${dirName}'`,
      );
    }
  }
}

async function validateAgents() {
  console.log("Checking agents...");
  const plugin = JSON.parse(
    await readFile(join(ROOT, "plugin.json"), "utf-8"),
  ) as PluginJson;

  for (const entry of plugin.agents ?? []) {
    const fullPath = join(ROOT, entry.path);
    const content = await readFile(fullPath, "utf-8");
    const fm = extractFrontmatter(content);

    if (!fm) {
      error(`${entry.path}: missing YAML frontmatter`);
      continue;
    }

    if (!fm.description) {
      error(`${entry.path}: missing 'description' in frontmatter`);
    }
  }
}

async function main() {
  await validatePluginJson();
  await validateSkills();
  await validateAgents();

  console.log("");
  if (errors > 0) {
    console.error(`Validation failed with ${String(errors)} error(s).`);
    process.exit(1);
  } else {
    console.log("All checks passed.");
  }
}

main().catch((err: unknown) => {
  console.error("Validation error:", err);
  process.exit(1);
});
