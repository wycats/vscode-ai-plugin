import { execFileSync, spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { findClaudeCommand, type ClaudeCommand } from "../../claude-executable.ts";
import type { EvaluationResource, EvaluationSuite } from "../core.ts";
import { canonicalResourceDescriptor } from "../resource.ts";
import type {
  AdapterMetadata,
  AdapterObservation,
  AdapterRequest,
  EvaluationAdapter,
  ResourceInvocation,
} from "./adapter.ts";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function messageContent(event: Record<string, unknown>): unknown[] {
  if (!isRecord(event.message) || !Array.isArray(event.message.content)) return [];
  return event.message.content;
}

function spawnOutput(value: string | null): string {
  return value ?? "";
}

function matchingInvocation(
  block: Record<string, unknown>,
  resource: EvaluationResource,
  pluginName: string,
): ResourceInvocation | undefined {
  if (block.type !== "tool_use" || typeof block.id !== "string" || !isRecord(block.input)) {
    return undefined;
  }
  const descriptor = canonicalResourceDescriptor(resource.path);
  const expectedResource = `${pluginName}:${descriptor.name}`;
  if (
    descriptor.kind !== "agent" &&
    block.name === "Skill" &&
    block.input.skill === expectedResource
  ) {
    return {
      surface: "tool",
      tool: "Skill",
      resource: expectedResource,
      toolUseId: block.id,
    };
  }
  return undefined;
}

export function claudeCodeInvocation(
  resource: EvaluationResource,
  pluginName: string,
  canonicalPrompt: string,
  projectedPrompt: string,
): { resourceArguments: string[]; prompt: string; directInvocation?: ResourceInvocation } {
  const descriptor = canonicalResourceDescriptor(resource.path);
  if (descriptor.kind !== "agent") {
    return { resourceArguments: [], prompt: projectedPrompt };
  }
  const scopedName = `${pluginName}:${descriptor.name}`;
  return {
    resourceArguments: ["--agent", scopedName],
    prompt: canonicalPrompt,
    directInvocation: { surface: "cli-agent", resource: scopedName },
  };
}

export function parseClaudeCodeStream(
  output: string,
  resource: EvaluationResource,
  pluginName: string,
  directInvocation?: ResourceInvocation,
): { result: string; resourceInvocation: ResourceInvocation } {
  const events = output
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line, index): Record<string, unknown> => {
      let value: unknown;
      try {
        value = JSON.parse(line) as unknown;
      } catch (error) {
        throw new Error(`Claude Code stream line ${String(index + 1)} is not valid JSON.`, {
          cause: error,
        });
      }
      if (!isRecord(value)) {
        throw new Error(`Claude Code stream line ${String(index + 1)} must be an object.`);
      }
      return value;
    });

  const invocations: ResourceInvocation[] = [];
  const completedToolUses = new Set<string>();
  let launcherResult: string | undefined;

  for (const event of events) {
    if (event.type === "assistant") {
      for (const value of messageContent(event)) {
        if (!isRecord(value)) continue;
        const invocation = matchingInvocation(value, resource, pluginName);
        if (invocation) invocations.push(invocation);
      }
    }
    if (event.type === "user") {
      for (const value of messageContent(event)) {
        if (
          isRecord(value) &&
          value.type === "tool_result" &&
          typeof value.tool_use_id === "string" &&
          value.is_error !== true
        ) {
          completedToolUses.add(value.tool_use_id);
        }
      }
    }
    if (
      event.type === "result" &&
      event.subtype === "success" &&
      event.is_error !== true &&
      typeof event.result === "string"
    ) {
      launcherResult = event.result;
    }
  }

  const descriptor = canonicalResourceDescriptor(resource.path);
  const expectedResource = `${pluginName}:${descriptor.name}`;
  const resourceInvocation =
    descriptor.kind === "agent"
      ? directInvocation?.surface === "cli-agent" && directInvocation.resource === expectedResource
        ? directInvocation
        : undefined
      : invocations.find(
          (invocation) =>
            invocation.toolUseId !== undefined && completedToolUses.has(invocation.toolUseId),
        );
  if (!resourceInvocation) {
    const descriptor = canonicalResourceDescriptor(resource.path);
    throw new Error(
      `Claude Code did not complete a ${pluginName}:${descriptor.name} resource invocation.`,
    );
  }
  if (launcherResult === undefined) {
    throw new Error("Claude Code stream did not contain a successful result event.");
  }
  return { result: launcherResult, resourceInvocation };
}

