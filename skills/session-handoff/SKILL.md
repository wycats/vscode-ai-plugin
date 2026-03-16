---
name: session-handoff
description: "The full handoff protocol: draft, validate with subagents, and finalize a SESSION-STATE.md so the next agent can start immediately. Invoke with /session-handoff when you're ready to transition."
disable-model-invocation: true
---

# Session Handoff

This is the full handoff protocol. Run it when the user invokes `/session-handoff` — not proactively. For session awareness and checkpoint suggestions, see the `session-continuity` skill.

Produce a `SESSION-STATE.md` in `docs/agent-context/` that gives the next agent zero ramp-up time. The document captures _state_, not conversation history.

This skill has three phases: **draft**, **validate**, **finalize**. The validation loop is the core of the process — the draft is just raw material for it.

## Phase 1: Draft

Gather verified state and write an initial `SESSION-STATE.md`.

### 1a. Capture verified facts

Run these commands — do not guess:

```bash
git status
git log --oneline -5
git branch --show-current
```

### 1b. Collect state

| Category           | Capture                                  | Source                      |
| ------------------ | ---------------------------------------- | --------------------------- |
| **Goal**           | What the user asked for                  | Conversation                |
| **Progress**       | Done / in-progress / blocked             | Conversation + filesystem   |
| **Decisions**      | Choices made and _why_                   | Conversation                |
| **Open questions** | Unresolved items needing user input      | Conversation                |
| **Files changed**  | Paths + one-line descriptions            | `git status` + conversation |
| **Git state**      | Branch, last commit, uncommitted changes | Git commands                |
| **Build state**    | Whether the code compiles and tests pass | See build state rules below |
| **Gotchas**        | Non-obvious things learned the hard way  | Conversation                |

### 1c. Write `docs/agent-context/SESSION-STATE.md`

Use the template in the reference section at the end of this document. If one already exists, replace it with current state.

**The draft does not need to be perfect.** Its purpose is to give the validation loop something concrete to test against.

## Phase 2: Validate

This is the core of the handoff process. Do not skip or abbreviate it.

The goal: iterate with a subagent until the handoff document is good enough that a fresh agent can start working from it alone.

### The loop

```
repeat:
  1. Spawn a read-only subagent
  2. Give it the handoff prompt + SESSION-STATE.md
  3. Triage every question it raises
  4. Fix SESSION-STATE.md based on what you learn
  5. If you made meaningful changes → go to 1
  6. If remaining questions are all user-deferred → exit loop
```

### 2a. Spawn the subagent

Use `recon` or `Explore`. Give it this framing:

> This is a handoff test. Read the repo to come up to speed, then restate what you've learned and surface any questions. Exhaust what the repo can tell you before asking.
>
> Once done reporting, STOP and await feedback.

### 2b. Triage every question

| Question type                                                        | Action                                  |
| -------------------------------------------------------------------- | --------------------------------------- |
| **Repo gap** — info missing from SESSION-STATE.md or repo            | Fix it now                              |
| **Stale data** — hashes, file lists, state that drifted              | Update SESSION-STATE.md                 |
| **Discoverable but not found** — info exists but agent missed it     | Move the info to where the agent looked |
| **Needs user input** — design decisions, priority calls, ambiguities | Surface to the user now (see below)     |

### 2c. Surface questions to the user

The subagent loop will often uncover questions that require judgment. Present these to the user using `vscode_askQuestions` while you still have session context. The user may:

- Answer immediately → capture the answer in SESSION-STATE.md
- Say "defer to next session" → record as an Open Question
- Redirect the conversation → follow the new thread, then resume

This is the collaborative part. The goal is to surface everything the next agent will need, including things only the user can decide.

### 2d. Ask the meta-question

After triaging, ask the subagent one more thing:

> What questions would you have for the previous session's agent?

This surfaces what the agent already read and concluded. Answer from your session context. Persist answers about code that was read or conclusions that were reached into the "What Your Previous Incarnation Investigated" section.

### 2e. Loop back

After every meaningful change to SESSION-STATE.md, **go back to step 2a**. Re-run the subagent with the updated document. Continue until the subagent's remaining questions are ones the user has explicitly deferred.

**Do not exit the loop early.** One pass is almost never enough. The first subagent run surfaces the obvious gaps. The second surfaces the subtle ones. The third confirms convergence.

## Phase 3: Finalize

### 3a. Review with the user

The user needs to see the actual document. After the validation loop converges, use `vscode_askQuestions` to confirm:

