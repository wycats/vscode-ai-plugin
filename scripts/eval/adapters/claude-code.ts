import { execFileSync, spawnSync } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { delimiter, join } from "node:path";
import type { EvaluationSuite } from "../core.ts";
import type { AdapterMetadata, AdapterObservation, EvaluationAdapter } from "./adapter.ts";

export class ClaudeCodeAdapter implements EvaluationAdapter {
  readonly id = "claude-code" as const;
  readonly #root: string;
  readonly #projection: string;
  #executable = "";

  constructor(root: string) {
    this.#root = root;
    this.#projection = join(root, "out", "claude-code");
  }

  async prepare(): Promise<AdapterMetadata> {
    this.#executable = await findExecutable("claude");
    const configPath = join(this.#root, "config.claude-code.example.json");
    const config = JSON.parse(await readFile(configPath, "utf-8")) as {
      models: Record<string, string | null>;
    };
    execFileSync(
      process.execPath,
      ["scripts/build.ts", "--config", "config.claude-code.example.json"],
      { cwd: this.#root, stdio: "inherit" },
    );
    return {
      id: this.id,
      executable: this.#executable,
      runtimeVersion: execFileSync(this.#executable, ["--version"], { encoding: "utf-8" }).trim(),
      projection: this.#projection,
      modelMapping: config.models,
    };
  }

  projectPrompt(suite: EvaluationSuite, canonicalPrompt: string): string {
    return `Use the ${suite.resource.name} agent from the loaded plugin for this task.\n\n${canonicalPrompt}`;
  }

  execute(projectedPrompt: string): AdapterObservation {
    if (!this.#executable) throw new Error("Claude Code adapter has not been prepared.");
    const started = performance.now();
    const result = spawnSync(
      this.#executable,
      [
        "--plugin-dir",
        this.#projection,
        "-p",
        projectedPrompt,
        "--output-format",
        "text",
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

    if (result.error) throw result.error;
    if (result.status !== 0) {
      throw new Error(
        `Claude Code exited with status ${String(result.status)}: ${result.stderr.trim() || result.stdout.trim()}`,
      );
    }

    return { rawResponse: result.stdout, durationMs };
  }
}

async function findExecutable(name: string): Promise<string> {
  for (const directory of (process.env.PATH ?? "").split(delimiter)) {
    if (!directory) continue;
    const candidate = join(directory, name);
    try {
      await access(candidate, constants.X_OK);
      return candidate;
    } catch {
      // Continue through PATH.
    }
  }
  throw new Error(`Could not find '${name}' on PATH. Install and authenticate Claude Code before a live run.`);
}
