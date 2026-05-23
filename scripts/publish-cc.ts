/**
 * Publishes the Claude Code build output to the `cc-plugin` branch.
 *
 * 1. Builds with target: "claude-code" from the example config
 * 2. Copies build output to a temp directory
 * 3. Adds marketplace.json so the branch is both a plugin and a marketplace
 * 4. Force-pushes to origin/cc-plugin as an orphan commit
 *
 * After running, users can install persistently:
 *   /plugin marketplace add wycats/vscode-ai-plugin@cc-plugin
 *   /plugin install wycats-ai-plugin@wycats-ai-plugin
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
import { execFileSync, execSync } from "node:child_process";
import {
  CLAUDE_CODE_TARGET,
  displayOutputDirectoryForTarget,
  outputPathForTarget,
} from "./target-output.ts";

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const CC_OUT = outputPathForTarget(ROOT, CLAUDE_CODE_TARGET);
const CC_OUT_REL = displayOutputDirectoryForTarget(CLAUDE_CODE_TARGET);
const CC_CONFIG = "config.claude-code.example.json";

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function ensureCCBuild(): void {
  execFileSync(process.execPath, ["scripts/build.ts", "--config", CC_CONFIG], {
    cwd: ROOT,
    stdio: "inherit",
  });
}

async function publish() {
  console.log("Building Claude Code plugin...\n");
  ensureCCBuild();

  // Verify build output
  const manifestPath = join(CC_OUT, ".claude-plugin", "plugin.json");
  if (!(await fileExists(manifestPath))) {
    console.error(`Build output not found at ${CC_OUT_REL}/`);
    process.exit(1);
  }

  // Read plugin metadata for marketplace
  const pluginMeta = JSON.parse(await readFile(manifestPath, "utf-8")) as {
    name: string;
    version: string;
    description: string;
  };

  // Create temp directory: marketplace at root, plugin in plugin/ subdir
  const tmp = await mkdtemp(join(tmpdir(), "cc-plugin-"));

  try {
    // Copy build output into plugin/ subdirectory
    const pluginDir = join(tmp, "plugin");
    await cp(CC_OUT, pluginDir, { recursive: true });

    // Generate marketplace.json at the repo root
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
      `git commit -m "Update Claude Code plugin (${pluginMeta.version})"`,
      { cwd: tmp, stdio: "pipe" },
    );
    execSync(`git push ${remoteUrl} HEAD:refs/heads/cc-plugin --force`, {
      cwd: tmp,
      stdio: "inherit",
    });

    console.log("\nPublished to cc-plugin branch.");
    console.log("\nFor first-time install:");
    console.log(`  /plugin marketplace add wycats/vscode-ai-plugin@cc-plugin`);
    console.log(`  /plugin install ${pluginMeta.name}@${pluginMeta.name}`);
    console.log("\nTo update after publishing:");
    console.log(`  /plugin marketplace update ${pluginMeta.name}`);
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
}

publish().catch((err: unknown) => {
  console.error("Publish failed:", err);
  process.exit(1);
});
