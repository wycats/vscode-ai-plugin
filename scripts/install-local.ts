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
  // Step 1: run the build
  execSync("node scripts/build.ts", { cwd: ROOT, stdio: "inherit" });

  // Step 2: read current settings
  let content = await readSettings();

  // Step 3: determine output path from config
  let target = "vscode";
  try {
    const config = JSON.parse(
      await readFile(join(ROOT, "config.json"), "utf-8"),
    ) as { target?: string };
    if (config.target) target = config.target;
  } catch {
    // config.json missing — build.ts already errored
  }
  const outPath = join(ROOT, "out", target);

  // Step 4: register plugin output path if not already present
  if (content.includes(outPath)) {
    console.log(`Plugin already registered at ${outPath}`);
  } else {
    content = setJsoncValue(content, ["chat.plugins.paths", outPath], true);
    await writeFile(SETTINGS_PATH, content, "utf-8");
    console.log(`Registered plugin at ${outPath} in ${SETTINGS_PATH}`);
  }

  // Step 5: register hooks directory in chat.hookFilesLocations
  const hooksPath = join(outPath, "hooks");
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
