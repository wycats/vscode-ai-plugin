/**
 * PreToolUse hook that blocks tsx, ts-node, and similar TypeScript
 * loaders in terminal commands. Node 24+ runs TypeScript natively.
 */

import { readFileSync } from "node:fs";

interface HookInput {
  tool_name: string;
  tool_input: {
    command?: string;
    [key: string]: unknown;
  };
}

interface HookOutput {
  hookSpecificOutput: {
    hookEventName: string;
    permissionDecision: "allow" | "deny" | "ask";
    permissionDecisionReason?: string;
  };
}

const input = JSON.parse(readFileSync("/dev/stdin", "utf-8")) as HookInput;

if (input.tool_name !== "run_in_terminal") {
  process.exit(0);
}

const command = input.tool_input.command;

if (typeof command !== "string" || command.length === 0) {
  process.exit(0);
}

// Check for tsx, ts-node, babel-node usage
const loaderPattern = /\b(tsx|ts-node|babel-node|npx\s+tsx)\b/;

if (loaderPattern.test(command)) {
  const output: HookOutput = {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: `This environment uses Node 24+ which runs TypeScript natively. Replace the loader with "node" in the command: ${command}`,
    },
  };
  process.stdout.write(JSON.stringify(output));
}
