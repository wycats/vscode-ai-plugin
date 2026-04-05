/**
 * Launches Claude Code with the plugin loaded from the output directory.
 * Runs the build first to ensure output is up to date.
 */

import { execSync, spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");

async function launch() {
  // Read config to get target
  let target = "claude-code";
  try {
    const config = JSON.parse(
      await readFile(join(ROOT, "config.json"), "utf-8"),
    ) as { target?: string };
    if (config.target) target = config.target;
  } catch {
    console.error("config.json not found. Run `pnpm run setup` first.");
    process.exit(1);
  }

  if (target !== "claude-code") {
    console.error(
      `config.json target is "${target}", not "claude-code".\nUse pnpm install-local for VS Code.`,
    );
    process.exit(1);
  }

  // Pull latest and build
  try {
    execSync("git pull --ff-only", { cwd: ROOT, stdio: "inherit" });
  } catch {
    // Offline or uncommitted changes — continue with what we have
  }
  execSync("node scripts/build.ts", { cwd: ROOT, stdio: "inherit" });

  // Launch claude with the plugin
  const pluginDir = join(ROOT, "out", target);
  console.log(`\nLaunching Claude Code with plugin from ${pluginDir}\n`);

  const child = spawn("claude", ["--plugin-dir", pluginDir], {
    stdio: "inherit",
    cwd: process.cwd(),
  });

  child.on("error", (err) => {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      console.error(
        "claude command not found. Install Claude Code first:\n  https://code.claude.com",
      );
    } else {
      console.error("Failed to launch:", err.message);
    }
    process.exit(1);
  });

  child.on("exit", (code) => {
    process.exit(code ?? 0);
  });
}

launch().catch((err: unknown) => {
  console.error("Launch failed:", err);
  process.exit(1);
});
