import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { resolveClaudeCommand } from "../../claude-executable.ts";
import {
  ClaudeCodeCliAdapter,
  claudeCodeInvocation,
  parseClaudeCodeStream,
} from "./claude-code.ts";
import type { EvaluationSuite } from "../core.ts";

const suite: EvaluationSuite = {
  schemaVersion: 1,
  protocol: "document-review/v1",
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
    "Canonical request",
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
    "Invoke the relational-continuity skill from the loaded plugin before answering the canonical request below.\n\nCanonical request",
  );
  assert.equal(
    adapter.projectedResourcePath(suite.resource),
    "/tmp/example-plugin/out/claude-code/agents/slop-linter.agent.md",
  );
  assert.equal(
    adapter.projectedResourcePath(stanceSuite.resource),
    "/tmp/example-plugin/out/claude-code/skills/relational-continuity/SKILL.md",
  );
});

function stream(...events: unknown[]): string {
  return events.map((event) => JSON.stringify(event)).join("\n");
}

void test("runs a projected agent directly through Claude Code's agent surface", () => {
  const canonicalPrompt = "Canonical request";
  const result = '{"findings":[],"rewrittenDocument":"Agent result"}';
  const invocation = claudeCodeInvocation(
    suite.resource,
    "wycats-ai-plugin",
    canonicalPrompt,
    "Projected launcher prompt",
  );
  assert.deepEqual(invocation, {
    resourceArguments: ["--agent", "wycats-ai-plugin:slop-linter"],
    prompt: canonicalPrompt,
    directInvocation: {
      surface: "cli-agent",
      resource: "wycats-ai-plugin:slop-linter",
    },
  });
  assert.throws(
    () =>
      parseClaudeCodeStream(
        stream({ type: "result", subtype: "success", is_error: false, result }),
        suite.resource,
        "wycats-ai-plugin",
      ),
    /did not complete a wycats-ai-plugin:slop-linter resource invocation/,
  );
  assert.deepEqual(
    parseClaudeCodeStream(
      stream({ type: "result", subtype: "success", is_error: false, result }),
      suite.resource,
      "wycats-ai-plugin",
      invocation.directInvocation,
    ),
    {
      result,
      resourceInvocation: {
        surface: "cli-agent",
        resource: "wycats-ai-plugin:slop-linter",
      },
    },
  );
});

void test("recognizes a completed invocation through the projected skill surface", () => {
  const resource = {
    identity: "wycats-plugin:stances/relational-continuity",
    name: "relational-continuity",
    path: "stances/relational-continuity/SKILL.md",
  };
  const result = '{"findings":[],"rewrittenDocument":"Text"}';
  assert.deepEqual(
    parseClaudeCodeStream(
      stream(
        {
          type: "assistant",
          message: {
            content: [
              {
                type: "tool_use",
                id: "skill-1",
                name: "Skill",
                input: { skill: "wycats-ai-plugin:relational-continuity" },
              },
            ],
          },
        },
        {
          type: "user",
          message: {
            content: [{ type: "tool_result", tool_use_id: "skill-1", content: "Loaded" }],
          },
        },
        { type: "result", subtype: "success", is_error: false, result },
      ),
      resource,
      "wycats-ai-plugin",
    ),
    {
      result,
      resourceInvocation: {
        surface: "tool",
        tool: "Skill",
        resource: "wycats-ai-plugin:relational-continuity",
        toolUseId: "skill-1",
      },
    },
  );
});

void test("rejects a skill response without a successful skill invocation", () => {
  const resource = {
    identity: "wycats-plugin:stances/relational-continuity",
    name: "relational-continuity",
    path: "stances/relational-continuity/SKILL.md",
  };
  const directResult = stream({
    type: "result",
    subtype: "success",
    is_error: false,
    result: '{"findings":[],"rewrittenDocument":"Text"}',
  });
  assert.throws(
    () =>
      parseClaudeCodeStream(
        directResult,
        resource,
        "wycats-ai-plugin",
      ),
    /did not complete a wycats-ai-plugin:relational-continuity resource invocation/,
  );

  const failedInvocation = stream(
    {
      type: "assistant",
      message: {
        content: [
          {
            type: "tool_use",
            id: "agent-1",
            name: "Skill",
            input: { skill: "wycats-ai-plugin:relational-continuity" },
          },
        ],
      },
    },
    {
      type: "user",
      message: {
        content: [{ type: "tool_result", tool_use_id: "agent-1", is_error: true }],
      },
    },
    { type: "result", subtype: "success", is_error: false, result: "{}" },
  );
  assert.throws(
    () =>
      parseClaudeCodeStream(
        failedInvocation,
        resource,
        "wycats-ai-plugin",
      ),
    /did not complete a wycats-ai-plugin:relational-continuity resource invocation/,
  );
});
