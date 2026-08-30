import { accessSync, constants, readdirSync } from "node:fs";
import { homedir, platform } from "node:os";
import { delimiter, dirname, extname, join } from "node:path";

export interface ClaudeCommand {
  discoveredPath: string;
  executable: string;
  argumentPrefix: string[];
}

function executable(path: string): string | undefined {
  try {
    accessSync(path, constants.X_OK);
    return path;
  } catch {
    return undefined;
  }
}

function readable(path: string): string | undefined {
  try {
    accessSync(path, constants.R_OK);
    return path;
  } catch {
    return undefined;
  }
}

export function resolveClaudeCommand(
  discoveredPath: string,
  targetPlatform = platform(),
): ClaudeCommand | undefined {
  const extension = extname(discoveredPath).toLowerCase();
  if (targetPlatform !== "win32" || extension === ".exe" || extension === ".com") {
    return { discoveredPath, executable: discoveredPath, argumentPrefix: [] };
  }
  if (extension !== ".cmd" && extension !== ".bat") return undefined;

  const prefix = dirname(discoveredPath);
  const cli = readable(
    join(prefix, "node_modules", "@anthropic-ai", "claude-code", "cli.js"),
  );
  if (!cli) return undefined;
  const bundledNode = executable(join(prefix, "node.exe"));
  return {
    discoveredPath,
    executable: bundledNode ?? process.execPath,
    argumentPrefix: [cli],
  };
}

function executableNames(name: string): string[] {
  if (platform() !== "win32") return [name];
  const extensions = (process.env.PATHEXT ?? ".COM;.EXE;.BAT;.CMD")
    .split(";")
    .filter(Boolean);
  return extensions.map((extension) => `${name}${extension.toLowerCase()}`);
}

function findOnPath(name: string): ClaudeCommand | undefined {
  for (const directory of (process.env.PATH ?? "").split(delimiter)) {
    if (!directory) continue;
    for (const candidate of executableNames(name)) {
      const match = executable(join(directory, candidate));
      if (match) {
        const command = resolveClaudeCommand(match);
        if (command) return command;
      }
    }
  }
  return undefined;
}

function findBelow(root: string, names: Set<string>): ClaudeCommand | undefined {
  try {
    for (const entry of readdirSync(root, { withFileTypes: true })) {
      const path = join(root, entry.name);
      if (entry.isDirectory()) {
        const match = findBelow(path, names);
        if (match) return match;
      } else if (entry.isFile() && names.has(entry.name.toLowerCase())) {
        const match = executable(path);
        if (match) {
          const command = resolveClaudeCommand(match);
          if (command) return command;
        }
      }
    }
  } catch {
    // Missing and unreadable directories contain no discoverable executable.
  }
  return undefined;
}

export function findClaudeCommand(): ClaudeCommand | undefined {
  const fromPath = findOnPath("claude");
  if (fromPath) return fromPath;

  const protoRoot = join(homedir(), ".proto", "tools", "node");
  return findBelow(protoRoot, new Set(executableNames("claude")));
}
