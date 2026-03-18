/**
 * Diagnostic hook: logs the full PreToolUse input to a file.
 * Use this temporarily to discover tool names and input schemas.
 *
 * Output goes to hooks-debug.log in the plugin root.
 */

import { readFileSync, appendFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("../..", import.meta.url).pathname.replace(/\/$/, "");
const LOG_PATH = join(ROOT, "hooks-debug.log");

const raw = readFileSync("/dev/stdin", "utf-8");
const timestamp = new Date().toISOString();

appendFileSync(LOG_PATH, `\n--- ${timestamp} ---\n${raw}\n`);

// Always allow — this is just for logging
