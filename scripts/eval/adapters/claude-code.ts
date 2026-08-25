import { execFileSync, spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { findClaudeCommand, type ClaudeCommand } from "../../claude-executable.ts";
import type { EvaluationSuite } from "../core.ts";
import { canonicalResourceDescriptor } from "../resource.ts";
import type { AdapterMetadata, AdapterObservation, EvaluationAdapter } from "./adapter.ts";

export class ClaudeCodeCliAdapter implements EvaluationAdapter {
  readonly id = "claude-code-cli" as const;
  readonly target = "claude-code" as const;
  readonly transport = "cli" as const;
  readonly #root: string;
  readonly #projection: string;
  #command: ClaudeCommand | undefined;
  #launcherModel = "";

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
    return {
      id: this.id,
      target: this.target,
      transport: this.transport,
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

  projectPrompt(suite: EvaluationSuite, canonicalPrompt: string): string {
    const descriptor = canonicalResourceDescriptor(suite.resource.path);
    const invocationKind = descriptor.kind === "agent" ? "agent" : "skill";
    return `Use the ${suite.resource.name} ${invocationKind} from the loaded plugin for this task.\n\n${canonicalPrompt}`;
  }

  execute(projectedPrompt: string): AdapterObservation {
    if (!this.#command) throw new Error("Claude Code CLI adapter has not been prepared.");
    const started = performance.now();
    const result = spawnSync(
      this.#command.executable,
      [
        ...this.#command.argumentPrefix,
        "--plugin-dir",
        this.#projection,
        "-p",
        projectedPrompt,
        "--output-format",
        "text",
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

    return {
      rawResponse: result.stdout,
      stderr: result.stderr,
      durationMs,
      exitCode: result.status,
      executionError: result.error?.message,
    };
  }
}
