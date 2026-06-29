---
name: thread-coordinator
description: "Use when coordinating multiple live Codex threads, maintaining a coordination heartbeat, routing work across implementation threads, inspecting cross-thread ownership or gates, or keeping a coordinated effort moving through PR, review, evidence, and human-action boundaries."
---

# Thread Coordinator

Coordinate live Codex threads by rebuilding status from the files named by the heartbeat, then inspecting live thread and PR state before routing work. The heartbeat carries pointers. The coordination brief says how this effort works. The active plan says what is true now.

The core tension is **contract vs. scratchpad**. Coordination needs durable rules that every check can reuse, and it also needs a fast-changing surface for current owner, gate, PR state, evidence, and next action. Keep those surfaces distinct so the heartbeat can stay small while the live state remains easy to revise.

## Critical Path

Start every check from the heartbeat-named `COORDINATION_BRIEF.md` and `ACTIVE_PLAN.md`. Use prior heartbeat text, previous delegations, and remembered PR state as context only. Current status comes from the named coordination files plus live thread and PR surfaces.

## Coordination Surfaces

Each coordination effort should name these files explicitly in the heartbeat or user request:

- `COORDINATION_BRIEF.md`: slow-moving coordination contract for this effort.
- `ACTIVE_PLAN.md`: active tactical scratchpad for this effort.

Read the named files before forming status. If the request is manual and names only a coordination folder, use `COORDINATION_BRIEF.md` and `ACTIVE_PLAN.md` at that folder's root. If neither the files nor the folder are named, ask for the coordination folder before coordinating.

Use the brief for:

- ultimate target and shareable bar;
- watched thread IDs and routing rules;
- canonical docs and evidence surfaces;
- notification policy;
- liveness and forward-motion rule;
- language or framing expectations.

Use the active plan for:

- current owner and boundary;
- current gate;
- latest PR, review, check, or evidence state;
- concrete next action;
- user-action items.

When the coordination contract changes, update the brief. When the tactical boundary changes, update the active plan.

## Coordination Loop

Run the same loop on each heartbeat or manual coordination check:

```
repeat:
  1. Read the coordination brief.
  2. Read the active plan.
  3. Inspect watched threads and live PR/check/review state.
  4. Identify owner, boundary, readiness, next gate, and user-action items.
  5. Route one concrete next step if the gate is technical or unassigned.
  6. Notify the coordination thread only when user attention is useful.
  7. Update the brief or active plan when the corresponding state changed.
```

Treat thread roles as live. Infer ownership from the latest thread state, active work, delegations, blocked/completed state, open pull requests, and the coordination files. The active plan expresses current priority intent; live threads and PR surfaces supply current operational facts.

## Gates

Classify the coordination boundary before deciding whether to route work:

- **Human gate**: useful next steps require merge, approval, review decision, credential refresh, deployment permission, org/account state, or another external action. Park the other threads and state the waiting condition.
- **Technical gate**: one thread can keep reducing uncertainty, implementing, validating, or recording evidence. Route one concrete next step to that owner.
- **Unassigned gate**: the active plan has a next step that no watched thread currently owns. Assign it to the thread whose routing boundary matches the work.

Forward motion means choosing the current owner and next action when work can move. Keep support threads parked unless they own useful work.

## PR and Review Checks

For each open PR owned by a watched thread, inspect current checks, mergeability, review state, and unresolved comments.

Route PR states that need owner action to the owning thread with the PR link, concrete status, and next action.

Notify the coordination thread when a PR appears merge-ready, when post-merge release or install pickup is ready, or when a PR decision changes the active evidence gate.

## Output Shape

Keep coordination status compact unless the state changed substantially:

```text
Coordination status:
- Owner: ...
- Boundary: ...
- Readiness: ...
- Next gate: ...
- User action: ...

Routed:
- ...
```

For a quiet heartbeat, one status sentence is enough if the watched threads are active on the right next step and no user attention is useful.

When sending a delegation to another thread, include the owner, boundary, evidence or PR link, and the next requested action. Keep the delegation scoped to what that thread owns.
