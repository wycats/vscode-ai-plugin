import { ClaudeCodeCliAdapter } from "./claude-code.ts";
import type { EvaluationAdapter } from "./adapter.ts";

export function createAdapter(adapter: string, root: string): EvaluationAdapter {
  if (adapter === "claude-code-cli") return new ClaudeCodeCliAdapter(root);
  throw new Error(`Unsupported evaluation adapter: ${adapter}.`);
}
