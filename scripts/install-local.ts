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

  // Step 3: register plugin path if not already present
  if (alreadyRegistered) {
    console.log(`Plugin already registered at ${ROOT}`);
  } else if (content.includes('"chat.plugins.paths"')) {
    const escapedForSed = ROOT.replace(/\//g, "\\/");
    execSync(
      `sed -i '/"chat.plugins.paths"/{n;s/{/{ "${escapedForSed}": true,/}' "${SETTINGS_PATH}"`,
      { stdio: "inherit" },
    );
    console.log(`Registered plugin at ${ROOT} in ${SETTINGS_PATH}`);
  } else {
    const escapedForSed = ROOT.replace(/\//g, "\\/");
    execSync(
      `sed -i '$i\\\\t"chat.plugins.paths": {\\n\\t\\t"${escapedForSed}": true\\n\\t},' "${SETTINGS_PATH}"`,
      { stdio: "inherit" },
    );
    console.log(`Registered plugin at ${ROOT} in ${SETTINGS_PATH}`);
  }

  // Step 4: register hooks directory in chat.hookFilesLocations
  // Plugins don't auto-discover hooks from their own directory,
  // so we register the path explicitly.
  // Re-read settings in case step 3 modified the file.
  const updatedContent = await readFile(SETTINGS_PATH, "utf-8");
  const hooksPath = `${ROOT}/hooks`;
  const hooksEscapedForRegex = hooksPath.replace(/[/\\]/g, "\\$&");
  const hooksAlreadyRegistered = new RegExp(hooksEscapedForRegex).test(
    updatedContent,
  );

  if (!hooksAlreadyRegistered) {
    const hooksEscapedForSed = hooksPath.replace(/\//g, "\\/");
    if (updatedContent.includes('"chat.hookFilesLocations"')) {
      execSync(
        `sed -i '/"chat.hookFilesLocations"/{n;s/{/{ "${hooksEscapedForSed}": true,/}' "${SETTINGS_PATH}"`,
        { stdio: "inherit" },
      );
    } else {
      execSync(
        `sed -i '/"chat.plugins.paths"/i\\\\t"chat.hookFilesLocations": {\\n\\t\\t"${hooksEscapedForSed}": true\\n\\t},' "${SETTINGS_PATH}"`,
        { stdio: "inherit" },
      );
    }
    console.log(`Registered hooks directory at ${hooksPath}`);
  }

  console.log("Reload VS Code windows to pick up changes.");
}

installLocal().catch((err: unknown) => {
  console.error("Install failed:", err);
  process.exit(1);
});
