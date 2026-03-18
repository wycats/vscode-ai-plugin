/**
 * PreToolUse hook that intercepts terminal commands using npm/npx
 * and blocks them with a message directing the agent to use pnpm.
 *
 * Receives JSON on stdin with tool_name and tool_input.
 * Returns JSON on stdout with a permission decision.
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

// Only check the run_in_terminal tool
if (input.tool_name !== "run_in_terminal") {
  process.exit(0);
}

const command = input.tool_input.command;

if (typeof command !== "string" || command.length === 0) {
  process.exit(0);
}

// Check for npm/npx usage (but not pnpm/pnpx)
const npmPattern = /\b(npm|npx)\b/;
const pnpmPattern = /\bpnpm\b/;

if (npmPattern.test(command) && !pnpmPattern.test(command)) {
  const output: HookOutput = {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: `This environment uses pnpm, not npm. Replace "npm" with "pnpm" or "npx" with "pnpm exec" in the command: ${command}`,
    },
  };
  process.stdout.write(JSON.stringify(output));
}

// Allow everything else
