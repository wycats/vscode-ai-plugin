# Setup

This plugin provides a set of AI agents, skills, and workflow tools. It works with VS Code (via Copilot) and Claude Code — you configure it for your environment once, and a build step produces the files your platform needs.

## Quick start

```sh
git clone https://github.com/wycats/vscode-ai-plugin.git
cd vscode-ai-plugin
pnpm install
pnpm run setup
```

The setup wizard asks which platform and model provider you use, writes your `config.json`, builds the plugin, and (for VS Code) registers it. Reload VS Code and you're done.

If you prefer to configure manually, copy `config.example.json` to `config.json`, edit it, and run `pnpm build` followed by `pnpm install-local`.

## How it works

Agent source files (in `agents/`) use abstract names for models and tools instead of hardcoded provider-specific values. For example, an agent says `model: fast` rather than naming a specific model.

Your `config.json` maps those abstract names to concrete values for your environment. The build reads the source files and your config, resolves the names, and writes ready-to-use agent files to `out/<target>/`.

This means the same agent definitions work for everyone — you just change the config.

## Configuring `config.json`

The file has a JSON Schema (`config.schema.json`) that provides validation and autocomplete in VS Code and other editors. The `$schema` line at the top enables this.

### `target`

Which platform you're building for. This determines the output directory and (eventually) the output format.

- `"vscode"` — for VS Code with GitHub Copilot
- `"claude-code"` — for Claude Code (coming soon)

### `models`

Three roles that agents use, mapped to model strings for your provider:

| Role        | What it's for                   | Which agents use it                   |
| ----------- | ------------------------------- | ------------------------------------- |
| `fast`      | Strong reasoning, complex tasks | execute, prepare, recon, recon-worker |
| `balanced`  | Evaluation and review           | review                                |
| `auxiliary` | Supporting tasks, lower cost    | pre-read, slop-linter                 |

Set a role to `null` to leave the model unspecified — the platform picks its default.

**Examples by provider:**

Copilot (no specific models needed):

```json
"models": {
  "fast": null,
  "balanced": null,
  "auxiliary": null
}
```

Vercel AI Gateway:

```json
"models": {
  "fast": "Claude Opus 4.6 Fast (vercel)",
  "balanced": "Gemini 3.1 Pro Preview (vercel)",
  "auxiliary": "GPT 5.4 (vercel)"
}
```

Claude Code:

```json
"models": {
  "fast": "opus",
  "balanced": "sonnet",
  "auxiliary": "haiku"
}
```

### `toolGroups`

Named sets of tool identifiers that agents reference. The defaults in `config.example.json` work for VS Code — you generally don't need to change these unless you're targeting a different platform or want to add/remove specific tools.

Each agent's source file lists the groups it needs (e.g., `tools: [core, agent, browser, memory]`). The build expands group names into concrete tool lists. If an agent lists a name that isn't a group, it passes through unchanged — so agents can mix groups and individual tools.

The default groups:

| Group              | What it provides                                                       |
| ------------------ | ---------------------------------------------------------------------- |
| `core`             | Basic capabilities: workspace access, file reading, search, web, todos |
| `agent`            | Dispatching subagents                                                  |
| `browser`          | Browser interaction                                                    |
| `edit`             | File editing (only the execute agent needs this)                       |
| `memory`           | Persistent memory across sessions                                      |
| `exo`              | Exosuit context tools                                                  |
| `terminal`         | Full terminal: run commands, await output, kill processes              |
| `terminal-minimal` | Just running commands and reading output                               |
| `testing`          | Running tests and inspecting failures                                  |
| `tasks`            | Creating and running VS Code tasks                                     |
| `github`           | GitHub PRs, issues, search, code review                                |

## Keeping up to date

```sh
git pull
pnpm build
```

Then reload VS Code. Your `config.json` is gitignored, so pulls won't overwrite it. If `config.example.json` adds new fields, you may want to merge them into your config.

## Development

To rebuild automatically when source files or config change:

```sh
pnpm watch
```

To validate the plugin structure:

```sh
pnpm validate
```
