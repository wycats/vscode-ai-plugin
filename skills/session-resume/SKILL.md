---
name: session-resume
description: "Resume work from a session handoff — reads SESSION-TRAJECTORY.md, orients the agent, and clears the active-handoffs index"
---

# Session Resume

Pick up where the previous agent left off using `SESSION-TRAJECTORY.md`.

## Inputs

- A `/memories/repo/SESSION-TRAJECTORY.md` (written by the session-handoff skill, accessed via memory tool)
- Optionally, a `/memories/repo/SESSION-BRIEFING.md` (produced by the pre-read agent)
- Access to the filesystem and git

## Process

### 1. Read the handoff

Use the **memory tool** to read `/memories/repo/SESSION-TRAJECTORY.md`. If it doesn't exist, check
`/memories/active-handoffs.md` for other repos with pending handoffs.

Also use the **memory tool** to check `/memories/repo/SESSION-BRIEFING.md`
— if it exists, read it for codebase orientation produced by the pre-read
agent. (Paths under `/memories/` are accessed via the memory tool, not
the filesystem.)

### 2. Verify git state matches

Run:
```bash
git branch --show-current
git log --oneline -3
git status
```

Compare against the handoff's Git State section. If there are
discrepancies, use `vscode_askQuestions` to surface them individually:
- Wrong branch? Ask if the user wants to switch.
- New commits since handoff? Summarize what changed and ask if it affects the plan.
- Uncommitted changes not in the handoff? Ask if they're intentional.

### 3. Check for dependency drift

If the repo uses a package manager (`package.json`, `Cargo.toml`,
`go.mod`, etc.), check if the lock file changed since the handoff
commit. If so, ask the user whether to install dependencies now.

### 4. Present the plan and confirm

Briefly summarize the goal, status, and what's next in chat. Then
use `vscode_askQuestions` to confirm the plan with the user:

- One question per decision point (not a single "ready?" yes/no)
- Surface gotchas as individual items the user can acknowledge or override
- If there are open questions from the handoff, present them now

For example, if the handoff has 3 open questions and 2 gotchas,
present each as a separate question with options rather than dumping
them all as a text block.

### 5. Clean up the index

Remove the current repo's row from `/memories/active-handoffs.md`.

## Anti-patterns

- **Starting work without reading the handoff** — the whole point is zero ramp-up
- **Ignoring git discrepancies** — if the branch moved, the handoff may be stale
- **Deleting SESSION-TRAJECTORY.md immediately** — keep it until the first commit of the new session, so it's recoverable
- **Ignoring SESSION-BRIEFING.md** — if the pre-read agent produced one, it contains valuable codebase context

## Output

A verbal summary of the handoff state presented to the user, with a prompt to begin the next step. The `/memories/active-handoffs.md` entry is removed.
