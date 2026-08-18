import assert from "node:assert/strict";
import test from "node:test";
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
