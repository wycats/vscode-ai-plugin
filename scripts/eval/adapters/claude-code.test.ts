import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { resolveClaudeCommand } from "../../claude-executable.ts";
import { ClaudeCodeCliAdapter } from "./claude-code.ts";
import type { EvaluationSuite } from "../core.ts";

const suite: EvaluationSuite = {
  schemaVersion: 1,
  resource: {
    identity: "wycats-plugin:agents/slop-linter",
    name: "slop-linter",
    path: "agents/slop-linter.agent.md",
  },
  description: "Example suite",
  cases: [
    {
      id: "example",
      description: "Example case",
      document: "Example document.",
      expect: { rewriteEqualsInput: true },
    },
  ],
};

void test("launches Windows npm command shims through their Node entrypoint", () => {
  const prefix = mkdtempSync(join(tmpdir(), "claude-command-"));
  try {
    const cli = join(prefix, "node_modules", "@anthropic-ai", "claude-code", "cli.js");
    mkdirSync(join(prefix, "node_modules", "@anthropic-ai", "claude-code"), {
      recursive: true,
    });
    writeFileSync(cli, "");
    for (const extension of ["cmd", "bat"]) {
      const shim = join(prefix, `claude.${extension}`);
      writeFileSync(shim, "@echo off\n");
      assert.deepEqual(resolveClaudeCommand(shim, "win32"), {
        discoveredPath: shim,
        executable: process.execPath,
        argumentPrefix: [cli],
      });
    }
  } finally {
    rmSync(prefix, { recursive: true, force: true });
  }
});

void test("adds only the Claude Code invocation envelope to a canonical request", () => {
  const adapter = new ClaudeCodeCliAdapter("/tmp/example-plugin");
  assert.equal(adapter.id, "claude-code-cli");
  assert.equal(adapter.target, "claude-code");
  assert.equal(adapter.transport, "cli");
  const canonicalPrompt = "Canonical request";
  assert.equal(
    adapter.projectPrompt(suite, canonicalPrompt),
    "Use the slop-linter agent from the loaded plugin for this task.\n\nCanonical request",
  );
});

void test("projects skills and stances through Claude Code's skill surface", () => {
  const adapter = new ClaudeCodeCliAdapter("/tmp/example-plugin");
  const stanceSuite: EvaluationSuite = {
    ...suite,
    resource: {
      identity: "wycats-plugin:stances/relational-continuity",
      name: "relational-continuity",
      path: "stances/relational-continuity/SKILL.md",
    },
  };
  assert.equal(
    adapter.projectPrompt(stanceSuite, "Canonical request"),
    "Use the relational-continuity skill from the loaded plugin for this task.\n\nCanonical request",
  );
});
