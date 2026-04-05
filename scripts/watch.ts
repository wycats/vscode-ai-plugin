/**
 * Watches the plugin source tree for changes to agents, skills, prompts,
 * and config.json. On any change, runs the full build.
 *
 * Uses Node.js native fs.watch (recursive) — no dependencies needed.
 */

import { watch } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const WATCHED_DIRS = ["agents", "skills", "prompts", "instructions", "hooks"];

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

function rebuild() {
  try {
    execSync("node scripts/build.ts", { cwd: ROOT, stdio: "inherit" });
  } catch (err) {
    console.error("Rebuild failed:", err);
  }
}

function scheduleRebuild(event: string, filename: string | null) {
  // Skip plugin.json itself and dotfiles
  if (filename?.startsWith(".") || filename === "plugin.json") return;

  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    console.log(`\n[watch] ${event}: ${filename ?? "unknown"}`);
    rebuild();
  }, 200);
}

// Initial build
rebuild();

// Watch each source directory
for (const dir of WATCHED_DIRS) {
  const fullPath = join(ROOT, dir);
  try {
    watch(fullPath, { recursive: true }, scheduleRebuild);
    console.log(`[watch] Watching ${dir}/`);
  } catch {
    console.log(`[watch] Skipping ${dir}/ (does not exist)`);
  }
}

// Watch config.json
try {
  watch(join(ROOT, "config.json"), scheduleRebuild);
  console.log(`[watch] Watching config.json`);
} catch {
  console.log(`[watch] Skipping config.json (does not exist)`);
}

console.log(
  "[watch] Ready. Editing source files or config.json will rebuild.\n",
);
