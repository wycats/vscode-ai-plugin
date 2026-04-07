---
name: session-save
description: "Mise en place for agent sessions. Keeps SESSION-TRAJECTORY.md loosely updated as work progresses, offers checkpoints at natural boundaries, and senses when a session transition would be natural."
---

# Session Save

Saving is not stopping. This skill keeps the trajectory warm so that if the session ends — planned or not — the next session can start with the right direction and momentum. Think of it as version control for context: commit early, commit often, keep working.

**Stances used:** dangling thread review (for thorough checkpoints), collaborative grounding (for timing decisions). See `stances/` for details.

## What SESSION-TRAJECTORY.md is

`/memories/repo/SESSION-TRAJECTORY.md` (accessed via the memory tool) captures the trajectory of the current work — where things are going, what has momentum, live tensions, decisions, and gotchas.

It is not a conversation log or a snapshot. It captures trajectory — where we are, where we were heading, and what forces are still in play.

## Keeping the trajectory warm

As significant work happens during a session, keep SESSION-TRAJECTORY.md loosely updated. This doesn't mean rewriting it after every edit — it means noticing when something meaningful has changed:

- A major piece of work was completed
- An important decision was made
- A gotcha was discovered
- The plan changed direction
- Files were committed

When these happen, update the relevant section of SESSION-TRAJECTORY.md using the memory tool. This is lightweight — a line or two, not a full transition protocol. Then keep working.

## Checkpoints

A checkpoint is a more thorough trajectory capture at a natural boundary. After completing a feature, before starting a risky change, or when enough has accumulated that you'd hate to lose it.

A checkpoint has two parts:

1. **Update the trajectory.** Capture what's done, what's next, any new decisions or gotchas.

2. **Gather dangling threads.** Use the **dangling thread review** stance: read back through the conversation since the last checkpoint and look for what the trajectory update didn't capture. Ideas mentioned in passing. Decisions deferred implicitly. Tensions named but not resolved. Fragments that emerged from the work itself. Add what you find to the trajectory's live tensions or what's-next sections.

The second part is what distinguishes a checkpoint from a quick trajectory update. The trajectory captures the main narrative. Dangling thread review catches what the narrative left out.

After the checkpoint, keep working. A checkpoint preserves progress without costing momentum.

Offer a checkpoint when:

- A coherent unit of work just finished
- The session is about to shift to a different kind of task
- Significant progress has accumulated since the last checkpoint

## Transition awareness

Sessions deplete context. The returns on continued work diminish as context gets crowded. A transition isn't something to force or resist — it's something to sense.

When the tension between continuing and transitioning becomes relevant, collaborate:

- Share what you observe: how much context has been used, how complex the remaining work appears
- Ask the user to combine that with what they know
- "We've used substantial context and the remaining work looks moderate — does continuing feel right to you, or would you rather checkpoint?" is more useful than "should we wrap up?"

The user may want to:

- **Continue working** — the momentum is valuable and there's capacity left
- **Checkpoint and continue** — capture the trajectory but keep going
- **Transition** — invoke `/session-rest` or `/session-close` for the transition protocol

All three are valid. The agent's job is to surface the natural pressure, not to decide. And the default is to keep working — transition is something the user chooses, not something saving implies.

## What this skill does NOT do

This skill does not run the transition protocol. When the user decides it's time to transition, they invoke `/session-rest` (between sessions, user is still around) or `/session-close` (end of day, user is leaving). This skill is the ongoing maintenance layer; those skills are the transition protocols.
