/**
 * Builds the plugin from source agents + config into an output directory.
 *
 * 1. Reads config.json (errors if missing)
 * 2. For each source agent: resolves model and tool role names from config
 * 3. Copies skills and (for vscode) instructions, hooks, stances
 * 4. Generates the platform-specific manifest
 *
 * Output goes to out/<target>/ (e.g. out/vscode/ or out/claude-code/).
 */

import { readFile, writeFile, readdir, mkdir, cp, rm } from "node:fs/promises";
import { join, relative, dirname } from "node:path";
import matter from "gray-matter";

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const CONFIG_PATH = join(ROOT, "config.json");

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

function resolveModel(role: string, config: Config): string | undefined {
  const value = config.models[role];
  // null or missing means "omit the field" (use platform default)
  if (value === null) return undefined;
  return value;
}

function resolveTools(toolList: unknown[], config: Config): string[] {
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
      lines.push(`${key}: ${value ? "true" : "false"}`);
    } else if (typeof value === "string") {
      const str = value;
      // Quote strings that need it
      const needsQuote = /[:#{}[\],&*?|>'"@`\n]/.test(str);
      lines.push(`${key}: ${needsQuote ? JSON.stringify(str) : str}`);
    }
  }
  return lines.join("\n");
}

function deriveAgentName(filename: string): string {
  // recon-worker.agent.md → recon-worker
  return filename.replace(/\.agent\.md$/, "");
}

async function buildAgent(
  srcPath: string,
  outDir: string,
  config: Config,
): Promise<string> {
  const raw = await readFile(srcPath, "utf-8");
  const { data, content } = matter(raw);
  const filename = relative(join(ROOT, "agents"), srcPath);
  const isClaudeCode = config.target === "claude-code";

  // Claude Code requires a name field — insert at the front
  if (isClaudeCode && !data.name) {
    const name = deriveAgentName(filename);
    const original = { ...data };
    for (const k of Object.keys(data)) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete data[k];
    }
    Object.assign(data, { name }, original);
  }

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
    const resolved = resolveTools(data.tools, config);
    // Claude Code: deduplicate (many CC groups overlap, e.g. Bash appears in multiple)
    data.tools = isClaudeCode ? [...new Set(resolved)] : resolved;
  }

  // Claude Code: strip VS Code-specific fields
  if (isClaudeCode) {
    delete data["user-invocable"];
  }

  // Rebuild the file: frontmatter + body
  const frontmatter = serializeFrontmatter(data);
  const outContent = `---\n${frontmatter}\n---\n${content}`;

  const outPath = join(outDir, "agents", filename);
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, outContent);

  return `./agents/${filename}`;
}

interface SourceHook {
  match?: string;
  hooks: Record<string, { type: string; command: string; timeout?: number }[]>;
}

interface CCMatcherGroup {
  matcher?: string;
  hooks: { type: string; command: string; timeout?: number }[];
}

/**
 * Build hooks for the target platform.
 *
 * VS Code: copies per-hook JSONs with rewritten script paths.
 * Claude Code: consolidates all hooks into one hooks/hooks.json with matchers.
 */
