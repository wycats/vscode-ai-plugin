---
name: session-rest
description: "End-of-cycle transition: interpret the session, triage dangling threads with the user, and prepare SESSION-TRAJECTORY.md for the next cycle. The user is still around and serves as a light bridge. Invoke with /session-rest."
disable-model-invocation: true
---

# Session Rest

Like sleeping in Stardew Valley — the day ends naturally because resources are depleting, your progress is preserved, and tomorrow starts fresh with everything you built today. You're not leaving the game. You're completing a cycle.

The user is still around and serves as a light bridge to the next session. They carry context in their head — not perfectly, but enough that the next session doesn't start completely cold. The trajectory document supplements the user's memory rather than replacing it.

This skill has four phases: **interpret**, **triage**, **draft**, **validate**. The first two are collaborative — the agent and user work together to understand the session and decide what carries forward. The last two produce and verify the trajectory document.

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

Scan the conversation for threads that were raised but not resolved:

- Directions explored but not concluded
- Ideas mentioned but not acted on
- Concerns raised but not addressed
- Decisions that seemed settled but may need revisiting in light of later work
- Implicit abandonments — threads silently dropped because something else took priority

For each thread, estimate how predictable the user's intent is. The ambiguous ones — where the agent genuinely can't tell whether the user wants to carry them forward — are the high-variance threads and the focus of Phase 2.

## Phase 2: Triage

The collaborative core. The agent has formed an interpretation and identified threads. Now the user's situated knowledge shapes what gets carried forward.

Because the user is still around and will serve as a bridge, the triage can be lighter than a full `session-close`. Focus on the highest-variance threads — the ones where the user's intent is genuinely ambiguous. The user's fresh memory fills in the rest.

### The approach

Use diagnostic questioning and Socratic elicitation together. Diagnostic questioning identifies *what* to ask (the highest-variance threads, especially pregnant tensions). Socratic elicitation shapes *how* to ask (reflecting the agent's understanding, probing where it might be wrong, making the user's job easy).

### The sequence

Work through the threads one at a time, using `vscode_askQuestions` for each. Start with the thread where the user's intent is hardest to predict. Each answer informs the next question.

The questions should:

- Be easy to answer but hard to predict. "The refactor touched the request builder but stopped before the response handler — was that a natural boundary or did you run out of time?" is better than "Do you want to continue the refactor?"
- Reflect the agent's interpretation and invite correction. "My read is that the session shifted from planning to implementation around the middleware discussion. Does that match how it felt to you?"
- Name tensions when they exist. "There's a tension between finishing the type migration and addressing the test gaps it revealed. Which feels more urgent for the next session?"

If the user's response reveals a thread or priority the diagnostic sequence didn't anticipate, follow it before returning to the sequence. See `stances/diagnostic-questioning.md` and `stances/socratic-elicitation.md` for the deeper treatment of this tension.

### Building the picture

Each answer adds to a shared picture of what the user wants to carry forward. Continue until the picture is coherent enough to draft from — when the answers have built up a consistent account of the user's priorities, and remaining threads fit naturally into that account without needing to be asked about.

The signal is coherence: when new threads stop surprising either party and instead confirm the picture that's already forming, the triage has done its work.

## Phase 3: Draft

Write `/memories/repo/SESSION-TRAJECTORY.md` (using the memory tool) from the shared picture that emerged in Phases 1 and 2. The template in the reference section provides structure, but the content comes from the triage conversation.

The document should convey momentum, not just state. The next agent doesn't just need to know where things are — it needs to feel where things were *going*. Dangling threads are live tensions the next session should feel the pull of.

The draft should reflect:

- The trajectory of the session — not just what happened, but where it was heading (from Phase 1)
- The user's priorities and the momentum they want preserved (from Phase 2)
- Observable state (git, build, files changed)

If a SESSION-TRAJECTORY.md already exists in repo memory, replace it with current trajectory.

## Phase 4: Validate

The next agent will read this document and start working from it. Every gap becomes a wrong assumption. Validation is cheap now — discovering problems after the next agent has been working is expensive.

A subagent reads the document and the repo with fresh eyes. Because the user is serving as a bridge, the validation can focus on repo gaps and stale data rather than priority gaps — the user will fill in priority nuances when the next session starts.

Validation also surfaces collaborative divergences — places where the agent and user thought they agreed during triage but actually had different understandings. These need another round of triage, not just a document fix.

### The loop

```
repeat:
  1. Spawn a read-only subagent (recon or Explore)
  2. Give it SESSION-TRAJECTORY.md
  3. Triage every question it raises
  4. Fix SESSION-TRAJECTORY.md based on what you learn
  5. If meaningful changes were needed → go to 1
  6. If remaining questions are resolved or user-deferred → exit loop
```

The cost of each pass is small compared to the cost of the next agent starting from a flawed document.

## Finalize

Update `/memories/active-handoffs.md` (user memory) with the current repo/branch/date/status.

Write a short prompt (≤5 lines) for the next session:

- What to read (SESSION-TRAJECTORY.md, SESSION-BRIEFING.md if it exists)
- What to pick up (the immediate next action)
- A request to restate and surface questions before proceeding

This prompt is the input to the `session-load` skill.

## Output

1. A `/memories/repo/SESSION-TRAJECTORY.md` (via memory tool)
2. An updated `/memories/active-handoffs.md` entry
3. A transition prompt (≤5 lines) delivered to the user

---

## Reference

### Build state rules

1. **If you ran a build or tests during this session** — report the results directly.
2. **If the workspace has an obvious build command** — run it now.
3. **If it's not obvious how to build/test** — use `vscode_askQuestions` to ask the user.
4. Record the results (or "not verified — user declined") in the Build State section.

### SESSION-TRAJECTORY.md template

```markdown
# Session Trajectory — [Date]

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

[Optional — populated during subagent validation.
Records what the previous agent read, what it concluded, and
what it saw but didn't follow up on.]
```

### Tensions

**Source truth vs. session memory.** The trajectory must reflect the repo at the moment of writing, not your recollection of it.

**Completeness vs. actionability.** The user is a bridge — they'll fill in nuances. Focus on trajectory and momentum over exhaustive detail.

**Interpretation vs. assumption.** Phase 1 forms an account, but it's the agent's interpretation. Phase 2 exists to correct it.

### Things that silently break transitions

- Session memory (`/memories/session/`) gets cleared between conversations — trajectory belongs in repo memory (`/memories/repo/`)
- Strikethrough text (`~~wrong thing~~`) is still read and acted on by agents — delete wrong information and replace it
