import { accessSync, constants, readdirSync } from "node:fs";
import { homedir, platform } from "node:os";
import { delimiter, join } from "node:path";

function executable(path: string): string | undefined {
  try {
    accessSync(path, constants.X_OK);
    return path;
  } catch {
    return undefined;
  }
}

function executableNames(name: string): string[] {
  if (platform() !== "win32") return [name];
  const extensions = (process.env.PATHEXT ?? ".COM;.EXE;.BAT;.CMD")
    .split(";")
    .filter(Boolean);
  return extensions.map((extension) => `${name}${extension.toLowerCase()}`);
}

function findOnPath(name: string): string | undefined {
  for (const directory of (process.env.PATH ?? "").split(delimiter)) {
    if (!directory) continue;
    for (const candidate of executableNames(name)) {
      const match = executable(join(directory, candidate));
      if (match) return match;
    }
  }
  return undefined;
}

function findBelow(root: string, names: Set<string>): string | undefined {
  try {
    for (const entry of readdirSync(root, { withFileTypes: true })) {
      const path = join(root, entry.name);
      if (entry.isDirectory()) {
        const match = findBelow(path, names);
        if (match) return match;
      } else if (entry.isFile() && names.has(entry.name.toLowerCase())) {
        const match = executable(path);
        if (match) return match;
      }
    }
  } catch {
    // Missing and unreadable directories contain no discoverable executable.
  }
  return undefined;
}

export function findClaudeExecutable(): string | undefined {
  const fromPath = findOnPath("claude");
  if (fromPath) return fromPath;

  const protoRoot = join(homedir(), ".proto", "tools", "node");
  return findBelow(protoRoot, new Set(executableNames("claude")));
}