export class ClaudeCodeCliAdapter implements EvaluationAdapter {
  readonly id = "claude-code-cli" as const;
  readonly target = "claude-code" as const;
  readonly transport = "cli" as const;
  readonly #root: string;
  readonly #projection: string;
  #command: ClaudeCommand | undefined;
  #launcherModel = "";
  #pluginName = "";

  constructor(root: string) {
    this.#root = root;
    this.#projection = join(root, "out", "claude-code");
  }

  async prepare(): Promise<AdapterMetadata> {
    this.#command = findClaudeCommand();
    if (!this.#command) {
      throw new Error(
        "The claude-code-cli adapter requires an authenticated Claude Code executable. A Claude Code extension session does not provide this transport.",
      );
    }
    const configPath = join(this.#root, "config.claude-code.example.json");
    const config = JSON.parse(await readFile(configPath, "utf-8")) as {
      models: Record<string, string | null>;
    };
    this.#launcherModel = config.models.balanced ?? "";
    if (!this.#launcherModel) {
      throw new Error(
        "The claude-code-cli adapter requires a concrete balanced model mapping for reproducible evaluation runs.",
      );
    }
    execFileSync(
      process.execPath,
      ["scripts/build.ts", "--config", "config.claude-code.example.json"],
      { cwd: this.#root, stdio: "inherit" },
    );
    const pluginManifest = JSON.parse(
      await readFile(join(this.#projection, ".claude-plugin", "plugin.json"), "utf-8"),
    ) as { name?: unknown };
    if (typeof pluginManifest.name !== "string" || pluginManifest.name.trim() === "") {
      throw new Error("The Claude Code projection must declare a plugin name.");
    }
    this.#pluginName = pluginManifest.name;
    return {
      id: this.id,
      target: this.target,
      transport: this.transport,
      pluginName: this.#pluginName,
      discoveredCommand: this.#command.discoveredPath,
      executable: this.#command.executable,
      argumentPrefix: this.#command.argumentPrefix,
      runtimeVersion: execFileSync(
        this.#command.executable,
        [...this.#command.argumentPrefix, "--version"],
        { encoding: "utf-8" },
      ).trim(),
      projection: this.#projection,
      launcherModel: {
        role: "balanced",
        target: this.#launcherModel,
      },
      modelMapping: config.models,
    };
  }

  projectedResourcePath(resource: EvaluationResource): string {
    const descriptor = canonicalResourceDescriptor(resource.path);
    if (descriptor.kind === "stance") {
      return join(this.#projection, "skills", descriptor.name, "SKILL.md");
    }
    return join(this.#projection, resource.path);
  }

  projectPrompt(suite: EvaluationSuite, canonicalPrompt: string): string {
    const descriptor = canonicalResourceDescriptor(suite.resource.path);
    if (descriptor.kind === "agent") return canonicalPrompt;
    return `Invoke the ${suite.resource.name} skill from the loaded plugin before answering the canonical request below.\n\n${canonicalPrompt}`;
  }

  execute(request: AdapterRequest): AdapterObservation {
    if (!this.#command || !this.#pluginName) {
      throw new Error("Claude Code CLI adapter has not been prepared.");
    }
    const { canonicalPrompt, projectedPrompt, resource } = request;
    const invocation = claudeCodeInvocation(
      resource,
      this.#pluginName,
      canonicalPrompt,
      projectedPrompt,
    );
    const started = performance.now();
    const result = spawnSync(
      this.#command.executable,
      [
        ...this.#command.argumentPrefix,
        "--plugin-dir",
        this.#projection,
        ...invocation.resourceArguments,
        "-p",
        invocation.prompt,
        "--output-format",
        "stream-json",
        "--verbose",
        "--model",
        this.#launcherModel,
        "--max-turns",
        "3",
      ],
      {
        cwd: this.#root,
        encoding: "utf-8",
        timeout: 120_000,
        maxBuffer: 10 * 1024 * 1024,
      },
    );
    const durationMs = Math.round(performance.now() - started);
    const stdout = spawnOutput(result.stdout as string | null);
    const stderr = spawnOutput(result.stderr as string | null);
    const observation: AdapterObservation = {
      rawResponse: "",
      transportOutput: stdout,
      stderr,
      durationMs,
      exitCode: result.status,
      executionError: result.error?.message,
    };
    if (observation.executionError || observation.exitCode !== 0) return observation;
    try {
      const parsed = parseClaudeCodeStream(stdout, resource, this.#pluginName, invocation.directInvocation);
      return {
        ...observation,
        rawResponse: parsed.result,
        resourceInvocation: parsed.resourceInvocation,
      };
    } catch (error) {
      return {
        ...observation,
        executionError: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
