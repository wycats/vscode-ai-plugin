/**
 * Builds plugin.json and registers the plugin directory
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
import { modify, applyEdits } from "jsonc-parser";

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

async function installLocal() {
  // Step 1: rebuild plugin.json
  execSync("node scripts/build-plugin.ts", { cwd: ROOT, stdio: "inherit" });

  // Step 2: read current settings
  let content = await readSettings();

  // Step 3: register plugin path if not already present
  if (content.includes(ROOT)) {
    console.log(`Plugin already registered at ${ROOT}`);
  } else {
    content = setJsoncValue(content, ["chat.plugins.paths", ROOT], true);
    await writeFile(SETTINGS_PATH, content, "utf-8");
    console.log(`Registered plugin at ${ROOT} in ${SETTINGS_PATH}`);
  }

  // Step 4: register hooks directory in chat.hookFilesLocations
  const hooksPath = `${ROOT}/hooks`;
  if (!content.includes(hooksPath)) {
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
