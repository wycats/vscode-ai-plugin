/**
 * Packages the Codex build output into dist/codex/ and writes a repo-local
 * Codex marketplace at .agents/plugins/marketplace.json.
 *
 * After running, add this repo as a Codex marketplace:
 *   codex plugin marketplace add /path/to/vscode-ai-plugin
 */

import { readFile, writeFile, mkdir, cp, rm, access } from "node:fs/promises";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import {
  CODEX_TARGET,
  displayDistDirectoryForTarget,
  displayOutputDirectoryForTarget,
  distPathForTarget,
  outputPathForTarget,
} from "./target-output.ts";

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const CODEX_OUT = outputPathForTarget(ROOT, CODEX_TARGET);
const DIST_DIR = distPathForTarget(ROOT, CODEX_TARGET);
const DIST_DIR_REL = displayDistDirectoryForTarget(CODEX_TARGET);
const CODEX_CONFIG = "config.codex.example.json";
const MARKETPLACE_PATH = join(ROOT, ".agents", "plugins", "marketplace.json");

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function ensureCodexBuild(): void {
  execFileSync(process.execPath, ["scripts/build.ts", "--config", CODEX_CONFIG], {
    cwd: ROOT,
    stdio: "inherit",
  });
}

async function publish() {
  console.log("Building Codex plugin...\n");
  ensureCodexBuild();

  const manifestPath = join(CODEX_OUT, ".codex-plugin", "plugin.json");
  if (!(await fileExists(manifestPath))) {
    console.error(
      `Build output not found at ${displayOutputDirectoryForTarget(CODEX_TARGET)}/`,
    );
    process.exit(1);
  }

  const pluginMeta = JSON.parse(await readFile(manifestPath, "utf-8")) as {
    name: string;
    description: string;
  };

  await rm(DIST_DIR, { recursive: true, force: true });
  await mkdir(join(ROOT, "dist"), { recursive: true });
  await cp(CODEX_OUT, DIST_DIR, { recursive: true });
  await cp(join(ROOT, "README.md"), join(DIST_DIR, "README.md"));

  const marketplace = {
    name: pluginMeta.name,
    interface: {
      displayName: "Wycats AI Plugin",
    },
    plugins: [
      {
        name: pluginMeta.name,
        source: {
          source: "local",
          path: `./${DIST_DIR_REL}`,
        },
        policy: {
          installation: "AVAILABLE",
          authentication: "ON_INSTALL",
        },
        category: "Developer Tools",
      },
    ],
  };

  await mkdir(join(ROOT, ".agents", "plugins"), { recursive: true });
  await writeFile(
    MARKETPLACE_PATH,
    JSON.stringify(marketplace, null, 2) + "\n",
  );

  console.log("\nPackaged Codex plugin.");
  console.log(`  plugin:      ${DIST_DIR_REL}/`);
  console.log("  marketplace: .agents/plugins/marketplace.json");
  console.log("\nTo install in Codex:");
  console.log(`  codex plugin marketplace add ${ROOT}`);
  console.log(`  codex plugin add ${pluginMeta.name}@${pluginMeta.name}`);
}

publish().catch((err: unknown) => {
  console.error("Publish failed:", err);
  process.exit(1);
});
