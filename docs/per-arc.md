# PER Arc

A PER arc is the continuity layer around repeated PER cycles. The cycle separates prediction, action, and evaluation for a bounded piece of work. The arc preserves enough of the larger project motion that each new cycle can start situated instead of reconstructing the whole idea from scratch.

The dashboard is the instrument panel for that arc. It is not a gate. It tells the agent and the user what the instruments currently show: where the project is, what evidence has accumulated, where reality diverged from the working model, what tensions are still live, and what move looks good next.

The tension to navigate: continuity vs. ceremony. If the dashboard becomes a task tracker or ritual checklist, it steals momentum from the work. If nothing carries forward, every cycle rebuilds the project concept from memory and the user has to supply context the repo could have preserved.

## Related context

This note sits between the repo's foundational theory and its executable workflow skills:

- [FOUNDATIONS.md](../FOUNDATIONS.md) explains the underlying mechanics: stances, generation vs. evaluation, and the boundary between observable state and situated judgment.
- [QUALITY.md](../QUALITY.md) turns those mechanics into principles for writing skills and agents without drifting into checklist ceremony.
- [skills/per-cycle/SKILL.md](../skills/per-cycle/SKILL.md) defines the local `prepare → execute → review` loop that a PER arc surrounds.
- [skills/session-save/SKILL.md](../skills/session-save/SKILL.md), [skills/session-rest/SKILL.md](../skills/session-rest/SKILL.md), [skills/session-close/SKILL.md](../skills/session-close/SKILL.md), and [skills/session-load/SKILL.md](../skills/session-load/SKILL.md) preserve continuity across session boundaries; the PER arc preserves continuity across project cycles.

## What a PER arc is

A PER arc is the project-level trajectory that emerges across one or more `prepare → execute → review` cycles.

It holds the material that is too large for a single cycle handoff but too active to become permanent documentation:

- the current shape of the work
- the hypotheses that are guiding the next move
- the evidence that has accumulated from execution and review
- the divergences that changed the model
- the tensions that still need user judgment
- the threads that are parked but not dead

The arc is not another phase after review. It is the memory of what review taught the project. A single PER cycle asks, "Did this experiment match the hypothesis?" The arc asks, "Given what the recent experiments taught us, where is this project now?"

## What the dashboard preserves

The dashboard preserves situated continuity, not session reconstruction.

It should be enough for a future agent to feel the project's current motion without replaying the whole conversation. That means preserving the forces still acting on the work rather than every detail that produced them.

What belongs there:

- observable repo state when it matters: files changed, tests run, build status, known tool output
- the working hypothesis for the current move
- evidence gathered by execution or review
- divergences between expectation and reality
- live tensions where the next move depends on judgment
- user-shaped priorities, taste, and momentum that cannot be inferred from files

The information boundary matters. Repo and tool state should be observed. Priorities, momentum, taste, and timing are situated in the user and need collaborative grounding. The dashboard should make that boundary visible instead of pretending everything can be read from the workspace.

## Relationship to `/per-cycle`

`/per-cycle` is the local experiment loop:

1. prepare forms a hypothesis
2. execute tests it against reality
3. review evaluates the distance between prediction and result

The PER arc is the continuity layer around that loop. It carries forward what the loop learned so the next cycle begins with a calibrated project model.

This preserves the generation/evaluation separation that makes PER useful:

- hypotheses and the next good move stay on the generative side
- evidence, test results, and divergences stay on the evaluative side
- live tensions mark places where neither side is enough without the user's situated judgment

The dashboard should not blur these categories. A hypothesis is not evidence. A divergence is not automatically a problem. A next move is not proof that the previous move worked. Keeping those distinctions visible is the dashboard's main value.

## Relationship to session lifecycle skills

The session lifecycle skills preserve context across time. The PER arc preserves project motion across cycles. They overlap, but they answer different questions.

`/session-save` keeps trajectory warm during ongoing work. A PER dashboard can give it a compact source of truth: current arc, live tensions, next good move, and parked threads.

`/session-rest` prepares a next session while the user is still a light bridge. The dashboard can reduce reconstruction cost by making the current project arc visible before triage, leaving the user to correct situated judgments rather than rebuild observable state.

