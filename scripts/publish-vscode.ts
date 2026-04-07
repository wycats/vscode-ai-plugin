/**
 * Publishes the VS Code build output by committing dist/vscode/ and
 * marketplace.json to main.
 *
 * This is the local equivalent of the CI workflow. It builds, copies
 * output to dist/vscode/, generates marketplace.json, and commits.
 *
 * Requires a deploy key with write access (or admin push access).
 *
 * After publishing, users install in VS Code via:
 *   Chat: Install Plugin From Source → wycats/vscode-ai-plugin
 */

import {
  readFile,
  writeFile,
  mkdir,
  cp,
  rm,
  access,
} from "node:fs/promises";
import { join } from "node:path";
import { execSync } from "node:child_process";

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const VSCODE_OUT = join(ROOT, "out", "vscode");
const DIST_DIR = join(ROOT, "dist", "vscode");
const CONFIG_PATH = join(ROOT, "config.json");
const VSCODE_EXAMPLE = join(ROOT, "config.example.json");
const MARKETPLACE_PATH = join(ROOT, "marketplace.json");

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function ensureVSCodeBuild(): Promise<void> {
  let needsRestore = false;
  let originalConfig = "";

  try {
    originalConfig = await readFile(CONFIG_PATH, "utf-8");
    const config = JSON.parse(originalConfig) as { target?: string };

    if (config.target !== "vscode") {
      needsRestore = true;
      const vsConfig = await readFile(VSCODE_EXAMPLE, "utf-8");
      await writeFile(CONFIG_PATH, vsConfig);
    }
  } catch {
    needsRestore = true;
    const vsConfig = await readFile(VSCODE_EXAMPLE, "utf-8");
    await writeFile(CONFIG_PATH, vsConfig);
  }

  try {
    execSync("node scripts/build.ts", { cwd: ROOT, stdio: "inherit" });
  } finally {
    if (needsRestore) {
      if (originalConfig) {
        await writeFile(CONFIG_PATH, originalConfig);
      } else {
        await rm(CONFIG_PATH, { force: true });
      }
    }
  }
}

async function publish() {
  console.log("Building VS Code plugin...\n");
  await ensureVSCodeBuild();

  const manifestPath = join(VSCODE_OUT, "plugin.json");
  if (!(await fileExists(manifestPath))) {
    console.error("Build output not found at out/vscode/");
    process.exit(1);
  }

  const pluginMeta = JSON.parse(await readFile(manifestPath, "utf-8")) as {
    name: string;
    version: string;
    description: string;
  };

  // Copy build output to dist/vscode/
  await rm(DIST_DIR, { recursive: true, force: true });
  await mkdir(join(ROOT, "dist"), { recursive: true });
  await cp(VSCODE_OUT, DIST_DIR, { recursive: true });

  // Generate marketplace.json at repo root
  const marketplace = {
    name: pluginMeta.name,
    version: pluginMeta.version,
    description: pluginMeta.description,
    owner: { name: "wycats" },
    plugins: [
      {
        name: pluginMeta.name,
        source: "./dist/vscode",
        description: pluginMeta.description,
      },
    ],
  };

  await writeFile(
    MARKETPLACE_PATH,
    JSON.stringify(marketplace, null, 2) + "\n",
  );

  // Commit and push
  execSync("git add -f dist/vscode/ marketplace.json", {
    cwd: ROOT,
    stdio: "inherit",
  });

  const status = execSync("git diff --cached --stat", {
    cwd: ROOT,
    encoding: "utf-8",
  }).trim();

  if (!status) {
    console.log("\nNo changes to commit — build output is up to date.");
    return;
  }

  execSync(
    `git commit -m "Update VS Code plugin build (${pluginMeta.version})"`,
    { cwd: ROOT, stdio: "inherit" },
  );
  execSync("git push origin main", { cwd: ROOT, stdio: "inherit" });

  console.log("\nPublished VS Code plugin to main.");
  console.log("\nTo install in VS Code:");
  console.log(
    "  Chat: Install Plugin From Source → wycats/vscode-ai-plugin",
  );
}

publish().catch((err: unknown) => {
  console.error("Publish failed:", err);
  process.exit(1);
});
