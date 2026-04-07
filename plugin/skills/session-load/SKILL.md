---
name: session-load
description: "Start a new session cycle by loading SESSION-TRAJECTORY.md, orienting to the repo, and confirming the plan with the user. Adapts to whether the user is a fresh bridge (after rest) or returning cold (after close)."
---

# Session Load

Start a new day. Load the save, restore context, and start moving.

The user may be returning from a `session-rest` (still warm — they remember the context and serve as a bridge) or a `session-close` (cold — they slept, context has faded). The load process adapts: lighter orientation when the user is warm, fuller orientation when they're cold.

## Process

### 1. Read the trajectory

Use the **memory tool** to read `/memories/repo/SESSION-TRAJECTORY.md`. If it doesn't exist, check `/memories/active-handoffs.md` for repos with pending transitions.

Also check `/memories/repo/SESSION-BRIEFING.md` — if it exists, the pre-read agent produced codebase orientation that supplements the trajectory.

### 2. Verify git state matches

Run:

```bash
git branch --show-current
git log --oneline -3
git status
```

Compare against the trajectory's Git State section. If there are discrepancies, surface them individually using `vscode_askQuestions`:

- Wrong branch? Ask if the user wants to switch.
- New commits since the transition? Summarize what changed and ask if it affects the plan.
- Uncommitted changes not in the trajectory? Ask if they're intentional.

### 3. Check for dependency drift

If the repo uses a package manager (`package.json`, `Cargo.toml`, `go.mod`, etc.), check if the lock file changed since the trajectory was written. If so, ask the user whether to install dependencies now.

### 4. Orient and confirm

Present the trajectory to the user — where things were going, what's next, what tensions are live. Then use `vscode_askQuestions` to confirm the plan.

Adapt the depth of orientation to the user's state:

**After a rest (user is warm):**

- Brief summary — the user remembers most of the context
- Focus on confirming "What's Next" and any live tensions
- The user will fill in nuances from memory

**After a close (user is cold):**

- Fuller orientation — walk through the trajectory, the briefing if it exists, and the key decisions
- Surface gotchas explicitly — the user may not remember them
- Check whether the anticipatory framing from the close still matches the user's priorities (they may have thought about it overnight and changed their mind)

Present each decision point as a separate question — not a single "ready?" yes/no. Surface gotchas and open questions as individual items the user can acknowledge or override.

### 5. Clean up

Remove the current repo's row from `/memories/active-handoffs.md`.

## Output

A verbal summary of the trajectory presented to the user, with confirmation of the plan and a prompt to begin the next step.