`/session-close` prepares for a colder restart. The dashboard is not enough by itself, but it can anchor the close: what was the project arc, what evidence had accumulated, what divergences mattered, and what should not be forgotten tomorrow.

`/session-load` restores momentum. The dashboard can give the loader a concise instrument reading before it asks the user to confirm priorities. That keeps the first collaboration focused on situated questions instead of facts the repo could have preserved.

This also explains why full save/restore can feel less central with stronger models. Heavyweight reconstruction is less necessary when the model can recover more from repo context and conversation. But situated continuity still matters: what has momentum, what feels tasteful, what the user considers live, and what kind of next move would preserve flow.

## Minimal candidate dashboard shape

The shape should be small enough to maintain during real work. A candidate dashboard could be one markdown file with these sections. Use only the sections that are carrying signal; empty sections should be omitted rather than maintained ceremonially.

### Arc

The current project trajectory in a few sentences. Not the whole history — the direction the work is moving now.

### Current phase / position

Where the work is in relation to PER: preparing a hypothesis, executing a bounded move, reviewing a result, or between cycles carrying forward what was learned.

### Hypothesis / current move

The active prediction or intended move. This is generative material: what the agent currently thinks is worth trying next, specific enough that reality can correct it.

### Evidence

Observable facts gathered so far: files inspected, commands run, test results, review findings, or concrete behavior seen in the workspace.

### Divergences

Where reality did not match the working model. These are calibration signals, not blame. Some divergences change the next move; others simply improve the map.

### Live tensions

Judgment-bearing questions still shaping the work. These should be written as tensions, not tasks, especially when they depend on user priorities, taste, timing, or momentum.

### Next good move

The next bounded action that preserves momentum. This is not a backlog. It is the move that looks good from the current instrument reading.

### Parked threads

Threads intentionally kept visible but not active. These are neither forgotten nor scheduled; they are material that may matter when the arc shifts.

### Cycle log

A compact record of completed cycles: date or rough sequence, prepare hypothesis, execute result, review calibration, and any arc update that followed.

## Keeping the dashboard current

The dashboard is a rolling calibration artifact, not an accumulating narrative. Its live sections should read like current instruments, not a transcript of prior flights.

Update **Current phase / position** and **Next good move** at natural boundaries: after review, after merge, before starting a new cycle, or when a divergence changes the working model. Completed cycles should be compressed once they stop shaping the next move. Keep the cycle log as evidence of calibration, not as a place to preserve every detail.

The useful question when editing the dashboard is: what does the next agent need to know to move with the current project motion? If a detail no longer changes the next move, it can be summarized or dropped.

## Non-goals

The dashboard is not a task tracker. A task tracker optimizes for inventory and assignment. The PER arc optimizes for continuity of understanding.

It is not full session reconstruction. It should not preserve every conversation turn, decision path, or intermediate thought. If a future agent needs to replay the session to understand the project, the dashboard failed by preserving too much of the wrong thing and too little of the arc.

It is not a mandatory ritual. Some work does not need it. Some cycles are too small to justify updating it. The dashboard earns its keep only when it reduces reconstruction cost or improves calibration across cycles.

It is not a gatekeeping protocol. Nothing should wait for the dashboard because the dashboard demands completion. The dashboard is useful when it helps the agent read the instruments before moving.

## Criteria for promotion into a `/per-arc` skill

Promote this concept into a skill only if repeated use shows that agents need an explicit workflow, not just a concept. Until then, this is a reference note, not an invoked workflow.

Good promotion signals:

- multiple projects independently recreate the same dashboard shape
- agents repeatedly lose arc continuity even when `/per-cycle` is used correctly
- session lifecycle handoffs would become simpler if they could read a stable PER dashboard
- users want to preserve project motion without invoking a heavier transition protocol
- the distinction between hypothesis, evidence, divergence, and situated judgment proves valuable in practice

Bad promotion signals:

- the skill would mainly enforce ritual
- the dashboard becomes a backlog in disguise
- the concept works better as a short reference note than as an executable workflow
- maintaining it costs more momentum than it preserves

If promoted, `/per-arc` should stay light. Its job would be to help an agent update and read the project instrument panel at natural boundaries, not to add another approval gate around PER.