- Whether the goal and status are accurate
- Whether anything is missing or should be removed
- Whether the "What's Next" steps are correctly prioritized

### 3b. Pre-read (optional, recommended for complex handoffs)

Once validation has mostly converged, invoke the `pre-read` agent to produce a `SESSION-BRIEFING.md`.

Give the pre-read agent:

1. The handoff prompt you intend to deliver
2. The contents of SESSION-STATE.md

The briefing goes in `/memories/repo/SESSION-BRIEFING.md` using the **memory tool** (repo memory — persists across conversations, doesn't pollute git).

After persisting the briefing, run one more validation pass using the combined prompt (handoff prompt + "also read SESSION-BRIEFING.md"). If the subagent finds issues, fix them or re-run the pre-read agent.

**When to skip**: Simple handoffs where the next action is obvious and the codebase context is small.

### 3c. Update the cross-workspace handoff index

Update `/memories/active-handoffs.md` (user memory):

```markdown
# Active Handoffs

| Repo      | Branch      | Date       | Status      |
| --------- | ----------- | ---------- | ----------- |
| repo-name | branch-name | 2026-03-12 | In Progress |
```

- Add or update the row for the current repo/branch.
- Remove the row when a handoff is consumed.

### 3d. Deliver the handoff prompt

Write a handoff prompt (≤5 lines) for the user to give to the next session:

- What to read (SESSION-STATE.md, SESSION-BRIEFING.md if it exists)
- What to pick up (the immediate next action)
- A request to restate and surface questions before proceeding

This prompt is the input to the `session-resume` skill.

### 3e. Self-verify

- [ ] Could someone start working from this document alone?
- [ ] Are file paths verified against the filesystem?
- [ ] Does "What's Next" say exactly _what_ to do?
- [ ] Are gotchas included?
- [ ] Is `/memories/active-handoffs.md` updated?
- [ ] Did the validation loop converge?
- [ ] Is the handoff prompt ready?

## Output

1. A `docs/agent-context/SESSION-STATE.md` file
2. An updated `/memories/active-handoffs.md` entry
3. A `/memories/repo/SESSION-BRIEFING.md` (for complex handoffs)
4. A handoff prompt (≤5 lines) delivered to the user

---

## Reference

### Build state rules

1. **If you ran a build or tests during this session** — report the results directly.
2. **If the workspace has an obvious build command** — run it now.
3. **If it's not obvious how to build/test** — use `vscode_askQuestions` to ask the user.
4. Record the results (or "not verified — user declined") in the Build State section.

### SESSION-STATE.md template

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

| File         | Change      |
| ------------ | ----------- |
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

[Optional — populated during subagent validation.
Records what the previous agent read, what it concluded, and
what it saw but didn't follow up on.]
```

### Tensions

These are the core tensions in handoff work. Each one requires judgment to resolve in context.

**Source truth vs. session memory.** The handoff must reflect the repo at the moment of writing, not your recollection of it. This tension sharpens during the handoff process itself — if you ran commands, edited files, or committed during gathering, the repo has changed since you last looked. Re-verify before writing. The validation loop exists partly to catch the cases where you didn't.

**Completeness vs. actionability.** A handoff that captures everything but prioritizes nothing is as bad as one that's missing information. The next agent needs to know what to do _first_, not just what exists. "What's Next" should be specific enough to act on immediately — "extract `buildRequest` from `handler.ts` into `request-builder.ts`" rather than "continue the refactor."

**Speed vs. thoroughness in validation.** One validation pass feels sufficient but almost never is. The first pass surfaces obvious gaps. The second surfaces subtle ones. The third confirms convergence. The temptation to exit early is strongest when the draft looks good — which is exactly when the subtle gaps are hiding.

**Your knowledge vs. the next agent's starting point.** You know things from the conversation that aren't in the repo. The next agent starts cold. Gotchas — the things you learned the hard way — are the most valuable part of the handoff precisely because they're invisible to someone reading the code fresh.

**Asking the user vs. guessing.** When you don't know something (build commands, priorities, whether to defer a question), asking is always better than inferring. A handoff that says "not verified — user declined" is more trustworthy than one that says "should compile" based on a guess.

### Things that silently break handoffs

- Session memory (`/memories/session/`) gets cleared between conversations — handoff state belongs in `docs/agent-context/`, not session memory
- Strikethrough text (`~~wrong thing~~`) is still read and acted on by agents — delete wrong information and replace it, don't annotate
