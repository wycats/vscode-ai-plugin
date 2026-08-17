import assert from "node:assert/strict";
import test from "node:test";
import { ClaudeCodeAdapter } from "./claude-code.ts";
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
      expect: { maximumFindings: 0 },
    },
  ],
};

void test("adds only the Claude Code invocation envelope to a canonical request", () => {
  const adapter = new ClaudeCodeAdapter("/tmp/example-plugin");
  const canonicalPrompt = "Canonical request";
  assert.equal(
    adapter.projectPrompt(suite, canonicalPrompt),
    "Use the slop-linter agent from the loaded plugin for this task.\n\nCanonical request",
  );
});
