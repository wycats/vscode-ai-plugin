import { ClaudeCodeAdapter } from "./claude-code.ts";
import type { EvaluationAdapter } from "./adapter.ts";

export function createAdapter(target: string, root: string): EvaluationAdapter {
  if (target === "claude-code") return new ClaudeCodeAdapter(root);
  throw new Error(`Unsupported evaluation target: ${target}.`);
}
