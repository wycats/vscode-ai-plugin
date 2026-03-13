---
name: session-handoff
description: "Prepare a session handoff so the next agent can start immediately — captures goal, progress, decisions, git state, and actionable next steps into SESSION-STATE.md"
---

# Session Handoff

Produce a `SESSION-STATE.md` in `docs/agent-context/` that gives the next
agent **zero ramp-up time**. The document captures *state*, not
conversation history.

## Inputs

- The current conversation context (what was asked, what was done)
- Access to the filesystem and git

## Process

### 1. Capture verified facts

Run these commands — do not guess:

```bash
git status
git log --oneline -5
git branch --show-current
```

### 2. Collect state across these categories

| Category | Capture | Source |
|---|---|---|
| **Goal** | What the user asked for | Conversation |
| **Progress** | Done / in-progress / blocked | Conversation + filesystem |
| **Decisions** | Choices made and *why* | Conversation |
| **Open questions** | Unresolved items needing user input | Conversation |
| **Files changed** | Paths + one-line descriptions | `git status` + conversation |
| **Git state** | Branch, last commit, uncommitted changes | Git commands |
| **Build state** | See step 3 below | Build commands or user |
| **Gotchas** | Non-obvious things learned the hard way | Conversation |

### 3. Determine build state

The handoff must include whether the code compiles and tests pass. Use this decision tree:

1. **If you ran a build or tests during this session** — report the results directly.
2. **If the workspace has an obvious build command** (e.g., `package.json` scripts, `Makefile`, VS Code tasks) — run it now.
3. **If it's not obvious how to build/test** — use `vscode_askQuestions` to ask the user:
   - "How do I verify the build? (e.g., `pnpm build`, `make`, `cargo check`)"
   - "Should I run tests? If so, what command?"
4. Record the results (or "not verified — user declined") in the Build State section.

### 4. Write `docs/agent-context/SESSION-STATE.md`

Use this structure:

```markdown
# Session Handoff — [Date]

## Goal
[What we're trying to accomplish]

## Status: [In Progress | Blocked | Ready for Review]

## What's Done
- [Completed item with file references]

## What's Next
1. [Specific immediate action]
2. [Following step]

## Key Decisions
- [Decision]: [Rationale]

## Open Questions
- [ ] [Question needing user input]

## Files Changed
| File | Change |
|------|--------|
| path/to/file | Description |

## Git State
- Branch: [name]
- Last commit: [hash] [message]
- Uncommitted: [yes/no — list if yes]

## Build State
- Compiles: [yes/no/not verified]
- Tests: [pass/fail/not run]
- Known issues: [list]

## Gotchas
- [Thing that will confuse the next agent]

## What Your Previous Incarnation Investigated
[Optional — populated during subagent validation in step 7.
Records what the previous agent read, what it concluded, and
what it saw but didn't follow up on. Use these conclusions as
a starting point rather than re-investigating from scratch.]
```

### 5. Review the draft with the user

The user needs to see the actual document, not an abstract list of
items. After writing SESSION-STATE.md, tell the user it's ready for
review and use `vscode_askQuestions` to ask:

- Whether the goal and status are accurate
- Whether anything is missing or should be removed
- Whether the "What's Next" steps are correctly prioritized

If the user has changes, apply them and re-confirm.

### 6. Update the cross-workspace handoff index

Update `/memories/active-handoffs.md` (user memory — persists across all workspaces and conversations) so future agents can discover stale handoffs:

```markdown
# Active Handoffs
| Repo | Branch | Date | Status |
|------|--------|------|--------|
| vscode-ai-gateway | wycats/feature-branch | 2026-03-12 | In Progress |
```

- **Add or update** the row for the current repo/branch.
- **Remove** the row when a handoff is consumed (the next agent picks it up).
- Keep it to one line per repo — this is an index, not a duplicate of the handoff.

### 7. Validate with a subagent (iterate until solid)

This is the quality gate. Do not skip it.

Spawn a read-only subagent (e.g., `recon` or `Explore`). Give it the
handoff prompt you intend to deliver (see step 9) plus this framing:

```
This is a handoff test. Read the repo to come up to speed, then
restate what you've learned and surface any questions. Exhaust
what the repo can tell you before asking.

Once done reporting, STOP and await feedback.
```

**Triage every question the subagent raises:**

| Category | Action |
|----------|--------|
| **Repo gap** (info missing from SESSION-STATE.md or repo) | Fix it now, re-run the subagent |
| **Stale data** (hashes, file lists, state that drifted) | Update SESSION-STATE.md, re-run |
| **Discoverable but not found** | Move the info to where the agent looked |
| **Needs user input** | Surface it to the user now (see below) |

**Surface questions to the user, don't defer them.** The subagent loop
will often uncover questions that require judgment — design decisions,
priority calls, or ambiguities the repo can't resolve. Present these
to the user using `vscode_askQuestions` while you still have session
context. The user may:
- Answer immediately (capture the answer in SESSION-STATE.md)
- Say "defer to next session" (record as an Open Question)
- Redirect the conversation (follow the new thread, then resume)

