---
name: session-close
description: "End-of-day close: the user is stepping away and won't serve as a bridge. Full collaborative triage, working-style reflection, and anticipatory framing for the next day. Invoke with /session-close."
disable-model-invocation: true
---

# Session Close

Actually putting the device down. The user is leaving — going to sleep, stepping away for the evening, taking a real break. The bridge goes away. The next session starts with _only_ what's written down plus whatever the user remembers after a real break.

This is the most thorough transition protocol. It includes everything `session-rest` does, plus:

- **Working-style reflection** — how did the collaboration work today?
- **Cross-session patterns** — what's been building across multiple sessions?
- **Anticipatory framing** — what should tomorrow's first session be set up for?

**Stances used:** interpretive synthesis, diagnostic questioning, Socratic elicitation, self-reflection (Phase 5). See `stances/` for details.

## Phases 1–4: Same as session-rest

Run the full `session-rest` protocol: interpret, triage, draft, validate. The triage should be more thorough than a between-sessions rest — the user won't be around to fill in gaps, so the trajectory document needs to carry more weight.

In Phase 2 (triage), don't rely on the user bridging nuances. Ask about threads that would be low-variance in a `session-rest` — the user might remember them now, but they won't tomorrow.

In Phase 3 (draft), write for a reader who has slept since the last session. Context that feels obvious now will be cold tomorrow.

## Phase 5: Reflect

This phase captures things that don't belong in the trajectory but matter for future sessions.

### 5a. Working-style reflection

Reflect on how the collaboration worked during this session. What patterns emerged in how the user and agent worked together? This is metacognition — stepping back from the work to observe the process.

Update `/memories/collaborative-style.md` (user memory, persists across all workspaces) with observations about:

- How the user likes to explore ideas (do they bring intuitions for grounding? do they prefer to see options?)
- How the user makes decisions (do they want to discuss tradeoffs? do they decide quickly?)
- What kind of questions work well (structured choices? open-ended? reflective probes?)
- What the user pushes back on (what signals that the agent should think harder?)
- Pacing preferences (does the user like to go deep on one thing or cover ground?)

Don't overwrite previous observations — add to them. Working style evolves over time, and earlier observations provide context for later ones.

### 5b. Cross-session patterns

If this session is part of a longer arc of work, note patterns that span sessions:

- Recurring tensions that keep coming back
- Design directions that are solidifying
- Areas where understanding is deepening session over session

These go in the trajectory document's "Where We're Going" section — they're part of the trajectory, not just this session's trajectory.

### 5c. Anticipatory framing

Arrange the desk for tomorrow. Based on what happened today and what the user said during triage:

- What should the first action of the next session be?
- What context will the user need refreshed after sleeping?
- Are there any time-sensitive items (PRs to review, builds to check, deadlines)?
- What's the most important thing to _not_ forget?

This goes in the trajectory document and in the transition prompt.

## Phase 6: Pre-read (recommended)

For end-of-day closes, invoke the `pre-read` agent to produce a `SESSION-BRIEFING.md`. The user won't remember codebase details tomorrow — the briefing provides the orientation that the user's memory would normally supply.

Give the pre-read agent the transition prompt and SESSION-TRAJECTORY.md. The briefing goes in `/memories/repo/SESSION-BRIEFING.md` using the memory tool.

Run one more validation pass with the combined prompt.

## Finalize

Update `/memories/active-handoffs.md` (user memory) with the current repo/branch/date/status.

Write a transition prompt (≤5 lines) for the next session. For end-of-day closes, the prompt should be especially clear about what to pick up first — the user will be reading it with fresh but cold eyes.

This prompt is the input to the `session-load` skill.

## Output

1. A `/memories/repo/SESSION-TRAJECTORY.md` (via memory tool)
2. An updated `/memories/collaborative-style.md` (user memory)
3. An updated `/memories/active-handoffs.md` entry
4. A `/memories/repo/SESSION-BRIEFING.md` (recommended for end-of-day)
5. A transition prompt (≤5 lines) delivered to the user
