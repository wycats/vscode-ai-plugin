/**
 * @wycats/agent-hooks
 *
 * Cross-platform hook runtime for VS Code and Claude Code.
 *
 * Handles stdin/stdout boilerplate, tool name normalization,
 * and platform-appropriate output formatting. Hook scripts
 * become thin wrappers that express check/handle logic.
 */

import { readFileSync, appendFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// --- Tool normalization (derived from tools.json) ---

interface ToolEntry {
  canonical: string;
  platforms: Record<string, string[]>;
}

interface ToolsJson {
  [key: string]: ToolEntry | string;
}

const toolsPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "tools.json",
);
const toolsData = JSON.parse(readFileSync(toolsPath, "utf-8")) as ToolsJson;

// Build the flat map: platform tool name → canonical name
const TOOL_MAP: Record<string, string> = {};

for (const [, entry] of Object.entries(toolsData)) {
  if (typeof entry === "string") continue; // skip $comment
  for (const platformTools of Object.values(entry.platforms)) {
    for (const toolName of platformTools) {
      TOOL_MAP[toolName] = entry.canonical;
    }
  }
}

export function normalizeToolName(raw: string): string {
  return TOOL_MAP[raw] ?? raw;
}

/** The raw tool normalization map for inspection/testing. */
export const toolMap: Readonly<Record<string, string>> = TOOL_MAP;

// --- Types ---

/** Known canonical tool names. Use these for autocomplete; unknown tools pass through as-is. */
export type CanonicalTool =
  | "terminal"
  | "edit"
  | "read"
  | "search"
  | "web"
  | "agent";

/** A canonical tool name, or any string for platform-specific / unknown tools. */
export type ToolFilter = CanonicalTool | (string & {});

// --- Platform context (discriminated union) ---

export interface VSCodeContext {
  platform: "vscode";
  /** ISO timestamp of the hook invocation */
  timestamp: string;
  sessionId?: string | undefined;
  transcriptPath?: string | undefined;
  cwd?: string | undefined;
  toolUseId: string;
  /** Tool response text (PostToolUse only) */
  toolResponse?: string | undefined;
}

export interface ClaudeCodeContext {
  platform: "claude-code";
  sessionId: string;
  transcriptPath: string;
  cwd: string;
  permissionMode: string;
  toolUseId: string;
}

export interface UnknownPlatformContext {
  platform: "unknown";
}

export type HookContext = VSCodeContext | ClaudeCodeContext | UnknownPlatformContext;

export interface ToolEvent {
  /** Hook event name (PreToolUse, PostToolUse, etc.) */
  event: string;
  /** Normalized tool name ("terminal", "edit", "read", etc.) */
  tool: string;
  /** Platform-specific tool name ("run_in_terminal", "Bash", etc.) */
  rawTool: string;
  /** Full tool input from the platform */
  input: Record<string, unknown>;
  /** Convenience: the command string for terminal tools */
  command?: string | undefined;
  /** Platform-specific context (session, cwd, etc.) */
  context: HookContext;
}

export type PolicyResult =
  | { deny: string }
  | { ask: string }
  | undefined;

interface PolicyOptions {
  name: string;
  tool?: ToolFilter;
  check: (event: ToolEvent) => PolicyResult;
}

interface ObserverOptions {
  name: string;
  tool?: ToolFilter;
  handle: (event: ToolEvent) => void;
}

interface SideEffectOptions {
  name: string;
  tool?: ToolFilter;
  handle: (event: ToolEvent) => void;
}

// --- Platform I/O ---

interface RawInput {
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  hook_event_name?: string;
  [key: string]: unknown;
}

function readInput(): RawInput {
  return JSON.parse(readFileSync("/dev/stdin", "utf-8")) as RawInput;
}

function detectContext(raw: RawInput): HookContext {
  const str = (key: string): string | undefined => {
    const v = raw[key];
    return typeof v === "string" ? v : undefined;
  };

  // CC sends permission_mode; VS Code sends timestamp
  if (str("permission_mode") !== undefined) {
    return {
      platform: "claude-code",
      sessionId: str("session_id") ?? "",
      transcriptPath: str("transcript_path") ?? "",
      cwd: str("cwd") ?? "",
      permissionMode: str("permission_mode") ?? "default",
      toolUseId: str("tool_use_id") ?? "",
    };
  }

  if (str("timestamp") !== undefined) {
    return {
      platform: "vscode",
      timestamp: str("timestamp") ?? "",
      sessionId: str("session_id"),
      transcriptPath: str("transcript_path"),
      cwd: str("cwd"),
      toolUseId: str("tool_use_id") ?? "",
      toolResponse: str("tool_response"),
    };
  }

  return { platform: "unknown" };
}

function parseEvent(raw: RawInput): ToolEvent {
  const rawTool = raw.tool_name ?? "";
  const tool = normalizeToolName(rawTool);
  const input = raw.tool_input ?? {};
  const cmd = input["command"];
  const command = typeof cmd === "string" ? cmd : undefined;
  const event = raw.hook_event_name ?? "unknown";
  const context = detectContext(raw);

  return { event, tool, rawTool, input, command, context };
}

function shouldFire(event: ToolEvent, toolFilter?: string): boolean {
  if (!toolFilter) return true;
  return event.tool === toolFilter;
}

function writeDeny(reason: string): void {
  const output = {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny" as const,
      permissionDecisionReason: reason,
    },
  };
  process.stdout.write(JSON.stringify(output));
}

function writeAsk(reason: string): void {
  const output = {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "ask" as const,
      permissionDecisionReason: reason,
    },
  };
  process.stdout.write(JSON.stringify(output));
}

// --- Public API ---

export function createPolicy(options: PolicyOptions): void {
  const raw = readInput();
  const event = parseEvent(raw);

  if (!shouldFire(event, options.tool)) {
    process.exit(0);
  }

  const result = options.check(event);

  if (!result) {
    process.exit(0);
  }

  if ("deny" in result) {
    writeDeny(result.deny);
  } else if ("ask" in result) {
    writeAsk(result.ask);
  }
}

export function createObserver(options: ObserverOptions): void {
  const raw = readInput();
  const event = parseEvent(raw);

  if (!shouldFire(event, options.tool)) {
    process.exit(0);
  }

  options.handle(event);
}

export function createSideEffect(options: SideEffectOptions): void {
  const raw = readInput();
  const event = parseEvent(raw);

  if (!shouldFire(event, options.tool)) {
    process.exit(0);
  }

  options.handle(event);
}

// --- Utilities for hook scripts ---

export function appendLog(
  logDir: string,
  filename: string,
  data: unknown,
): void {
  mkdirSync(logDir, { recursive: true });
  const entry = {
    logged_at: new Date().toISOString(),
    ...(typeof data === "object" && data !== null ? data : { value: data }),
  };
  appendFileSync(`${logDir}/${filename}`, JSON.stringify(entry) + "\n");
}
