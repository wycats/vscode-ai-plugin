---
name: session-save
description: "Mise en place for agent sessions. Keeps SESSION-TRAJECTORY.md loosely updated as work progresses, offers checkpoints at natural boundaries, and senses when a session transition would be natural."
---

# Session Save

This skill is about maintaining readiness — keeping the working environment organized so that if the session ends (planned or not), the next session can start productively. Think of it as mise en place: clean as you go, everything in its place, always ready for the next step.

**Stances used:** collaborative grounding (for timing decisions). See `stances/` for details.

## What SESSION-TRAJECTORY.md is

`/memories/repo/SESSION-TRAJECTORY.md` (accessed via the memory tool) captures the trajectory of the current work — where things are going, what has momentum, live tensions, decisions, and gotchas. It exists so that if the session ends, the next cycle can start with the right direction and momentum.

It is not a conversation log or a snapshot. It captures trajectory — where we are, where we were heading, and what forces are still in play.

## Keeping the trajectory warm

As significant work happens during a session, keep SESSION-TRAJECTORY.md loosely updated. This doesn't mean rewriting it after every edit — it means noticing when something meaningful has changed:

- A major piece of work was completed
- An important decision was made
- A gotcha was discovered
- The plan changed direction
- Files were committed

When these happen, update the relevant section of SESSION-TRAJECTORY.md using the memory tool. This is lightweight — a line or two, not a full transition protocol.

## Checkpoints

Sometimes it's valuable to capture the trajectory more thoroughly without ending the session. A checkpoint is a more complete update at a natural boundary — after completing a feature, before starting a risky change, or when enough has accumulated that you'd hate to lose it.

A checkpoint preserves progress without costing momentum. The session continues after the checkpoint.

Offer a checkpoint when:

- A coherent unit of work just finished
- The session is about to shift to a different kind of task
- Significant progress has accumulated since the last checkpoint

A checkpoint does not require the full collaborative triage from the `session-rest` skill. It's a quick trajectory capture, not a transition.

## Sensing when a transition is natural

Sessions deplete context the way a day in Stardew Valley depletes energy. The returns on continued work diminish as context gets crowded. A transition isn't something to force or resist — it's something to sense.

The agent can observe context usage and estimate remaining work complexity. But whether to transition is a situated decision — the user knows their energy, their schedule, and whether the current momentum is worth preserving or ready to release.

When the tension between continuing and transitioning becomes relevant, collaborate:

- Share what you observe: how much context has been used, how complex the remaining work appears, whether quality seems to be degrading
- Ask the user to combine that with what they know
- A question like "we've used substantial context and the remaining work looks moderate — does continuing feel right to you, or would you rather checkpoint?" is more useful than "should we wrap up?"

The user may want to:

- Continue working — the momentum is valuable and there's capacity left
- Checkpoint and continue — capture the trajectory but keep going
- Transition — invoke `/session-rest` for the between-sessions protocol, or `/session-close` for end-of-day

All three are valid. The agent's job is to surface the natural pressure, not to decide.

## What this skill does NOT do

This skill does not run the transition protocol. When the user decides it's time to transition, they invoke `/session-rest` (between sessions, user is still around) or `/session-close` (end of day, user is leaving). This skill is the ongoing awareness layer; those skills are the transition protocols.