async function buildHooks(
  outDir: string,
  isClaudeCode: boolean,
): Promise<string[]> {
  const hookFiles = await findFiles(join(ROOT, "hooks"), /\.json$/);
  if (hookFiles.length === 0) return [];

  // Copy hook scripts to output
  const srcScripts = join(ROOT, "scripts", "hooks");
  const destScripts = join(outDir, "scripts", "hooks");
  try {
    await cp(srcScripts, destScripts, { recursive: true });
  } catch {
    // no scripts to copy
  }

  const hooksOutDir = join(outDir, "hooks");
  await mkdir(hooksOutDir, { recursive: true });

  if (isClaudeCode) {
    // Consolidate into one hooks.json with CC nesting format
    const consolidated: Record<string, CCMatcherGroup[]> = {};

    for (const file of hookFiles) {
      const src = JSON.parse(await readFile(file, "utf-8")) as SourceHook;

      for (const [event, handlers] of Object.entries(src.hooks)) {
        consolidated[event] ??= [];

        const ccHandlers = handlers.map((h) => ({
          ...h,
          command: h.command
            .replace(
              /^node scripts\/hooks\//,
              'node "$CLAUDE_PLUGIN_ROOT/scripts/hooks/',
            )
            .replace(/\.ts$/, '.ts"'),
        }));

        const group: CCMatcherGroup = { hooks: ccHandlers };
        if (src.match) group.matcher = src.match;
        consolidated[event].push(group);
      }
    }

    await writeFile(
      join(hooksOutDir, "hooks.json"),
      JSON.stringify({ hooks: consolidated }, null, 2) + "\n",
    );

    return ["./hooks/hooks.json"];
  } else {
    // VS Code: copy each hook JSON with rewritten paths
    const outPaths: string[] = [];

    for (const file of hookFiles) {
      const src = JSON.parse(await readFile(file, "utf-8")) as SourceHook;

      // Rewrite command paths to point at the output scripts directory
      const rewritten: Record<string, unknown[]> = {};
      for (const [event, handlers] of Object.entries(src.hooks)) {
        rewritten[event] = handlers.map((h) => ({
          ...h,
          command: h.command.replace(
            /^node scripts\/hooks\//,
            "node scripts/hooks/",
          ),
        }));
      }

      const outFile = join(hooksOutDir, relative(join(ROOT, "hooks"), file));
      await mkdir(dirname(outFile), { recursive: true });
      // Write without the match field (VS Code doesn't use it)
      await writeFile(
        outFile,
        JSON.stringify({ hooks: rewritten }, null, 2) + "\n",
      );
      outPaths.push("./" + relative(outDir, outFile));
    }

    return outPaths;
  }
}

async function copyDir(srcName: string, outDir: string): Promise<string[]> {
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
  const agentSources = await findFiles(join(ROOT, "agents"), /\.agent\.md$/);
  const agentPaths: string[] = [];
  for (const src of agentSources) {
    const relPath = await buildAgent(src, outDir, config);
    agentPaths.push(relPath);
  }

  // Copy skills (shared by both targets)
  const allSkillPaths = await copyDir("skills", outDir);
  const skillPaths = allSkillPaths.filter((p) => p.endsWith("/SKILL.md"));

  const isClaudeCode = config.target === "claude-code";

  // Build hooks (both targets)
  const hookPaths = await buildHooks(outDir, isClaudeCode);

  // Generate package.json for script portability
  await writeFile(
    join(outDir, "package.json"),
    JSON.stringify({ type: "module", engines: { node: ">=22.6.0" } }, null, 2) + "\n",
  );

  if (isClaudeCode) {
    // Claude Code: generate .claude-plugin/plugin.json
    const ccManifest: Record<string, unknown> = {
      name: pluginMeta.name,
      version: pluginMeta.version,
      description: pluginMeta.description,
    };

    // CC auto-discovers agents/, skills/, and hooks/ from the plugin root.
    // Explicit paths in the manifest override auto-discovery and have strict
    // validation — omitting them lets CC find everything in default locations.

    const manifestDir = join(outDir, ".claude-plugin");
    await mkdir(manifestDir, { recursive: true });
    await writeFile(
      join(manifestDir, "plugin.json"),
      JSON.stringify(ccManifest, null, 2) + "\n",
    );

    console.log(`Built to ${relative(ROOT, outDir)}/`);
    console.log(`  agents:       ${String(agentPaths.length)}`);
    console.log(`  skills:       ${String(skillPaths.length)}`);
    console.log(`  hooks:        ${String(hookPaths.length)}`);
    console.log(`  manifest:     .claude-plugin/plugin.json`);
  } else {
    // VS Code: copy instructions, stances; generate plugin.json
    const allInstructionPaths = await copyDir("instructions", outDir);
    const instructionPaths = allInstructionPaths.filter((p) =>
      p.endsWith(".instructions.md"),
    );

    await copyDir("stances", outDir);

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
    if (instructionPaths.length > 0) {
      pluginJson.instructions = instructionPaths.map((p) => ({ path: p }));
    }
    if (hookPaths.length > 0) {
      pluginJson.hooks = hookPaths.map((p) => ({ path: p }));
    }

    await writeFile(
      join(outDir, "plugin.json"),
      JSON.stringify(pluginJson, null, 2) + "\n",
    );

    console.log(`Built to ${relative(ROOT, outDir)}/`);
    console.log(`  agents:       ${String(agentPaths.length)}`);
    console.log(`  skills:       ${String(skillPaths.length)}`);
    console.log(`  instructions: ${String(instructionPaths.length)}`);
    console.log(`  hooks:        ${String(hookPaths.length)}`);
  }
}

build().catch((err: unknown) => {
  console.error("Build failed:", err);
  process.exit(1);
});