This is the collaborative part. The goal is not to converge to a
finished document as fast as possible — it's to surface everything
the next agent will need, including things only the user can decide.

**Then ask the subagent a second question:**

> "What questions would you have for the previous session's agent?"

This surfaces what the agent already read and concluded — not what to
work on. Answer from your session context. Persist answers that concern
code that was read or conclusions that were reached into the
"What Your Previous Incarnation Investigated" section in
SESSION-STATE.md.

**Repeat from the top of step 7** after every meaningful change to
SESSION-STATE.md until the subagent's remaining questions are ones the
user has explicitly deferred.

### 8. Pre-read with GPT-5.4 (optional, recommended for complex handoffs)

Once the subagent validation loop has mostly converged (no more repo
gaps, only design decisions remain), invoke the `pre-read` agent to
produce a `SESSION-BRIEFING.md`.

Give the pre-read agent:
1. The handoff prompt you intend to deliver
2. The contents of SESSION-STATE.md

The pre-read agent (GPT-5.4) is better at broad codebase synthesis
than the working agent. It produces a briefing covering:
- Codebase orientation (how key files connect)
- Pre-read of files the current agent didn't fully examine
- Context and conventions the working agent will need

The briefing goes in `/memories/repo/SESSION-BRIEFING.md` using the
**memory tool** (repo memory — persists across conversations, doesn't
pollute git). Paths under `/memories/` are accessed via the memory
tool, not the filesystem.

The pre-read agent returns its briefing as output. Write the
result to `/memories/repo/SESSION-BRIEFING.md` using the memory tool.

After you persist the briefing:
1. Run one more subagent validation pass using the *combined* prompt
   (handoff prompt + "also read SESSION-BRIEFING.md")
2. If the subagent finds issues in the briefing, fix them or re-run
   the pre-read agent
3. Iterate until the combined prompt produces a clean validation

The briefing is **regenerable** — if it gets stale, re-run the
pre-read agent. It's derived from the repo, not hand-maintained.

**When to skip**: Simple handoffs where the next action is obvious
and the codebase context is small. Use judgment.

### 9. Deliver the handoff prompt

Write a handoff prompt (≤5 lines) for the user to give to the next
session. It should say:
- What to read (SESSION-STATE.md, SESSION-BRIEFING.md if it exists, + any other key files)
- What to pick up (the immediate next action)
- A request to restate and surface questions before proceeding

This prompt is the input to the `session-resume` skill.

### 10. Self-verify

- [ ] Could someone start working from this document alone?
- [ ] Are file paths verified against the filesystem (not guessed)?
- [ ] Does "What's Next" say exactly *what* to do (not "continue working on X")?
- [ ] Are gotchas included?
- [ ] Is `/memories/active-handoffs.md` updated?
- [ ] Did the subagent validation loop converge (no repo gaps remain)?
- [ ] For complex handoffs: did the pre-read agent produce SESSION-BRIEFING.md?
- [ ] Is the handoff prompt ready for the user?

## Critical: The handoff document IS the deliverable

Do not shortcut the handoff process. A common failure mode:

1. You gather state using subagent calls or tool calls.
2. After a few rounds, you get impatient and compose the handoff from memory instead of re-checking the repo.
3. The handoff misses changes made *during the gathering process itself*.

The handoff must reflect the repo state **at the moment of writing**, not your recollection of it. If you made changes to files, ran builds, or committed during this process, re-run `git status` and `git log --oneline -3` immediately before writing `SESSION-STATE.md`.

This also applies when the user is iterating on customization files (skills, prompts, instructions) during the session. The handoff should capture the *current* state of those files, not what they looked like when you first read them. Use the subagent/tool-call process to verify — it's the collaborative way to confirm the handoff accurately reflects reality.

## Anti-patterns

- **Summarizing the conversation** — summarize the *state*
- **Storing handoff in `/memories/session/`** — session memory is per-conversation and gets cleared
- **Putting SESSION-STATE.md in the repo root** — it belongs in `docs/agent-context/`
- **Guessing file paths** — verify with `git status` or `ls`
- **Vague next steps** — "continue the refactor" vs. "extract `buildRequest` from `openresponses-chat.ts` into `request-builder.ts`, moving lines 400-450"
- **Omitting gotchas** — the things you learned the hard way are the most valuable part
- **Skipping build verification without asking** — if you don't know the build command, ask; don't just write "unknown"
- **Composing the handoff from memory after gathering** — if you touched files or ran commands during the handoff process, re-verify before writing. The repo may have changed under you.
- **Correcting by strikethrough** — agents read `~~wrong thing~~` and still act on it. Delete wrong information and replace it; don't annotate with strikethrough.

## Output

1. A `docs/agent-context/SESSION-STATE.md` file. If one already exists, update it (don't append — replace with current state).
2. An updated `/memories/active-handoffs.md` entry for cross-workspace discovery.
3. A `/memories/repo/SESSION-BRIEFING.md` (for complex handoffs — produced by the pre-read agent).
4. A handoff prompt (≤5 lines) delivered to the user for the next session.
