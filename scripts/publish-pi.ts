/** Publish the generated Pi package at the root of the pi-plugin branch. */
import { cp, mkdtemp, readFile, rm, writeFile, access } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

export const PI_PUBLICATION_BRANCH = "pi-plugin";
const ROOT = fileURLToPath(new URL("..", import.meta.url));

function git(cwd: string, args: string[]): string {
  return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

/** Accepts a built package; tests publish exclusively to disposable local remotes. */
export async function publishPiOutput(output: string, remote: string): Promise<string> {
  const manifest = JSON.parse(await readFile(join(output, "package.json"), "utf8")) as {
    name?: string;
    version?: string;
    pi?: { skills?: string[]; subagents?: { agents?: string[] } };
  };
  if (!manifest.name || !manifest.version ||
      !manifest.pi?.skills?.includes("./skills/recon") ||
      !manifest.pi.subagents?.agents?.includes("./agents")) {
    throw new Error("Pi publication requires a generated Recon package manifest");
  }
  for (const path of ["skills/recon/SKILL.md", "agents/wycats-recon.agent.md", "stances", "composition-index.json", "projection-capabilities.json"]) {
    await access(join(output, path));
  }

  const stage = await mkdtemp(join(tmpdir(), "wycats-pi-publish-"));
  try {
    await cp(output, stage, { recursive: true });
    await writeFile(join(stage, "README.md"), `# Wycats AI Plugin — Pi projection\n\nGenerated from the canonical resources in [wycats/vscode-ai-plugin](https://github.com/wycats/vscode-ai-plugin).\n\nRequires Node 24+, Pi, and pi-subagents for the delegated agent. This first projection exposes Recon and private constituent stances. See projection-capabilities.json for scope and runtime assumptions.\n\nInstall:\n\n\`\`\`sh\npi install git:github.com/wycats/vscode-ai-plugin@pi-plugin\n\`\`\`\n\nUpdate on Pi 0.85.1:\n\n\`\`\`sh\npi update git:github.com/wycats/vscode-ai-plugin@pi-plugin\n\`\`\`\n\nThen use /reload or restart pi. This branch is generated; edit canonical resources on main.\n`);
    git(stage, ["init", "--quiet"]);
    git(stage, ["config", "user.name", "github-actions[bot]"]);
    git(stage, ["config", "user.email", "github-actions[bot]@users.noreply.github.com"]);
    git(stage, ["remote", "add", "origin", remote]);
    const ref = `refs/heads/${PI_PUBLICATION_BRANCH}`;
    const previous = git(stage, ["ls-remote", "--heads", "origin", ref]).split(/\s+/)[0] ?? "";
    git(stage, ["add", "--all"]);
    // An orphan snapshot matches the existing generated publication branches.
    git(stage, ["commit", "--quiet", "-m", `Update Pi plugin (${manifest.version})`]);
    const head = git(stage, ["rev-parse", "HEAD"]);
    // Refuse to overwrite a publication that changed after the observed head.
    git(stage, ["push", `--force-with-lease=${ref}:${previous}`, "origin", `HEAD:${ref}`]);
    return head;
  } finally {
    await rm(stage, { recursive: true, force: true });
  }
}

async function main(): Promise<void> {
  if (process.argv.length > 2) throw new Error("Usage: pnpm publish-pi (publishes to origin/pi-plugin)");
  const stage = await mkdtemp(join(tmpdir(), "wycats-pi-build-"));
  try {
    const output = join(stage, "package");
    execFileSync(process.execPath, ["scripts/build.ts", "--config", "config.pi.example.json", "--output", output], { cwd: ROOT, stdio: "inherit" });
    const remote = git(ROOT, ["remote", "get-url", "origin"]);
    const head = await publishPiOutput(output, remote);
    console.log(`Published Pi package to ${PI_PUBLICATION_BRANCH}: ${head}`);
  } finally {
    await rm(stage, { recursive: true, force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error: unknown) => {
    console.error("Pi publication failed:", error);
    process.exitCode = 1;
  });
}
