---
name: session-handoff
description: "The full handoff protocol: interpret the session, triage dangling threads with the user, draft and validate a handoff document. Invoke with /session-handoff when you're ready to transition."
disable-model-invocation: true
---

# Session Handoff

This is the full handoff protocol. Run it when the user invokes `/session-handoff` — not proactively. For session awareness and checkpoint suggestions, see the `session-continuity` skill.

The handoff produces a `/memories/repo/SESSION-TRAJECTORY.md` (via the memory tool) that gives the next agent zero ramp-up time. Repo memory persists across conversations without polluting git, and works in any workspace without requiring a specific directory structure.

The document is not the starting point — it's the output of a collaborative process. The starting point is understanding what this session accomplished and what the user wants to carry forward.

This skill has four phases: **interpret**, **triage**, **draft**, **validate**. The first two phases are collaborative — the agent and user work together to understand the session and decide what matters. The last two phases produce and verify the document.

**Stances used:** interpretive synthesis (Phase 1), diagnostic questioning + Socratic elicitation (Phase 2), subagent validation (Phase 4). See `stances/` for details.

## Phase 1: Interpret

Form a coherent account of the session by moving between the whole and the parts.

### 1a. Capture observable state

Run these commands — do not guess:

```bash
git status
git log --oneline -5
git branch --show-current
```

### 1b. Form the account

Review the conversation history and form an interpretation of the session as a whole:

- What was the session trying to accomplish?
- How did the work actually unfold — did it follow the initial intent, or did it evolve?
- Where did the session's direction shift, and why?
- What threads were opened but not closed?

This is interpretive synthesis: the initial understanding of the session's intent gets revised as you examine the specific threads, and the threads look different in light of the revised understanding. A decision that seemed settled early on may look different after what happened later. A thread that seemed like a tangent may turn out to have been the most important work.

### 1c. Identify dangling threads

Scan the conversation for threads that were raised but not resolved. These include:

- Directions explored but not concluded
- Ideas mentioned but not acted on
- Concerns raised but not addressed
- Decisions that seemed settled but may need revisiting in light of later work
- Implicit abandonments — threads that were silently dropped, not because they were resolved but because something else took priority

For each thread, estimate how predictable the user's intent is. Some threads are obvious (completed work, explicitly deferred items). Others are ambiguous — the agent genuinely can't tell whether the user wants to carry them forward. The ambiguous ones are the high-variance threads, and they're the focus of Phase 2.

## Phase 2: Triage

This is the collaborative core of the handoff. The agent has formed an interpretation and identified threads. Now the user's situated knowledge — their sense of what has momentum, what was silently abandoned, what carries subtle importance — shapes what gets carried forward.

### The approach

Use diagnostic questioning and Socratic elicitation together. Diagnostic questioning identifies _what_ to ask (the highest-variance threads, especially pregnant tensions). Socratic elicitation shapes _how_ to ask (reflecting the agent's understanding, probing where it might be wrong, making the user's job easy).

### The sequence

Work through the threads one at a time, using `vscode_askQuestions` for each. Start with the thread where the user's intent is hardest to predict — the one with the most variance. Each answer informs the next question.

The questions should:

- Be easy to answer but hard to predict. "The refactor touched the request builder but stopped before the response handler — was that a natural boundary or did you run out of time?" is better than "Do you want to continue the refactor?"
- Reflect the agent's interpretation and invite correction. "My read is that the session shifted from planning to implementation around the middleware discussion. Does that match how it felt to you?"
- Name tensions when they exist. "There's a tension between finishing the type migration and addressing the test gaps it revealed. Which feels more urgent for the next session?"

If the user's response reveals a thread or priority the diagnostic sequence didn't anticipate, follow it before returning to the sequence. The user's energy often points to something more important than the planned question order. See `stances/diagnostic-questioning.md` and `stances/socratic-elicitation.md` for the deeper treatment of this tension.

### Building the picture

Each answer adds to a shared picture of what the user wants to carry forward. Continue the triage until the picture is coherent enough to draft from — when the answers have built up a consistent account of the user's priorities, and remaining threads fit naturally into that account without needing to be asked about.

The signal is coherence: when new threads stop surprising either party and instead confirm the picture that's already forming, the triage has done its work.

As the picture takes shape, it should include:

- What has momentum and should be continued
- What was intentionally set aside
- What the user wants the next agent to prioritize
- Gotchas and context that aren't visible in the code

This picture becomes the input to the draft.

## Phase 3: Draft

Write `/memories/repo/SESSION-TRAJECTORY.md` (using the memory tool) from the shared picture that emerged in Phases 1 and 2. The template in the reference section provides structure, but the content comes from the triage conversation.

The document should convey momentum, not just state. The next agent doesn't just need to know where things are — it needs to feel where things were _going_. Which threads were accelerating? Which decisions were opening up new possibilities? What was the session becoming when it stopped?

Dangling threads aren't just open items on a list — they're live tensions the next session should feel the pull of. Write them as tensions to engage with, not tasks to check off.

