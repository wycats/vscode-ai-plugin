# Roadmap

## Current: Local plugin with install script

The plugin lives at `/home/wycats/Code/vscode-ai-plugin` and is registered in VS Code settings via `pnpm run install-local`. This handles:

- Plugin path registration (`chat.plugins.paths`)
- Hook file location registration (`chat.hookFilesLocations`)

This works for a single machine. Setup is manual but one-time.

## Future: VS Code extension packaging

The plugin's content (skills, agents, instructions, hooks) can be packaged as a VS Code extension (`.vsix`). This would provide automatic setup, cross-machine distribution, and updates.

### What extensions can contribute natively

These are discovered automatically from `package.json` contribution points:

| Contribution point | What it provides |
|---|---|
| `chatSkills` | Skills (`SKILL.md` files) |
| `chatInstructions` | Instructions (`.instructions.md` files) |
| `chatPromptFiles` | Prompts (`.prompt.md` files) |
| `languageModelTools` | LM tools |
| `mcpServerDefinitionProviders` | MCP server definitions |

### What requires programmatic registration

These have no contribution point. The extension would register them on activation using `vscode.workspace.getConfiguration().update()`:

| Feature | Setting to register |
|---|---|
| Custom agents (`.agent.md`) | `chat.plugins.paths` → extension root |
| Hooks (`.json` files) | `chat.hookFilesLocations` → extension `hooks/` directory |

### Extension activation pattern

```typescript
export async function activate(context: vscode.ExtensionContext) {
  const config = vscode.workspace.getConfiguration();

  // Register hooks directory
  const hooksPath = path.join(context.extensionPath, "hooks");
  const hookLocations = config.get<Record<string, boolean>>("chat.hookFilesLocations") ?? {};
  if (!hookLocations[hooksPath]) {
    hookLocations[hooksPath] = true;
    await config.update("chat.hookFilesLocations", hookLocations, vscode.ConfigurationTarget.Global);
  }

  // Register as plugin for agent discovery
  const pluginPaths = config.get<Record<string, boolean>>("chat.plugins.paths") ?? {};
  if (!pluginPaths[context.extensionPath]) {
    pluginPaths[context.extensionPath] = true;
    await config.update("chat.plugins.paths", pluginPaths, vscode.ConfigurationTarget.Global);
  }
}
```

### Relationship to exo2

The exo2 project (`/home/wycats/Code/exo2`) already has a VS Code extension. This plugin could become a companion extension to exo2, or the registration logic could be added to exo2's existing extension. The skills, agents, and hooks would ship alongside exo2's other VS Code contributions.

### When to make this transition

The local plugin format is better for iteration. Move to extension packaging when:

- The skill and agent definitions have stabilized
- You want the toolkit on multiple machines
- You want automatic setup without `install-local.ts`
- You want to distribute the toolkit to others

### What stays the same

The actual content files (SKILL.md, .agent.md, .instructions.md, hook JSON, hook scripts) are identical in both formats. The extension just changes how they're discovered and registered. The authoring workflow doesn't change — you still edit markdown and JSON files.
