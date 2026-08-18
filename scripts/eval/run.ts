import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { createAdapter } from "./adapters/index.ts";
import {
  buildCanonicalPrompt,
  gradeResponse,
  loadSuite,
  parseEvaluationResponse,
  type EvaluationCase,
} from "./core.ts";
import { validateCanonicalResource } from "./resource.ts";

const ROOT = new URL("../..", import.meta.url).pathname.replace(/\/$/, "");
const DEFAULT_SUITE = join(ROOT, "evals", "slop-linter", "cases.json");

interface Options {
  adapter: "claude-code-cli";
  suitePath: string;
  caseId?: string;
  outputPath?: string;
  dryRun: boolean;
}

function usage(): string {
  return `Usage: pnpm eval -- --adapter claude-code-cli [options]

Options:
  --suite <path>   Evaluation suite (default: evals/slop-linter/cases.json)
  --case <id>      Run one case
  --output <path>  Result file (default: .runtime/evals/<timestamp>.json)
  --dry-run        Print case prompts without invoking the target`;
}

function argumentError(message: string): never {
  throw new Error(`${message}\n\n${usage()}`);
}

function optionValue(args: string[], index: number, option: string): string {
  const value = args[index + 1];
  if (!value || value.startsWith("--")) argumentError(`Missing value for ${option}.`);
  return value;
}

function parseOptions(args = process.argv.slice(2)): Options {
  let adapter: string | undefined;
  let suitePath = DEFAULT_SUITE;
  let caseId: string | undefined;
  let outputPath: string | undefined;
  let dryRun = false;

  for (let index = 0; index < args.length; index++) {
    const argument = args[index];
    if (argument === "--") continue;
    if (argument === "--dry-run") {
      dryRun = true;
      continue;
    }
    if (argument === "--adapter" || argument === "--suite" || argument === "--case" || argument === "--output") {
      const value = optionValue(args, index, argument);
      if (argument === "--adapter") adapter = value;
      if (argument === "--suite") suitePath = resolve(ROOT, value);
      if (argument === "--case") caseId = value;
      if (argument === "--output") outputPath = resolve(ROOT, value);
      index++;
      continue;
    }
    argumentError(`Unknown argument: ${argument}`);
  }

  if (adapter !== "claude-code-cli") {
    argumentError(adapter ? `Unsupported adapter: ${adapter}.` : "Missing --adapter.");
  }
  return { adapter, suitePath, caseId, outputPath, dryRun };
}

function selectCases(cases: EvaluationCase[], caseId?: string): EvaluationCase[] {
  if (!caseId) return cases;
  const selected = cases.find((testCase) => testCase.id === caseId);
  if (!selected) throw new Error(`Suite does not contain case '${caseId}'.`);
  return [selected];
}

function displayPath(path: string): string {
  if (!isAbsolute(path)) return path;
  const local = relative(ROOT, path);
  return local.startsWith("..") ? path : local;
}

function defaultOutputPath(): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return join(ROOT, ".runtime", "evals", `${timestamp}-claude-code-cli.json`);
}

function resolveRepositoryPath(path: string): string {
  const resolved = resolve(ROOT, path);
  const local = relative(ROOT, resolved);
  if (local === "" || local.startsWith("..") || isAbsolute(local)) {
    throw new Error(`Canonical resource path must stay inside the repository: ${path}.`);
  }
  return resolved;
}

async function sha256(path: string): Promise<string> {
  const digest = createHash("sha256").update(await readFile(path)).digest("hex");
  return `sha256:${digest}`;
}

async function run(): Promise<void> {
  const options = parseOptions();
  const suite = await loadSuite(options.suitePath);
  const cases = selectCases(suite.cases, options.caseId);
  const resourcePath = resolveRepositoryPath(suite.resource.path);
  validateCanonicalResource(suite.resource, await readFile(resourcePath, "utf-8"));
  const resourceDigest = await sha256(resourcePath);
  const suiteDigest = await sha256(options.suitePath);
  const adapter = createAdapter(options.adapter, ROOT);

  if (options.dryRun) {
    console.log(`Suite: ${displayPath(options.suitePath)}`);
    console.log(`Resource: ${suite.resource.identity} (${suite.resource.path})`);
    console.log(`Resource digest: ${resourceDigest}`);
    console.log(`Suite digest: ${suiteDigest}`);
    console.log(`Adapter: ${options.adapter}`);
    console.log(`Target: ${adapter.target}`);
    console.log(`Transport: ${adapter.transport}`);
    for (const testCase of cases) {
      console.log(`\n--- ${testCase.id}: ${testCase.description} ---\n`);
      const canonicalPrompt = buildCanonicalPrompt(suite.resource.name, testCase);
      console.log("Canonical request:\n");
      console.log(canonicalPrompt);
      console.log("\nTarget projection:\n");
      console.log(adapter.projectPrompt(suite, canonicalPrompt));
    }
    return;
  }

  const execution = await adapter.prepare();
  const revision = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: ROOT,
    encoding: "utf-8",
  }).trim();
  const sourceTreeDirty = execFileSync("git", ["status", "--short"], {
    cwd: ROOT,
    encoding: "utf-8",
  }).trim() !== "";
  const startedAt = new Date().toISOString();
  const results = [];

  for (const testCase of cases) {
    process.stdout.write(`${testCase.id}... `);
    const canonicalPrompt = buildCanonicalPrompt(suite.resource.name, testCase);
    const projectedPrompt = adapter.projectPrompt(suite, canonicalPrompt);
    let rawResponse: string | undefined;
    let stderr: string | undefined;
    let durationMs: number | undefined;
    let exitCode: number | null | undefined;
    let executionError: string | undefined;
    try {
      const observation = adapter.execute(projectedPrompt);
      rawResponse = observation.rawResponse;
      stderr = observation.stderr;
      durationMs = observation.durationMs;
      exitCode = observation.exitCode;
      executionError = observation.executionError;
      if (executionError || exitCode !== 0) {
        throw new Error(
          executionError ?? `Claude Code CLI exited with status ${String(exitCode)}.`,
        );
      }
      const response = parseEvaluationResponse(observation.rawResponse);
      const grade = gradeResponse(testCase, response);
      results.push({
        id: testCase.id,
        description: testCase.description,
        canonicalPrompt,
        projectedPrompt,
        durationMs,
        rawResponse: observation.rawResponse,
        stderr,
        exitCode,
        response,
        grade,
      });
      console.log(grade.passed ? "passed" : `failed: ${grade.failures.join(" ")}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.push({
        id: testCase.id,
        description: testCase.description,
        canonicalPrompt,
        projectedPrompt,
        durationMs,
        rawResponse,
        stderr,
        exitCode,
        executionError,
        grade: { passed: false, failures: [message], observedFindingLabels: [] },
      });
      console.log(`failed: ${message}`);
    }
  }

  const outputPath = options.outputPath ?? defaultOutputPath();
  await mkdir(dirname(outputPath), { recursive: true });
  const report = {
    schemaVersion: 1,
    suite: {
      path: displayPath(options.suitePath),
      resource: suite.resource,
      description: suite.description,
      suiteDigest,
      resourceDigest,
      sourceRevision: revision,
      sourceTreeDirty,
    },
    execution,
    startedAt,
    completedAt: new Date().toISOString(),
    results,
  };
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);

  const passed = results.filter((result) => result.grade.passed).length;
  console.log(`\n${String(passed)}/${String(results.length)} cases passed.`);
  console.log(`Result: ${displayPath(outputPath)}`);
  if (passed !== results.length) process.exitCode = 1;
}

run().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
