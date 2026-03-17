/**
 * Scans the plugin source tree and regenerates plugin.json
 * to reflect the current agents, skills, and prompts.
 */

import { readdir, writeFile, readFile } from "node:fs/promises";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");

interface PluginEntry {
  path: string;
}

interface PluginJson {
  name: string;
  version: string;
  description: string;
  skills?: PluginEntry[];
  agents?: PluginEntry[];
  prompts?: PluginEntry[];
  instructions?: PluginEntry[];
  hooks?: PluginEntry[];
}

async function findFiles(dir: string, pattern: RegExp): Promise<string[]> {
  const results: string[] = [];
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...(await findFiles(full, pattern)));
      } else if (pattern.test(entry.name)) {
        results.push(full);
      }
    }
  } catch {
    // directory doesn't exist, skip
  }
  return results;
}

function toEntry(absPath: string): PluginEntry {
  return { path: "./" + relative(ROOT, absPath) };
}

async function build() {
  // Read existing plugin.json for metadata
  const existing = JSON.parse(
    await readFile(join(ROOT, "plugin.json"), "utf-8"),
  ) as PluginJson;

  // Discover files
  const skills = (await findFiles(join(ROOT, "skills"), /^SKILL\.md$/)).map(
    toEntry,
  );
  const agents = (await findFiles(join(ROOT, "agents"), /\.agent\.md$/)).map(
    toEntry,
  );
  const prompts = (await findFiles(join(ROOT, "prompts"), /\.prompt\.md$/)).map(
    toEntry,
  );
  const instructions = (
    await findFiles(join(ROOT, "instructions"), /\.instructions\.md$/)
  ).map(toEntry);
  const hooks = (await findFiles(join(ROOT, "hooks"), /\.json$/)).map(toEntry);

  const pluginJson: PluginJson = {
    name: existing.name,
    version: existing.version,
    description: existing.description,
  };

  if (skills.length > 0) pluginJson.skills = skills;
  if (agents.length > 0) pluginJson.agents = agents;
  if (prompts.length > 0) pluginJson.prompts = prompts;
  if (instructions.length > 0) pluginJson.instructions = instructions;
  if (hooks.length > 0) pluginJson.hooks = hooks;

  const output = JSON.stringify(pluginJson, null, 2) + "\n";
  await writeFile(join(ROOT, "plugin.json"), output);

  console.log("plugin.json updated:");
  console.log(`  skills:       ${String(skills.length)}`);
  console.log(`  agents:       ${String(agents.length)}`);
  console.log(`  prompts:      ${String(prompts.length)}`);
  console.log(`  instructions: ${String(instructions.length)}`);
  console.log(`  hooks:        ${String(hooks.length)}`);
}

build().catch((err: unknown) => {
  console.error("Build failed:", err);
  process.exit(1);
});
