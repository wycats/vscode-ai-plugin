/**
 * Smoke tests for the Claude Code plugin.
 *
 * Builds the CC target, then runs a series of non-interactive prompts
 * to verify agents, skills, and hooks are working.
 *
 * Requires: Claude Code CLI authenticated.
 */

import { execSync } from "node:child_process";
import { readFile, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const CC_OUT = join(ROOT, "out", "claude-code");
const CONFIG_PATH = join(ROOT, "config.json");
const CC_EXAMPLE = join(ROOT, "config.claude-code.example.json");

// Find claude binary — proto doesn't shim it
const CLAUDE =
  execSync("which claude 2>/dev/null || find ~/.proto/tools/node -name claude -type f 2>/dev/null | head -1", {
    encoding: "utf-8",
  }).trim();

if (!CLAUDE) {
  console.error("Claude Code CLI not found. Install with: npm install -g @anthropic-ai/claude-code");
  process.exit(1);
}

const EXPECTED_AGENTS = [
  "execute",
  "pre-read",
  "prepare",
  "recon",
  "recon-worker",
  "review",
  "slop-linter",
];

const EXPECTED_SKILLS = [
  "per-cycle",
  "recon",
  "session-close",
  "session-load",
  "session-rest",
  "session-save",
  "walkthrough",
];

interface TestResult {
  name: string;
  passed: boolean;
  detail: string;
}

const results: TestResult[] = [];

function cc(prompt: string, maxTurns = 3): string {
  try {
    return execSync(
      `${CLAUDE} --plugin-dir ${CC_OUT} -p ${JSON.stringify(prompt)} --output-format text --max-turns ${String(maxTurns)}`,
      { cwd: ROOT, encoding: "utf-8", timeout: 120_000, stdio: ["pipe", "pipe", "pipe"] },
    );
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; message?: string };
    return e.stdout ?? e.stderr ?? e.message ?? "unknown error";
  }
}

async function ensureCCBuild(): Promise<void> {
  let originalConfig = "";
  let needsRestore = false;

  try {
    originalConfig = await readFile(CONFIG_PATH, "utf-8");
    const config = JSON.parse(originalConfig) as { target?: string };
    if (config.target !== "claude-code") {
      needsRestore = true;
      await writeFile(CONFIG_PATH, await readFile(CC_EXAMPLE, "utf-8"));
    }
  } catch {
    needsRestore = true;
    await writeFile(CONFIG_PATH, await readFile(CC_EXAMPLE, "utf-8"));
  }

  try {
    execSync("node scripts/build.ts", { cwd: ROOT, stdio: "inherit" });
  } finally {
    if (needsRestore) {
      if (originalConfig) {
        await writeFile(CONFIG_PATH, originalConfig);
      } else {
        await rm(CONFIG_PATH, { force: true });
      }
    }
  }
}

function test(name: string, fn: () => boolean | string) {
  process.stdout.write(`  ${name}... `);
  try {
    const result = fn();
    if (result === true || result === "") {
      results.push({ name, passed: true, detail: "" });
      console.log("✓");
    } else {
      results.push({ name, passed: false, detail: typeof result === "string" ? result : "failed" });
      console.log(`✗ ${typeof result === "string" ? result : ""}`);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    results.push({ name, passed: false, detail: msg });
    console.log(`✗ ${msg}`);
  }
}

async function run() {
  console.log("Building CC plugin...\n");
  await ensureCCBuild();

  console.log("\nRunning smoke tests...\n");

  // Test 1: All agents visible
  // CC namespaces plugin agents as "plugin-name:agent-name"
  const agentOutput = cc("List every plugin agent and plugin skill you have. Full names, one per line.", 2);

  test("All agents visible", () => {
    const missing = EXPECTED_AGENTS.filter(
      (a) => !agentOutput.includes(`:${a}`) && !agentOutput.includes(a),
    );
    return missing.length === 0 ? true : `missing: ${missing.join(", ")}`;
  });

  // Test 2: All skills visible (checks the same output)
  test("All skills visible", () => {
    const missing = EXPECTED_SKILLS.filter(
      (s) => !agentOutput.includes(`:${s}`) && !agentOutput.includes(s),
    );
    return missing.length === 0 ? true : `missing: ${missing.join(", ")}`;
  });

  // Test 3: Hook blocks npm
  const hookOutput = cc("Run this exact bash command: npm install leftpad. Tell me if it was blocked or allowed.", 4);

  test("Hook blocks npm", () => {
    return hookOutput.toLowerCase().includes("block") ||
      hookOutput.toLowerCase().includes("denied") ||
      hookOutput.toLowerCase().includes("pnpm")
      ? true
      : `expected block, got: ${hookOutput.slice(0, 100)}`;
  });

  // Test 4: Slop-linter agent works
  const slopOutput = cc(
    'Use the slop-linter agent to lint this single sentence: "In today\'s rapidly evolving landscape, we leverage cutting-edge AI." Return only the findings table.',
    3,
  );

  test("Slop-linter produces findings", () => {
    return slopOutput.includes("Label") || slopOutput.includes("Generic") || slopOutput.includes("slop")
      ? true
      : `no findings detected in: ${slopOutput.slice(0, 100)}`;
  });

  // Test 5: Recon reads files
  const reconOutput = cc(
    "Use the recon skill. What file does the build script read config from? Answer in one sentence.",
    5,
  );

  test("Recon reads codebase", () => {
    return reconOutput.includes("config.json")
      ? true
      : `expected mention of config.json: ${reconOutput.slice(0, 100)}`;
  });

  // Summary
  console.log("");
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  if (failed > 0) {
    console.log(`${String(passed)} passed, ${String(failed)} failed:\n`);
    for (const r of results.filter((r) => !r.passed)) {
      console.log(`  ✗ ${r.name}: ${r.detail}`);
    }
    process.exit(1);
  } else {
    console.log(`All ${String(passed)} tests passed.`);
  }
}

run().catch((err: unknown) => {
  console.error("Test failed:", err);
  process.exit(1);
});
