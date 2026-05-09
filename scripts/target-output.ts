import { join } from "node:path";

export const VSCODE_TARGET = "vscode";
export const CLAUDE_CODE_TARGET = "claude-code";

export const OUTPUT_DIRECTORY_BY_TARGET = {
  [VSCODE_TARGET]: "wycats",
  [CLAUDE_CODE_TARGET]: "claude-code",
} as const;

export const LEGACY_VSCODE_OUTPUT_DIRECTORY_NAME = "vscode";

export type BuildTarget = keyof typeof OUTPUT_DIRECTORY_BY_TARGET;

export function isBuildTarget(target: string): target is BuildTarget {
  return Object.prototype.hasOwnProperty.call(
    OUTPUT_DIRECTORY_BY_TARGET,
    target,
  );
}

export function outputDirectoryNameForTarget(target: string): string {
  if (!isBuildTarget(target)) {
    throw new Error(`Unsupported build target: ${target}`);
  }

  return OUTPUT_DIRECTORY_BY_TARGET[target];
}

export function outputPathForTarget(root: string, target: string): string {
  return join(root, "out", outputDirectoryNameForTarget(target));
}

export function distPathForTarget(root: string, target: string): string {
  return join(root, "dist", outputDirectoryNameForTarget(target));
}

export function legacyVSCodeOutputPath(root: string): string {
  return join(root, "out", LEGACY_VSCODE_OUTPUT_DIRECTORY_NAME);
}

export function legacyVSCodeDistPath(root: string): string {
  return join(root, "dist", LEGACY_VSCODE_OUTPUT_DIRECTORY_NAME);
}

export function displayOutputDirectoryForTarget(target: string): string {
  return `out/${outputDirectoryNameForTarget(target)}`;
}

export function displayDistDirectoryForTarget(target: string): string {
  return `dist/${outputDirectoryNameForTarget(target)}`;
}