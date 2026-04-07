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

// VS Code uses "run_in_terminal", Claude Code uses "Bash"
if (input.tool_name !== "run_in_terminal" && input.tool_name !== "Bash") {
  process.exit(0);
}

const command = input.tool_input.command;

if (typeof command !== "string" || command.length === 0) {
  process.exit(0);
}

// Check for npm usage (but not pnpm)
const npmPattern = /\bnpm\b/;
const npxPattern = /\bnpx\b/;
const pnpmPattern = /\b(pnpm|pnpx)\b/;

if (pnpmPattern.test(command)) {
  // Already using pnpm/pnpx — allow
  process.exit(0);
}

if (npmPattern.test(command)) {
  const output: HookOutput = {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: `This environment uses pnpm, not npm. Replace "npm" with "pnpm" in the command: ${command}`,
    },
  };
  process.stdout.write(JSON.stringify(output));
  process.exit(0);
}

if (npxPattern.test(command)) {
  const output: HookOutput = {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: `This environment uses pnpm. "npx" is always wrong here. If this runs a project script, use "pnpm run <script>" instead. If it's truly a one-off tool not in the project, use "pnpx". Prefer creating a package script over using pnpx. Command was: ${command}`,
    },
  };
  process.stdout.write(JSON.stringify(output));
}

// Allow everything else
