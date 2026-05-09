/**
 * Runs the build and registers the output directory
 * in VS Code's local plugin paths setting.
 *
 * After running, all VS Code windows will pick up the plugin
 * on their next reload or settings sync.
 *
 * Uses jsonc-parser (the same JSONC library VS Code uses
 * internally) to safely edit settings.json while preserving
 * comments and formatting.
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { execSync } from "node:child_process";
import { platform } from "node:os";
import { modify, applyEdits, parse } from "jsonc-parser";
import {
  legacyVSCodeOutputPath,
  outputPathForTarget,
  VSCODE_TARGET,
} from "./target-output.ts";

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const HOME = process.env.HOME ?? "";
const SETTINGS_PATH =
  platform() === "darwin"
    ? join(HOME, "Library/Application Support/Code/User/settings.json")
    : join(
        process.env.XDG_CONFIG_HOME ?? join(HOME, ".config"),
        "Code/User/settings.json",
      );

/** Read settings.json, creating a minimal one if it doesn't exist. */
async function readSettings(): Promise<string> {
  try {
    return await readFile(SETTINGS_PATH, "utf-8");
  } catch {
    await mkdir(dirname(SETTINGS_PATH), { recursive: true });
    const initial = "{}\n";
    await writeFile(SETTINGS_PATH, initial, "utf-8");
    return initial;
  }
}

/** Set a value at a JSONC path, preserving comments and formatting. */
function setJsoncValue(
  content: string,
  path: (string | number)[],
  value: unknown,
): string {
  const edits = modify(content, path, value, {
    formattingOptions: { tabSize: 2, insertSpaces: false },
  });
  return applyEdits(content, edits);
}

/** Remove a JSONC path, preserving comments and formatting. */
function removeJsoncValue(content: string, path: (string | number)[]): string {
  const edits = modify(content, path, undefined, {
    formattingOptions: { tabSize: 2, insertSpaces: false },
  });
  return applyEdits(content, edits);
}

function getJsoncValue(content: string, path: string[]): unknown {
  const parsed = parse(content) as unknown;
  let current = parsed;

  for (const segment of path) {
    if (
      typeof current !== "object" ||
      current === null ||
      Array.isArray(current) ||
      !Object.prototype.hasOwnProperty.call(current, segment)
    ) {
      return undefined;
    }

    current = (current as Record<string, unknown>)[segment];
  }

  return current;
}

function hasJsoncPath(content: string, path: string[]): boolean {
  return getJsoncValue(content, path) !== undefined;
}

function isJsoncPathEnabled(content: string, path: string[]): boolean {
  return getJsoncValue(content, path) === true;
}

async function installLocal() {
  // Step 1: run the build
  execSync("node scripts/build.ts", { cwd: ROOT, stdio: "inherit" });

  // Step 2: determine output path from config
  let target = "vscode";
  try {
    const config = JSON.parse(
      await readFile(join(ROOT, "config.json"), "utf-8"),
    ) as { target?: string };
    if (config.target) target = config.target;
  } catch {
    // config.json missing — build.ts already errored
  }
  const outPath = outputPathForTarget(ROOT, target);

  if (target !== VSCODE_TARGET) {
    console.log(
      `Built ${target} plugin at ${outPath}; no VS Code local registration needed.`,
    );
    return;
  }

  // Step 3: read current settings
  let content = await readSettings();

  // Step 4: remove stale repo-local registrations from the old VS Code root
  const staleOutPath = legacyVSCodeOutputPath(ROOT);
  const staleHooksPath = join(staleOutPath, "hooks");
  let removedStaleEntry = false;

  if (hasJsoncPath(content, ["chat.plugins.paths", staleOutPath])) {
    content = removeJsoncValue(content, ["chat.plugins.paths", staleOutPath]);
    removedStaleEntry = true;
    console.log(`Removed stale plugin registration at ${staleOutPath}`);
  }

  if (hasJsoncPath(content, ["chat.hookFilesLocations", staleHooksPath])) {
    content = removeJsoncValue(content, [
      "chat.hookFilesLocations",
      staleHooksPath,
    ]);
    removedStaleEntry = true;
    console.log(`Removed stale hooks registration at ${staleHooksPath}`);
  }

  if (removedStaleEntry) {
    await writeFile(SETTINGS_PATH, content, "utf-8");
  }

  // Step 5: register plugin output path if not already present
  if (isJsoncPathEnabled(content, ["chat.plugins.paths", outPath])) {
    console.log(`Plugin already registered at ${outPath}`);
  } else {
    content = setJsoncValue(content, ["chat.plugins.paths", outPath], true);
    await writeFile(SETTINGS_PATH, content, "utf-8");
    console.log(`Registered plugin at ${outPath} in ${SETTINGS_PATH}`);
  }

  // Step 6: register hooks directory in chat.hookFilesLocations
  const hooksPath = join(outPath, "hooks");
  if (!isJsoncPathEnabled(content, ["chat.hookFilesLocations", hooksPath])) {
    content = setJsoncValue(
      content,
      ["chat.hookFilesLocations", hooksPath],
      true,
    );
    await writeFile(SETTINGS_PATH, content, "utf-8");
    console.log(`Registered hooks directory at ${hooksPath}`);
  }

  console.log("Reload VS Code windows to pick up changes.");
}

installLocal().catch((err: unknown) => {
  console.error("Install failed:", err);
  process.exit(1);
});
