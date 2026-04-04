/**
 * Builds the plugin from source agents + config into an output directory.
 *
 * 1. Reads config.json (errors if missing)
 * 2. For each source agent: resolves model and tool role names from config
 * 3. Copies skills, instructions, hooks, stances as-is
 * 4. Generates plugin.json in the output directory
 *
 * Output goes to out/vscode/ (registered via install-local.ts).
 */

import { readFile, writeFile, readdir, mkdir, cp, rm } from "node:fs/promises";
import { join, relative, dirname } from "node:path";
import matter from "gray-matter";

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const CONFIG_PATH = join(ROOT, "config.json");
const CONFIG_EXAMPLE_PATH = join(ROOT, "config.example.json");

interface Config {
  target: string;
  models: Record<string, string | null>;
  toolGroups: Record<string, string[]>;
}

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

async function loadConfig(): Promise<Config> {
  try {
    return JSON.parse(await readFile(CONFIG_PATH, "utf-8")) as Config;
  } catch {
    console.error(
      `config.json not found.\n\nCopy config.example.json to config.json and customize it:\n  cp config.example.json config.json\n`,
    );
    process.exit(1);
  }
}

function resolveModel(
  role: string,
  config: Config,
): string | undefined {
  const value = config.models[role];
  // null or missing means "omit the field" (use platform default)
  if (value === null || value === undefined) return undefined;
  return value;
}

function resolveTools(
  toolList: unknown[],
  config: Config,
): string[] {
  const resolved: string[] = [];
  for (const entry of toolList) {
    const name = String(entry);
    if (name in config.toolGroups) {
      resolved.push(...config.toolGroups[name]);
    } else {
      // Not a group name — pass through as a literal tool reference
      resolved.push(name);
    }
  }
  return resolved;
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
    // directory doesn't exist
  }
  return results;
}

function serializeFrontmatter(data: Record<string, unknown>): string {
  const lines: string[] = [];
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      // Format tool arrays in the YAML flow style used by agent files
      lines.push(`${key}:`);
      lines.push(`  [`);
      for (let i = 0; i < value.length; i++) {
        const item = String(value[i]);
        // Quote items with special chars
        const needsQuote = /[*{},[\]:#&!|>'"@`]/.test(item);
        const formatted = needsQuote ? `"${item}"` : item;
        const comma = i < value.length - 1 ? "," : ",";
        lines.push(`    ${formatted}${comma}`);
      }
      lines.push(`  ]`);
    } else if (typeof value === "boolean") {
      lines.push(`${key}: ${String(value)}`);
    } else {
      const str = String(value);
      // Quote strings that need it
      const needsQuote = /[:#{}[\],&*?|>'"@`\n]/.test(str);
      lines.push(`${key}: ${needsQuote ? JSON.stringify(str) : str}`);
    }
  }
  return lines.join("\n");
}

async function buildAgent(
  srcPath: string,
  outDir: string,
  config: Config,
): Promise<string> {
  const raw = await readFile(srcPath, "utf-8");
  const { data, content } = matter(raw);

  // Resolve model
  if (data.model !== undefined) {
    const resolved = resolveModel(String(data.model), config);
    if (resolved === undefined) {
      delete data.model;
    } else {
      data.model = resolved;
    }
  }

  // Resolve tools
  if (Array.isArray(data.tools)) {
    data.tools = resolveTools(data.tools, config);
  }

  // Rebuild the file: frontmatter + body
  const frontmatter = serializeFrontmatter(data);
  const outContent = `---\n${frontmatter}\n---\n${content}`;

  const filename = relative(join(ROOT, "agents"), srcPath);
  const outPath = join(outDir, "agents", filename);
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, outContent);

  return `./agents/${filename}`;
}

async function copyDir(
  srcName: string,
  outDir: string,
): Promise<string[]> {
  const srcDir = join(ROOT, srcName);
  const destDir = join(outDir, srcName);
  try {
    await cp(srcDir, destDir, { recursive: true });
  } catch {
    return [];
  }

  // Return relative paths for plugin.json
  const files = await findFiles(destDir, /.*/);
  return files.map((f) => "./" + relative(outDir, f));
}

async function build() {
  const config = await loadConfig();
  const outDir = join(ROOT, "out", config.target);

  // Clean output
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });

  // Read plugin metadata
  const pluginMeta = JSON.parse(
    await readFile(join(ROOT, "plugin.json"), "utf-8"),
  ) as PluginJson;

  // Build agents
  const agentSources = await findFiles(
    join(ROOT, "agents"),
    /\.agent\.md$/,
  );
  const agentPaths: string[] = [];
  for (const src of agentSources) {
    const relPath = await buildAgent(src, outDir, config);
    agentPaths.push(relPath);
  }

  // Copy skills
  const skillFiles = await findFiles(join(ROOT, "skills"), /^SKILL\.md$/);
  const skillPaths: string[] = [];
  if (skillFiles.length > 0) {
    await copyDir("skills", outDir);
    for (const f of skillFiles) {
      skillPaths.push("./" + relative(ROOT, f));
    }
  }

  // Copy other directories
  const instructionFiles: string[] = [];
  const hookFiles: string[] = [];

  for (const f of await findFiles(
    join(ROOT, "instructions"),
    /\.instructions\.md$/,
  )) {
    instructionFiles.push("./" + relative(ROOT, f));
  }
  if (instructionFiles.length > 0) await copyDir("instructions", outDir);

  for (const f of await findFiles(join(ROOT, "hooks"), /\.json$/)) {
    hookFiles.push("./" + relative(ROOT, f));
  }
  if (hookFiles.length > 0) await copyDir("hooks", outDir);

  // Copy stances if they exist
  await copyDir("stances", outDir);

  // Generate plugin.json
  const pluginJson: PluginJson = {
    name: pluginMeta.name,
    version: pluginMeta.version,
    description: pluginMeta.description,
  };

  if (agentPaths.length > 0) {
    pluginJson.agents = agentPaths.map((p) => ({ path: p }));
  }
  if (skillPaths.length > 0) {
    pluginJson.skills = skillPaths.map((p) => ({ path: p }));
  }
  if (instructionFiles.length > 0) {
    pluginJson.instructions = instructionFiles.map((p) => ({ path: p }));
  }
  if (hookFiles.length > 0) {
    pluginJson.hooks = hookFiles.map((p) => ({ path: p }));
  }

  await writeFile(
    join(outDir, "plugin.json"),
    JSON.stringify(pluginJson, null, 2) + "\n",
  );

  console.log(`Built to ${relative(ROOT, outDir)}/`);
  console.log(`  agents:       ${String(agentPaths.length)}`);
  console.log(`  skills:       ${String(skillPaths.length)}`);
  console.log(`  instructions: ${String(instructionFiles.length)}`);
  console.log(`  hooks:        ${String(hookFiles.length)}`);
}

build().catch((err: unknown) => {
  console.error("Build failed:", err);
  process.exit(1);
});
