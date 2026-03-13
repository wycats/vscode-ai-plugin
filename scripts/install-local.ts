/**
 * Builds plugin.json and registers the plugin directory
 * in VS Code's local plugin paths setting.
 *
 * After running, all VS Code windows will pick up the plugin
 * on their next reload or settings sync.
 *
 * Uses `sed` to patch the JSONC settings file rather than
 * parsing it (VS Code settings.json contains comments and
 * trailing commas that JSON.parse cannot handle).
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { execSync } from "node:child_process";

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const SETTINGS_PATH = join(
  process.env.HOME ?? "",
  ".config/Code/User/settings.json",
);

async function installLocal() {
  // Step 1: rebuild plugin.json
  execSync("node scripts/build-plugin.ts", { cwd: ROOT, stdio: "inherit" });

  // Step 2: check if already registered
  const content = await readFile(SETTINGS_PATH, "utf-8");

  // Escape the path for use in a regex and JSON
  const escapedForRegex = ROOT.replace(/[/\\]/g, "\\$&");
  const alreadyRegistered = new RegExp(escapedForRegex).test(content);

  if (alreadyRegistered) {
    console.log(`Plugin already registered at ${ROOT}`);
    return;
  }

  // Step 3: check if chat.plugins.paths exists
  if (content.includes('"chat.plugins.paths"')) {
    // Add our path to the existing object — insert after the opening brace
    const escapedForSed = ROOT.replace(/\//g, "\\/");
    execSync(
      `sed -i '/"chat.plugins.paths"/{n;s/{/{ "${escapedForSed}": true,/}' "${SETTINGS_PATH}"`,
      { stdio: "inherit" },
    );
  } else {
    // Add the entire setting before the final closing brace
    const escapedForSed = ROOT.replace(/\//g, "\\/");
    execSync(
      `sed -i '$i\\\\t"chat.plugins.paths": {\\n\\t\\t"${escapedForSed}": true\\n\\t},' "${SETTINGS_PATH}"`,
      { stdio: "inherit" },
    );
  }

  console.log(`Registered plugin at ${ROOT} in ${SETTINGS_PATH}`);
  console.log("Reload VS Code windows to pick up changes.");
}

installLocal().catch((err: unknown) => {
  console.error("Install failed:", err);
  process.exit(1);
});
