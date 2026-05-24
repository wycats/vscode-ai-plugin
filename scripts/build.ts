/**
 * Builds the plugin from source agents + config into an output directory.
 *
 * 1. Reads config.json by default, or an explicit config path when provided
 * 2. For each source agent: resolves model and tool role names from config
 * 3. Copies skills and (for vscode) instructions, hooks, stances
 * 4. Generates the platform-specific manifest
 *
 * Output goes to the target's platform output directory
 * (vscode → out/wycats/, claude-code → out/claude-code/).
 */

import { readFile, writeFile, mkdir, cp, rm } from "node:fs/promises";
import { join, relative, dirname, basename, resolve } from "node:path";
import matter from "gray-matter";
import { ModuleKind, ScriptTarget, transpileModule } from "typescript";
import {
  discoverResourceFiles,
  type DiscoveredResource,
} from "./resource-discovery.ts";
import {
  legacyVSCodeOutputPath,
  outputPathForTarget,
  VSCODE_TARGET,
} from "./target-output.ts";

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const DEFAULT_CONFIG_PATH = join(ROOT, "config.json");
const CONFIG_ENV_VAR = "VSCODE_AI_PLUGIN_CONFIG_PATH";

interface Config {
  target: string;
  models: Record<string, string | null>;
  toolGroups: Record<string, string[]>;
  hookMatchers?: Record<string, string>;
}

interface PluginEntry {
  path: string;
}

interface PluginMetadata {
  name: string;
  version: string;
  description: string;
}

interface PluginJson extends PluginMetadata {
  skills?: PluginEntry[];
  agents?: PluginEntry[];
  instructions?: PluginEntry[];
  hooks?: PluginEntry[];
}

function usage(): string {
  return `Usage: node scripts/build.ts [--config <path>]

Examples:
  pnpm build --config config.example.json
  pnpm build -- --config config.example.json`;
}

function failArgument(message: string): never {
  console.error(`${message}\n\n${usage()}`);
  process.exit(1);
}

function parseConfigPath(args = process.argv.slice(2)): string {
  let selectedPath: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--") {
      continue;
    }

    if (arg === "--config") {
      const value = args[i + 1];
      if (!value || value.startsWith("--")) {
        failArgument("Missing value for --config.");
      }
      selectedPath = value;
      i++;
      continue;
    }

    if (arg.startsWith("--config=")) {
      const value = arg.slice("--config=".length);
      if (!value) {
        failArgument("Missing value for --config.");
      }
      selectedPath = value;
      continue;
    }

    failArgument(`Unknown build argument: ${arg}`);
  }

  const envPath = process.env[CONFIG_ENV_VAR];
  return resolve(ROOT, selectedPath ?? (envPath || DEFAULT_CONFIG_PATH));
}

function displayConfigPath(configPath: string): string {
  const relPath = relative(ROOT, configPath);
  if (relPath && !relPath.startsWith("..")) {
    return relPath;
  }
  return configPath;
}

const CONFIG_PATH = parseConfigPath();