The draft should reflect:

- The trajectory of the session — not just what happened, but where it was heading (from Phase 1)
- The user's priorities and the momentum they want preserved (from Phase 2)
- Observable state (git, build, files changed)

The "What's Next" section is especially important — it should reflect the user's stated priorities and convey the direction of the work, not just list steps.

If a SESSION-TRAJECTORY.md already exists in repo memory, replace it with current state.

## Phase 4: Validate

The next agent will read this document cold and start working from it. Every gap, stale reference, or missing context in the document becomes a wrong assumption in the next session — one that may not surface until significant work has been done in the wrong direction. Validation is cheap now. Discovering problems after the next agent has been working for an hour is expensive.

This phase simulates the next agent's experience. A subagent reads the document and the repo with fresh eyes, and every question it asks reveals something the document failed to communicate. Because the triage in Phase 2 was collaborative, the subagent should find fewer priority gaps — but it will find repo gaps (files the document references that have changed), stale data (git state that drifted during the handoff process), and missing context (things that felt obvious during the session but aren't obvious from the document alone).

Validation also surfaces collaborative divergences — places where the agent and user thought they agreed during triage but actually had different understandings. Language creates the appearance of shared understanding even when the underlying interpretations differ slightly. When the subagent asks a question that seems like it should have been resolved in triage, that's often a signal that the agent's understanding of the user's intent diverged from the user's actual intent. These divergences need another round of triage, not just a document fix.

### The loop

```
repeat:
  1. Spawn a read-only subagent (recon or Explore)
  2. Give it the handoff prompt + SESSION-TRAJECTORY.md
  3. Triage every question it raises
  4. Fix SESSION-TRAJECTORY.md based on what you learn
  5. If meaningful changes were needed → go to 1
  6. If remaining questions are resolved or user-deferred → exit loop
```

Give the subagent this framing:

> This is a handoff test. Read the repo to come up to speed, then restate what you've learned and surface any questions. Exhaust what the repo can tell you before asking. Once done, STOP and await feedback.

Triage the subagent's questions:

| Question type                                                  | Action               |
| -------------------------------------------------------------- | -------------------- |
| **Repo gap** — info missing from document or repo              | Fix it now           |
| **Stale data** — state that drifted during the handoff process | Re-verify and update |
| **Needs user input** — something the triage didn't cover       | Ask the user now     |

After triaging, ask the subagent: "What questions would you have for the previous session's agent?" Answers about code that was read or conclusions that were reached go into the "What Your Previous Incarnation Investigated" section.

One validation pass is almost never enough. The first surfaces obvious gaps. The second surfaces subtle ones. The third confirms convergence. The cost of each pass is small compared to the cost of the next agent starting from a flawed document.

## Finalize

### Pre-read (optional, recommended for complex handoffs)

Once validation has converged, invoke the `pre-read` agent to produce a `SESSION-BRIEFING.md`. Give it the handoff prompt and SESSION-TRAJECTORY.md. The briefing goes in `/memories/repo/SESSION-BRIEFING.md` using the memory tool.

Run one more validation pass with the combined prompt. Skip this step for simple handoffs where the next action is obvious.

### Update the handoff index

Update `/memories/active-handoffs.md` (user memory) with the current repo/branch/date/status.

### Deliver the handoff prompt

Write a handoff prompt (≤5 lines) for the next session:

- What to read (SESSION-TRAJECTORY.md, SESSION-BRIEFING.md if it exists)
- What to pick up (the immediate next action)
- A request to restate and surface questions before proceeding

This prompt is the input to the `session-resume` skill.

## Output

1. A `/memories/repo/SESSION-TRAJECTORY.md` (via memory tool)
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

### SESSION-TRAJECTORY.md template

```markdown
# Session Handoff — [Date]

## Where We're Going

[The trajectory — not just the goal, but the direction and momentum]

## Status: [In Progress | Blocked | Ready for Review]

## What's Done

- [Completed item with file references]

## What's Next

1. [Specific immediate action — convey direction, not just steps]
2. [Following step]

## Live Tensions

[Dangling threads as tensions to engage with, not tasks to check off]

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

**Source truth vs. session memory.** The handoff must reflect the repo at the moment of writing, not your recollection of it. Re-verify before writing — especially if you ran commands or edited files during the handoff process itself.

**Completeness vs. actionability.** A handoff that captures everything but prioritizes nothing is as bad as one that's missing information. "What's Next" should be specific enough to act on immediately.

**Interpretation vs. assumption.** The interpretive synthesis in Phase 1 forms an account of the session, but that account is the agent's interpretation — it may not match the user's experience. Phase 2 exists to correct the interpretation before it becomes the document.

### Things that silently break handoffs

- Session memory (`/memories/session/`) gets cleared between conversations — handoff state belongs in repo memory (`/memories/repo/`), not session memory
- Strikethrough text (`~~wrong thing~~`) is still read and acted on by agents — delete wrong information and replace it
