import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = resolve(fileURLToPath(new URL("../..", import.meta.url)));

function runEval(args: string[]) {
  return spawnSync(process.execPath, ["scripts/eval/run.ts", "--", ...args], {
    cwd: ROOT,
    encoding: "utf-8",
    timeout: 30_000,
    maxBuffer: 10 * 1024 * 1024,
  });
}

void test("rejects unknown CLI arguments with usage", () => {
  const result = runEval(["--adapter", "claude-code-cli", "--unknown"]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Unknown argument: --unknown/);
  assert.match(result.stderr, /Usage: pnpm eval/);
});

void test("projects one case without invoking the target", () => {
  const result = runEval([
    "--adapter",
    "claude-code-cli",
    "--dry-run",
    "--case",
    "empty-document",
  ]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /--- empty-document:/);
  assert.match(result.stdout, /Canonical request:/);
  assert.match(result.stdout, /Target projection:/);
  assert.match(result.stdout, /Use the slop-linter agent from the loaded plugin/);
});
