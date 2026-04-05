/**
 * Interactive setup wizard. Asks a few questions, writes config.json,
 * runs the build, and (for VS Code) registers the plugin.
 */

import { readFile, writeFile, access } from "node:fs/promises";
import { join } from "node:path";
import { execSync } from "node:child_process";
import * as p from "@clack/prompts";

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const CONFIG_PATH = join(ROOT, "config.json");
const VSCODE_EXAMPLE_PATH = join(ROOT, "config.example.json");
const CC_EXAMPLE_PATH = join(ROOT, "config.claude-code.example.json");

interface Config {
  $schema: string;
  target: string;
  models: Record<string, string | null>;
  toolGroups: Record<string, string[]>;
}

const PRESETS: Record<string, Record<string, string | null>> = {
  copilot: {
    fast: null,
    balanced: null,
    auxiliary: null,
  },
  vercel: {
    fast: "Claude Opus 4.6 Fast (vercel)",
    balanced: "Gemini 3.1 Pro Preview (vercel)",
    auxiliary: "GPT 5.4 (vercel)",
  },
  claude: {
    fast: "opus",
    balanced: "sonnet",
    auxiliary: "haiku",
  },
};

async function configExists(): Promise<boolean> {
  try {
    await access(CONFIG_PATH);
    return true;
  } catch {
    return false;
  }
}

async function setup() {
  p.intro("Plugin setup");

  // Check for existing config
  if (await configExists()) {
    const overwrite = await p.confirm({
      message: "config.json already exists. Overwrite it?",
      initialValue: false,
    });

    if (p.isCancel(overwrite) || !overwrite) {
      p.cancel("Setup cancelled. Your existing config.json is unchanged.");
      process.exit(0);
    }
  }

  // 1. Platform
  const target = await p.select({
    message: "What platform are you using?",
    options: [
      { value: "vscode", label: "VS Code", hint: "GitHub Copilot" },
      { value: "claude-code", label: "Claude Code", hint: "coming soon — builds agents in Claude Code format" },
    ],
  });

  if (p.isCancel(target)) {
    p.cancel("Setup cancelled.");
    process.exit(0);
  }

  // 2. Model provider (options depend on target)
  const providerOptions =
    target === "claude-code"
      ? [
          { value: "claude", label: "Claude models", hint: "opus, sonnet, haiku" },
          { value: "custom", label: "Custom", hint: "you'll fill in model names yourself" },
        ]
      : [
          { value: "copilot", label: "Copilot defaults", hint: "no specific models — the platform picks" },
          { value: "vercel", label: "Vercel AI Gateway", hint: "Claude, Gemini, GPT via Vercel" },
          { value: "claude", label: "Claude models", hint: "opus, sonnet, haiku" },
          { value: "custom", label: "Custom", hint: "you'll fill in model names yourself" },
        ];

  const provider = await p.select({
    message: "What model provider do you use?",
    options: providerOptions,
  });

  if (p.isCancel(provider)) {
    p.cancel("Setup cancelled.");
    process.exit(0);
  }

  // 3. Resolve models
  let models: Record<string, string | null>;

  if (provider === "custom") {
    p.note(
      "Enter model names for each role, or leave blank for platform default.",
      "Custom models",
    );

    const fast = await p.text({
      message: "Fast model (execute, prepare, recon):",
      placeholder: "e.g. claude-opus-4-6",
    });
    if (p.isCancel(fast)) { p.cancel("Setup cancelled."); process.exit(0); }

    const balanced = await p.text({
      message: "Balanced model (review):",
      placeholder: "e.g. claude-sonnet-4",
    });
    if (p.isCancel(balanced)) { p.cancel("Setup cancelled."); process.exit(0); }

    const auxiliary = await p.text({
      message: "Auxiliary model (pre-read, slop-linter):",
      placeholder: "e.g. claude-haiku-3",
    });
    if (p.isCancel(auxiliary)) { p.cancel("Setup cancelled."); process.exit(0); }

    models = {
      fast: fast || null,
      balanced: balanced || null,
      auxiliary: auxiliary || null,
    };
  } else {
    models = PRESETS[provider];
  }

  // 4. Build config — use the right example for the target
  const examplePath =
    target === "claude-code" ? CC_EXAMPLE_PATH : VSCODE_EXAMPLE_PATH;
  const example = JSON.parse(
    await readFile(examplePath, "utf-8"),
  ) as Config;

  const config: Config = {
    $schema: "./config.schema.json",
    target: target as string,
    models,
    toolGroups: example.toolGroups,
  };

  await writeFile(CONFIG_PATH, JSON.stringify(config, null, 2) + "\n");

  // 5. Build
  const s = p.spinner();
  s.start("Building plugin");
  try {
    execSync("node scripts/build.ts", { cwd: ROOT, stdio: "pipe" });
    s.stop("Plugin built");
  } catch (err) {
    s.stop("Build failed");
    console.error(err);
    process.exit(1);
  }

  // 6. Register (VS Code only)
  if (target === "vscode") {
    const install = await p.confirm({
      message: "Register the plugin with VS Code now?",
      initialValue: true,
    });

    if (!p.isCancel(install) && install) {
      s.start("Registering with VS Code");
      try {
        execSync("node scripts/install-local.ts", {
          cwd: ROOT,
          stdio: "pipe",
        });
        s.stop("Registered with VS Code");
      } catch (err) {
        s.stop("Registration failed");
        console.error(err);
      }
    }
  }

  // 7. Done
  const outDir = `out/${target as string}`;

  p.note(
    [
      `Config written to config.json`,
      `Plugin built to ${outDir}/`,
      "",
      target === "vscode"
        ? "Reload VS Code to pick up the plugin."
        : `To use with Claude Code:\n  claude --plugin-dir ${join(ROOT, outDir)}\n\nUse /reload-plugins during a session to pick up rebuilds.`,
      "",
      "To rebuild after changes:  pnpm build",
      "To auto-rebuild on save:  pnpm watch",
    ].join("\n"),
    "All done",
  );

  p.outro("Happy coding!");
}

setup().catch((err: unknown) => {
  console.error("Setup failed:", err);
  process.exit(1);
});