async function loadConfig(): Promise<Config> {
  try {
    return JSON.parse(await readFile(CONFIG_PATH, "utf-8")) as Config;
  } catch (err: unknown) {
    const displayPath = displayConfigPath(CONFIG_PATH);
    const error = err as NodeJS.ErrnoException;

    if (error.code === "ENOENT") {
      if (CONFIG_PATH === DEFAULT_CONFIG_PATH) {
        console.error(
          `config.json not found.\n\nCopy config.example.json to config.json and customize it:\n  cp config.example.json config.json\n`,
        );
      } else {
        console.error(
          `Config file not found: ${displayPath}\n\nPass a valid path with --config <path> or ${CONFIG_ENV_VAR}.\n`,
        );
      }
    } else {
      console.error(`Failed to load config from ${displayPath}:`, err);
    }
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

function shouldQuoteYamlString(value: string): boolean {
  return (
    value === "" ||
    value.trim() !== value ||
    /[:#{}[\],&*?|>'"@`!%\\\n\r]/.test(value) ||
    /^[-?:](?:\s|$)/.test(value) ||
    /^(?:true|false|null|~|yes|no|on|off)$/i.test(value) ||
    /^[-+]?(?:\d+|\d+\.\d*|\.\d+)(?:[eE][-+]?\d+)?$/.test(value) ||
    /^[-+]?(?:\.inf|\.nan)$/i.test(value) ||
    !yamlPlainScalarRoundTrips(value)
  );
}

function yamlPlainScalarRoundTrips(value: string): boolean {
  try {
    const parsed = matter(`---\nvalue: ${value}\n---\n`).data as Record<
      string,
      unknown
    >;
    return parsed.value === value;
  } catch {
    return false;
  }
}

function formatYamlString(value: string): string {
  return shouldQuoteYamlString(value) ? JSON.stringify(value) : value;
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
        const formatted = formatYamlString(item);
        lines.push(`    ${formatted},`);
      }
      lines.push(`  ]`);
    } else if (typeof value === "boolean") {
      lines.push(`${key}: ${value ? "true" : "false"}`);
    } else if (typeof value === "string") {
      lines.push(`${key}: ${formatYamlString(value)}`);
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

// --- Hook manifest (neutral format) ---

interface HookManifest {
  type: "policy" | "observer" | "side-effect";
  name: string;
  events: string[];
  tool?: string;
  script: string;
  timeout?: number;
}

/**
 * Build hooks for the target platform from neutral manifests.
 *
 * Reads manifests from hooks/*.json, copies scripts + lib to output,
 * then delegates to a platform-specific adapter.
 */
async function buildHooks(
  outDir: string,
  config: Config,
  hookFiles: string[],
): Promise<string[]> {
  if (hookFiles.length === 0) return [];

  // Load all manifests
  const manifests: HookManifest[] = [];
  for (const file of hookFiles) {
    manifests.push(JSON.parse(await readFile(file, "utf-8")) as HookManifest);
  }

  // Copy hook scripts and agent-hooks package to output
  await cp(join(ROOT, "scripts", "hooks"), join(outDir, "scripts", "hooks"), {
    recursive: true,
  }).catch(() => {});
  // Copy the package so hook imports resolve in the output
  await copyAgentHooksPackage(outDir);

  const hooksOutDir = join(outDir, "hooks");
  await mkdir(hooksOutDir, { recursive: true });

  if (config.target === "claude-code") {
    return buildCCHooks(manifests, config, hooksOutDir);
  } else {
    return buildVSCodeHooks(manifests, hooksOutDir, outDir);
  }
}

async function copyAgentHooksPackage(outDir: string): Promise<void> {
  const hooksPkg = join(ROOT, "packages", "agent-hooks");
  const hooksDest = join(outDir, "node_modules", "@wycats", "agent-hooks");

  await mkdir(join(hooksDest, "src"), { recursive: true });

  const packageJson = JSON.parse(
    await readFile(join(hooksPkg, "package.json"), "utf-8"),
  ) as Record<string, unknown>;
  packageJson.exports = { ".": "./src/index.js" };

  await writeFile(
    join(hooksDest, "package.json"),
    JSON.stringify(packageJson, null, 2) + "\n",
  );
  await cp(join(hooksPkg, "tools.json"), join(hooksDest, "tools.json"));

  const runtimeSource = await readFile(
    join(hooksPkg, "src", "index.ts"),
    "utf-8",
  );
  const { outputText } = transpileModule(runtimeSource, {
    compilerOptions: {
      target: ScriptTarget.ES2024,
      module: ModuleKind.ESNext,
    },
    fileName: join(hooksPkg, "src", "index.ts"),
  });

  await writeFile(join(hooksDest, "src", "index.js"), outputText);
}

/** VS Code adapter: one JSON file per hook, flat handler arrays. */
function buildVSCodeHooks(
  manifests: HookManifest[],
  hooksOutDir: string,
  outDir: string,
): Promise<string[]> {
  const writes: Promise<void>[] = [];
  const outPaths: string[] = [];

  for (const m of manifests) {
    const hooks: Record<
      string,
      { type: string; command: string; timeout?: number }[]
    > = {};
    for (const event of m.events) {
      hooks[event] = [
        {
          type: "command",
          command: `node scripts/hooks/${m.script}`,
          ...(m.timeout !== undefined ? { timeout: m.timeout } : {}),
        },
      ];
    }

    const outFile = join(hooksOutDir, `${m.name}.json`);
    writes.push(writeFile(outFile, JSON.stringify({ hooks }, null, 2) + "\n"));
    outPaths.push("./" + relative(outDir, outFile));
  }

  return Promise.all(writes).then(() => outPaths);
}

/** Claude Code adapter: consolidated hooks.json with matcher groups. */
function buildCCHooks(
  manifests: HookManifest[],
  config: Config,
  hooksOutDir: string,
): Promise<string[]> {
  const matchers = config.hookMatchers ?? {};
  const consolidated: Record<
    string,
    {
      matcher?: string;
      hooks: { type: string; command: string; timeout?: number }[];
    }[]
  > = {};

  for (const m of manifests) {
    const handler = {
      type: "command" as const,
      command: `node "$CLAUDE_PLUGIN_ROOT/scripts/hooks/${m.script}"`,
      ...(m.timeout !== undefined ? { timeout: m.timeout } : {}),
    };

    const group: { matcher?: string; hooks: (typeof handler)[] } = {
      hooks: [handler],
    };
    if (m.tool && matchers[m.tool]) {
      group.matcher = matchers[m.tool];
    }

    for (const event of m.events) {
      consolidated[event] ??= [];
      consolidated[event].push(group);
    }
  }

  return writeFile(
    join(hooksOutDir, "hooks.json"),
    JSON.stringify({ hooks: consolidated }, null, 2) + "\n",
  ).then(() => ["./hooks/hooks.json"]);
}

async function copyDir(srcName: string, outDir: string): Promise<void> {
  const srcDir = join(ROOT, srcName);
  const destDir = join(outDir, srcName);
  try {
    await cp(srcDir, destDir, { recursive: true });
  } catch {
    return;
  }
}

async function copyStancesAsClaudeSkills(
  outDir: string,
  stances: DiscoveredResource[],
): Promise<string[]> {
  const outPaths: string[] = [];

  for (const stance of stances) {
    const dirName = basename(dirname(stance.sourcePath));
    const outPath = join(outDir, "skills", dirName, "SKILL.md");
    await mkdir(dirname(outPath), { recursive: true });
    await cp(stance.sourcePath, outPath);
    outPaths.push(`./skills/${dirName}/SKILL.md`);
  }

  return outPaths;
}

async function build() {
  const config = await loadConfig();
  const outDir = outputPathForTarget(ROOT, config.target);
  const resources = await discoverResourceFiles(ROOT);
  const isClaudeCode = config.target === "claude-code";

  // Clean output
  if (config.target === VSCODE_TARGET) {
    await rm(legacyVSCodeOutputPath(ROOT), { recursive: true, force: true });
  }
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });

  // Read plugin metadata
  const pluginMeta = JSON.parse(
    await readFile(join(ROOT, "plugin.json"), "utf-8"),
  ) as PluginMetadata;

  // Build agents
  const agentSources = resources.agents.map((resource) => resource.sourcePath);
  const agentPaths: string[] = [];
  for (const src of agentSources) {
    const relPath = await buildAgent(src, outDir, config);
    agentPaths.push(relPath);
  }

  // Copy workflow skills (shared by both targets)
  await copyDir("skills", outDir);
  const skillPaths = resources.skills.map((resource) => resource.pluginPath);
  let stancePaths: string[];

  if (isClaudeCode) {
    // Claude Code auto-discovers only the default skills/ tree, so materialize
    // stance-skills there while preserving source files under stances/.
    stancePaths = await copyStancesAsClaudeSkills(outDir, resources.stances);
  } else {
    // VS Code uses explicit manifest paths, so stances can remain grouped under
    // stances/ and be registered as hidden skills.
    await copyDir("stances", outDir);
    stancePaths = resources.stances.map((resource) => resource.pluginPath);
  }

  const allSkillPaths = [...skillPaths, ...stancePaths];

  // Build hooks (both targets)
  const hookPaths = await buildHooks(
    outDir,
    config,
    resources.hooks.map((resource) => resource.sourcePath),
  );

  // Generate package.json for script portability
  await writeFile(
    join(outDir, "package.json"),
    JSON.stringify({ type: "module", engines: { node: ">=24.0.0" } }, null, 2) +
      "\n",
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
    console.log(
      `  skills:       ${String(skillPaths.length)} workflow + ${String(stancePaths.length)} stances = ${String(allSkillPaths.length)}`,
    );
    console.log(`  hooks:        ${String(hookPaths.length)}`);
    console.log(`  manifest:     .claude-plugin/plugin.json`);
  } else {
    // VS Code: copy instructions; generate plugin.json
    await copyDir("instructions", outDir);
    const instructionPaths = resources.instructions.map(
      (resource) => resource.pluginPath,
    );

    const pluginJson: PluginJson = {
      name: pluginMeta.name,
      version: pluginMeta.version,
      description: pluginMeta.description,
    };

    if (agentPaths.length > 0) {
      pluginJson.agents = agentPaths.map((p) => ({ path: p }));
    }
    if (allSkillPaths.length > 0) {
      pluginJson.skills = allSkillPaths.map((p) => ({ path: p }));
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
    console.log(
      `  skills:       ${String(skillPaths.length)} workflow + ${String(stancePaths.length)} stances = ${String(allSkillPaths.length)}`,
    );
    console.log(`  instructions: ${String(instructionPaths.length)}`);
    console.log(`  hooks:        ${String(hookPaths.length)}`);
  }
}

build().catch((err: unknown) => {
  console.error("Build failed:", err);
  process.exit(1);
});
