/**
 * Publishes the VS Code build output to the `vscode-plugin` branch.
 *
 * 1. Builds with target: "vscode" (using config.example.json if needed)
 * 2. Copies build output to a temp directory as plugin/ subdirectory
 * 3. Adds .claude-plugin/marketplace.json so the branch works as a marketplace
 *    (VS Code uses the same marketplace format as Claude Code)
 * 4. Force-pushes to origin/vscode-plugin as an orphan commit
 *
 * After running, users can install in VS Code:
 *   1. Add marketplace: settings.json → chat.plugins.marketplaces: ["wycats/vscode-ai-plugin@vscode-plugin"]
 *   2. Browse @agentPlugins in Extensions view and install
 *   3. Auto-updates every 24h when extensions.autoUpdate is enabled
 */

import {
  readFile,
  writeFile,
  mkdir,
  cp,
  mkdtemp,
  rm,
  access,
} from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execSync } from "node:child_process";

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const VSCODE_OUT = join(ROOT, "out", "vscode");
const CONFIG_PATH = join(ROOT, "config.json");
const VSCODE_EXAMPLE = join(ROOT, "config.example.json");

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
    // No config.json — use the VS Code example
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

  // Verify build output
  const manifestPath = join(VSCODE_OUT, "plugin.json");
  if (!(await fileExists(manifestPath))) {
    console.error("Build output not found at out/vscode/");
    process.exit(1);
  }

  // Read plugin metadata
  const pluginMeta = JSON.parse(await readFile(manifestPath, "utf-8")) as {
    name: string;
    version: string;
    description: string;
  };

  // Create temp directory: marketplace at root, plugin in plugin/ subdir
  const tmp = await mkdtemp(join(tmpdir(), "vscode-plugin-"));

  try {
    // Copy build output into plugin/ subdirectory
    const pluginDir = join(tmp, "plugin");
    await cp(VSCODE_OUT, pluginDir, { recursive: true });

    // Generate marketplace.json at the repo root
    // VS Code uses the same .claude-plugin/marketplace.json format
    const marketplace = {
      $schema: "https://anthropic.com/claude-code/marketplace.schema.json",
      name: pluginMeta.name,
      version: pluginMeta.version,
      description: pluginMeta.description,
      owner: { name: "wycats" },
      plugins: [
        {
          name: pluginMeta.name,
          source: "./plugin",
          description: pluginMeta.description,
        },
      ],
    };

    const marketplaceDir = join(tmp, ".claude-plugin");
    await mkdir(marketplaceDir, { recursive: true });
    await writeFile(
      join(marketplaceDir, "marketplace.json"),
      JSON.stringify(marketplace, null, 2) + "\n",
    );

    // Get remote URL from main repo
    const remoteUrl = execSync("git remote get-url origin", {
      cwd: ROOT,
      encoding: "utf-8",
    }).trim();

    // Init git, commit, and force-push
    execSync("git init", { cwd: tmp, stdio: "pipe" });
    execSync("git add -A", { cwd: tmp, stdio: "pipe" });
    execSync(
      `git commit -m "Update VS Code plugin (${pluginMeta.version})"`,
      { cwd: tmp, stdio: "pipe" },
    );
    execSync(`git push ${remoteUrl} HEAD:refs/heads/vscode-plugin --force`, {
      cwd: tmp,
      stdio: "inherit",
    });

    console.log("\nPublished to vscode-plugin branch.");
    console.log("\nFor first-time install, add to VS Code settings.json:");
    console.log(
      `  "chat.plugins.marketplaces": ["wycats/vscode-ai-plugin@vscode-plugin"]`,
    );
    console.log("\nThen browse @agentPlugins in the Extensions view.");
    console.log("Auto-updates every 24h when extensions.autoUpdate is enabled.");
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
}

publish().catch((err: unknown) => {
  console.error("Publish failed:", err);
  process.exit(1);
});
