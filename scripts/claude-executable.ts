import { execFileSync } from "node:child_process";
import { accessSync, constants } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

function executable(path: string): string | undefined {
  try {
    accessSync(path, constants.X_OK);
    return path;
  } catch {
    return undefined;
  }
}

export function findClaudeExecutable(): string | undefined {
  try {
    const fromPath = execFileSync("which", ["claude"], { encoding: "utf-8" }).trim();
    if (fromPath) return executable(fromPath);
  } catch {
    // Fall through to proto's unshimmed installation directory.
  }

  const protoRoot = join(homedir(), ".proto", "tools", "node");
  try {
    const matches = execFileSync("find", [protoRoot, "-name", "claude", "-type", "f"], {
      encoding: "utf-8",
    });
    for (const match of matches.split("\n")) {
      if (match && executable(match)) return match;
    }
  } catch {
    // The CLI is unavailable through both supported discovery paths.
  }
  return undefined;
}
