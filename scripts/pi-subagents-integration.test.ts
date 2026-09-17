import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const ROOT = resolve(import.meta.dirname, "..");
const PI_SUBAGENTS_ROOT = process.env.PI_SUBAGENTS_ROOT;

interface DiscoveredAgent {
  name: string;
  tools?: string[];
  skills?: string[];
  skillPath?: string[];
}

interface AgentDiscoveryModule {
  clearAgentDiscoveryCache(): void;
  discoverAgents(
    cwd: string,
    scope: "project",
  ): { agents: DiscoveredAgent[]; agentDiagnostics?: Array<{ error: string }> };
}

void test(
  "installed pi-subagents parser discovers exact generated Pi lists",
  { skip: PI_SUBAGENTS_ROOT ? false : "set PI_SUBAGENTS_ROOT for local runtime integration" },
  async () => {
    assert.ok(PI_SUBAGENTS_ROOT);
    const temporaryRoot = await mkdtemp(join(tmpdir(), "pi-subagents-discovery-"));
    const packageOut = join(temporaryRoot, "package");
    const project = join(temporaryRoot, "project");
    try {
      await execFileAsync(process.execPath, [
        join(ROOT, "scripts", "build.ts"),
        "--config",
        join(ROOT, "config.pi.example.json"),
        "--output",
        packageOut,
      ]);
      await mkdir(join(project, ".pi"), { recursive: true });
      await mkdir(join(project, ".git"), { recursive: true });
      await writeFile(
        join(project, ".pi", "settings.json"),
        JSON.stringify({ packages: [packageOut] }, null, 2) + "\n",
      );

      const discoveryUrl = pathToFileURL(
        join(PI_SUBAGENTS_ROOT, "src", "agents", "agents.ts"),
      ).href;
      const discovery = (await import(discoveryUrl)) as AgentDiscoveryModule;
      discovery.clearAgentDiscoveryCache();
      const result = discovery.discoverAgents(project, "project");
      const agent = result.agents.find((candidate) => candidate.name === "wycats-recon");
      assert.ok(agent, result.agentDiagnostics?.map((item) => item.error).join("\n"));
      assert.deepEqual(agent.tools, ["read", "grep", "find", "ls", "bash"]);
      assert.deepEqual(agent.skills, [
        "recon",
        "diagnostic-questioning",
        "interpretive-synthesis",
        "observational-grounding",
        "relational-continuity",
      ]);
      assert.deepEqual(agent.skillPath, ["../skills", "../stances"]);
    } finally {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  },
);
