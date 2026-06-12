/**
 * Publishes the Codex build output to the `codex-plugin` branch.
 *
 * 1. Builds with target: "codex" from the example config
 * 2. Packages a Codex marketplace root under out/codex-marketplace/
 * 3. Force-pushes that generated marketplace root to origin/codex-plugin
 *
 * After publishing, users can install persistently:
 *   codex plugin marketplace add wycats/vscode-ai-plugin --ref codex-plugin
 *   codex plugin add wycats-ai-plugin@wycats-ai-plugin
 */

import { cp, mkdtemp, rm, access, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execSync } from "node:child_process";
import {
  CODEX_MARKETPLACE_OUT,
  packageCodexMarketplace,
} from "./package-codex.ts";

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function publish() {
  await packageCodexMarketplace();

  const manifestPath = join(
    CODEX_MARKETPLACE_OUT,
    "plugin",
    ".codex-plugin",
    "plugin.json",
  );
  const marketplacePath = join(
    CODEX_MARKETPLACE_OUT,
    ".agents",
    "plugins",
    "marketplace.json",
  );

  if (!(await fileExists(manifestPath)) || !(await fileExists(marketplacePath))) {
    console.error("Codex marketplace output is incomplete.");
    process.exit(1);
  }

  const pluginMeta = JSON.parse(await readFile(manifestPath, "utf-8")) as {
    name: string;
    version: string;
  };

  const tmp = await mkdtemp(join(tmpdir(), "codex-plugin-"));

  try {
    await cp(CODEX_MARKETPLACE_OUT, tmp, { recursive: true });

    const remoteUrl = execSync("git remote get-url origin", {
      cwd: ROOT,
      encoding: "utf-8",
    }).trim();

    execSync("git init", { cwd: tmp, stdio: "pipe" });
    execSync("git add -A", { cwd: tmp, stdio: "pipe" });
    execSync(
      `git commit -m "Update Codex plugin (${pluginMeta.version})"`,
      { cwd: tmp, stdio: "pipe" },
    );
    execSync(`git push ${remoteUrl} HEAD:refs/heads/codex-plugin --force`, {
      cwd: tmp,
      stdio: "inherit",
    });

    console.log("\nPublished to codex-plugin branch.");
    console.log("\nFor first-time install:");
    console.log(
      "  codex plugin marketplace add wycats/vscode-ai-plugin --ref codex-plugin",
    );
    console.log(`  codex plugin add ${pluginMeta.name}@${pluginMeta.name}`);
    console.log("\nTo update after publishing:");
    console.log(`  codex plugin marketplace upgrade ${pluginMeta.name}`);
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
}

publish().catch((err: unknown) => {
  console.error("Publish failed:", err);
  process.exit(1);
});
