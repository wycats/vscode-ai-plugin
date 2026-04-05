/**
 * Tool call logger: records every tool invocation to a JSONL file.
 *
 * Handles PreToolUse, PostToolUse, and any other hook event.
 * Each line is a self-contained JSON object with the full hook input
 * plus a `logged_at` timestamp from the hook's own clock.
 *
 * Log file: ~/.copilot/tool-call-log.jsonl
 * Format: one JSON object per line, append-only.
 */

import { readFileSync, appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const LOG_DIR = process.env.CLAUDE_PLUGIN_DATA
  ?? join(process.env.HOME ?? "", ".ai-plugin");
const LOG_PATH = join(LOG_DIR, "tool-call-log.jsonl");

// Ensure the directory exists
mkdirSync(LOG_DIR, { recursive: true });

const raw = readFileSync("/dev/stdin", "utf-8");

interface HookInput {
  [key: string]: unknown;
}

const input = JSON.parse(raw) as HookInput;
const entry = {
  logged_at: new Date().toISOString(),
  ...input,
};

appendFileSync(LOG_PATH, JSON.stringify(entry) + "\n");

// Always allow — this hook only observes
