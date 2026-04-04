# vscode-ai-plugin

An agent toolkit for VS Code Copilot and Claude Code, grounded in a theory of how language activates reasoning in language models.

## What this is

This repo is a working VS Code plugin. Agents, skills, hooks, and instructions that run in every VS Code window. But it's also the testbed for a framework about *how to write good agent customizations*, and a vocabulary of reusable patterns that make those customizations work.

The framework and the practice evolved together. Each skill we built refined the theory, and each theoretical insight improved the skills.

## The core idea

Language models generate text by navigating a probability landscape. Every piece of context reshapes that landscape: the system prompt, the skill instructions, the conversation history, the user's message. Some contexts create broad, shallow valleys where many outputs are plausible (generic prose, mediocre code). Others create narrow, deep wells where the output is precise and coherent.

A **stance** is a consistent set of relationships between the writer, the content, and the reader that creates a well. "The reader is a senior engineer" is a stance. "Every sentence must advance the argument" is a stance. Each one pulls the model's output toward a specific region of the probability landscape.

The practical question for skill design is always: **does each instruction deepen the same well, or does it create a competing well?** Instructions that reinforce each other produce precise, coherent output. Instructions that compete produce confused or stilted output.

This idea has consequences for how skills should be written: described honestly rather than prescriptively, using tensions rather than rules, separating generation from evaluation. [FOUNDATIONS.md](FOUNDATIONS.md) develops the full framework. [QUALITY.md](QUALITY.md) translates it into practical principles.

## Stances

When writing a skill, you're choosing *how the agent should think about the task*. We've found that certain collaborative patterns recur across different skills, and naming them makes them composable. The `stances/` directory contains these named patterns:

**Collaborative grounding** is the most fundamental. The agent has perception (tools, files, search) and superhuman breadth across all of human expression. The user has situated knowledge: intent, priorities, energy, the state of the world beyond the screen. Neither perspective is sufficient alone. Good collaboration combines both: the agent shares what it sees, the user contributes what the agent can't access.

**Joint reading** is what happens when two people examine code or a document together. The agent sees structural patterns; the user sees design intent. The walkthrough skill uses this stance.

**Diagnostic questioning** is asking the right question at the right time. The one that maximally reduces uncertainty about the user's priorities. High-variance questions (where the agent genuinely can't predict the answer) come first, because their answers often resolve lower-variance questions implicitly. The session-rest skill uses this during triage.

**Socratic elicitation** shapes *how* to ask: reflecting back the agent's understanding so the user can refine it, naming tensions to make them concrete, offering interpretations and inviting correction. The goal is to draw out what the user already knows but hasn't articulated, with minimal cognitive load.

**Interpretive synthesis** is Gadamer's hermeneutic circle: understanding the whole through the parts and the parts through the whole. Each pass through the details revises the big picture, and the revised big picture changes how the details look. The session lifecycle skills use this when forming a coherent account of a session's trajectory.

## What's in the plugin

### Session lifecycle

Sessions deplete context the way a day in Stardew Valley depletes energy. The returns on continued work diminish as context gets crowded. Transitions between sessions should feel natural, not forced.

The session skills form a gradient based on how much the user serves as a bridge to the next session:

- **`/session-save`**: ongoing tidiness, like mise en place in a kitchen. Keeps the trajectory document warm as significant work happens.
- **`/session-rest`**: the natural end of a work cycle. The user is still around and carries context in their head. Collaborative triage identifies what to carry forward.
- **`/session-close`**: end of day. The user is stepping away and won't bridge the gap. Full triage, working-style reflection, anticipatory framing for tomorrow.
- **`/session-load`**: start a new cycle. Restores context, adapts to whether the user is warm (after rest) or cold (after close).

### Collaborative review

- **`/walkthrough`**: two people reading code together, one chunk at a time. The agent surfaces structure; the user steers toward what matters. Pauses between chunks are where the value comes from.

### Workflow orchestration

- **`/per-cycle`**: prepare-execute-review workflow using specialized subagents. Currently being redesigned to use FOUNDATIONS principles.
- **`/recon`**: adaptive codebase investigation that follows leads and synthesizes findings.

### Agents

Most agents are subagents, invoked by skills rather than by the user directly. The PER agents (`prepare`, `execute`, `review`) are implementation details of the PER workflow. `pre-read` supports session transitions. `recon-worker` supports the recon skill.

Two agents are user-facing: `recon` (codebase investigation) and `slop-linter` (identifies and removes slop from documents).

### Hooks and instructions

Hooks enforce mechanical constraints that don't require judgment: blocking `npm` in a pnpm environment, blocking `tsx` when Node runs TypeScript natively. The environment instruction provides always-on context about the development environment (proto-managed toolchains, pnpm, strict typing).

A tool-call logging hook records every tool invocation as JSONL, providing an audit trail of what the agent actually did.

## Setup

```sh
git clone https://github.com/wycats/vscode-ai-plugin.git
cd vscode-ai-plugin
pnpm install
pnpm setup
```

The interactive setup wizard asks which platform (VS Code or Claude Code) and model provider you use, writes a `config.json`, builds the plugin, and registers it. Reload VS Code and you're done.

Requires `chat.plugins.enabled: true` (agent plugins are preview).

### How the build works

Agent source files use abstract role names for models and tool groups instead of hardcoded provider-specific values. A local `config.json` (gitignored) maps those roles to concrete values for your environment. The build resolves the names and writes ready-to-use files to `out/<target>/`.

See [docs/setup.md](docs/setup.md) for full configuration details, including model presets by provider and tool group reference.

## Development

```sh
pnpm watch     # Auto-rebuild on source or config changes
pnpm build     # One-off build
pnpm validate  # Check all plugin entries are consistent
pnpm check     # TypeScript + ESLint strict type-checked
```

Edit agents, skills, and stances in this directory. The watch script rebuilds `out/vscode/` on every change. All VS Code windows consume the installed plugin.
