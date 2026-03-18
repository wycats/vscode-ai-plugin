---
name: session-continuity
description: "Awareness of session state and progress over time. Keeps SESSION-STATE.md loosely updated, offers mid-session checkpoints at natural boundaries, and collaborates with the user on timing decisions like handoffs."
---

# Session Continuity

This skill is about awareness, not action. It describes how to think about session state, when to checkpoint progress, and how to collaborate with the user on timing decisions.

## What SESSION-HANDOFF.md is

`/memories/repo/SESSION-HANDOFF.md` (accessed via the memory tool) captures the trajectory of the current work — where things are going, what has momentum, live tensions, decisions, and gotchas. It exists so that if the session ends (planned or not), the next agent can start with the right direction and momentum.

It is not a conversation log or a snapshot. It captures trajectory — where we are, where we were heading, and what forces are still in play.

## Keeping the handoff warm

As significant work happens during a session, keep SESSION-HANDOFF.md loosely updated. This doesn't mean rewriting it after every edit — it means noticing when something meaningful has changed:

- A major piece of work was completed
- An important decision was made
- A gotcha was discovered
- The plan changed direction
- Files were committed

When these happen, update the relevant section of SESSION-HANDOFF.md using the memory tool. This is lightweight — a line or two, not a full handoff protocol.

## Mid-session checkpoints

Sometimes it's valuable to capture the trajectory without ending the session. A checkpoint is a more thorough update to SESSION-HANDOFF.md at a natural boundary — after completing a feature, before starting a risky change, or when enough has accumulated that you'd hate to lose it.

A checkpoint preserves knowledge without costing momentum. The session continues after the checkpoint.

Offer a checkpoint when:

- A coherent unit of work just finished
- The session is about to shift to a different kind of task
- Significant progress has accumulated since the last checkpoint

A checkpoint does not require the full validation loop from the `session-handoff` skill. It's a quick state capture, not a handoff.

## The handoff timing tension

Handoffs preserve knowledge across session boundaries, but they cost time and momentum to produce. A premature handoff wastes the remaining capacity of the current session — capacity that's expensive to rebuild because the next agent starts cold.

The right moment for a handoff is when the cost of continuing (context exhaustion, degraded quality) exceeds the cost of transitioning (time spent on handoff, knowledge lost in transfer).

This is a situated decision. The agent can observe context usage and estimate remaining work complexity. But the user knows things the agent cannot access: their energy level, their schedule, whether they're in a flow state, how much more they want to accomplish in this session.

When the tension between continuing and handing off becomes relevant, collaborate:

- Share what you observe: how much context has been used, how complex the remaining work appears, whether quality seems to be degrading
- Ask the user to combine that with what they know
- A question like "we've used substantial context and the remaining work looks moderate — does continuing feel right to you, or would you rather checkpoint and hand off?" is more useful than "should we wrap up?"

The user may want to:

- Continue working — the momentum is valuable and there's capacity left
- Checkpoint and continue — capture state but keep going
- Do a full handoff — invoke `/session-handoff` for the complete protocol

All three are valid. The agent's job is to surface the tension, not to resolve it.

## What this skill does NOT do

This skill does not run the handoff protocol. When the user decides it's time for a full handoff, they invoke `/session-handoff`, which runs the complete draft/validate/finalize process. This skill is the awareness layer; that skill is the execution layer.
