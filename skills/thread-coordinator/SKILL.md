---
name: thread-coordinator
description: "Use when coordinating multiple live Codex threads, maintaining a coordination heartbeat, routing work across implementation threads, inspecting cross-thread ownership or gates, or keeping a coordinated effort moving through PR, review, evidence, and human-action boundaries."
---

# Thread Coordinator

Coordinate live Codex threads by rebuilding status from the files named by the heartbeat, then inspecting live thread and PR state before routing work. The heartbeat carries pointers. The coordination brief says how this effort works. The active plan says what is true now. Direct user involvement is an assisted coordination boundary: when the work is ready for a human decision or action, the coordinator brings that boundary into the conversation with the evidence, scope, and help needed to resolve it.

The core tension is **contract vs. scratchpad vs. consent**. Coordination needs durable rules that every check can reuse, a fast-changing surface for current owner, gate, PR state, evidence, and next action, and a reliable way to turn ready human gates into explicit interaction. Keep those surfaces distinct so the heartbeat stays small, the live state remains easy to revise, and approval debt becomes visible when it is ready to move.

## Critical Path

Start every check from the heartbeat-named `COORDINATION_BRIEF.md` and `ACTIVE_PLAN.md`. Use prior heartbeat text, previous delegations, and remembered PR state as context only. Current status comes from the named coordination files plus live thread and PR surfaces.

On setup and after compaction, audit the active plan for existing human gates before routing technical work. Earlier approval debt should become part of the current coordination surface instead of being inherited as quiet scratchpad text.

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
- Human Action Queue;

The Human Action Queue is bounded current state, not a journal. Keep it near the top of `ACTIVE_PLAN.md`, before detailed thread status, as a compact table:

| Priority | Your action | Why ready | What it blocks | State |
| --- | --- | --- | --- | --- |
| 1 | Review PR `#24`; I can summarize the diff or open specific files | Checks and agent reviews are complete | Merge and release pickup | Review in progress |

The queue contains user-owned decisions and actions. Each row names the current action, readiness evidence, blocking effect, assistance available, and interaction state. Priority expresses critical-path order. Keep rows aligned with the current boundary; retain a satisfied row while its verification matters to the current update.

When the coordination contract changes, update the brief. When the tactical boundary changes, update the active plan.

## Coordination Loop

Run the same loop on each heartbeat or manual coordination check:

```text
repeat:
  1. Read the coordination brief.
  2. Read the active plan.
  3. Inspect watched threads and live PR/check/review state.
  4. Audit the Human Action Queue and any gate text in the active plan.
  5. Classify owner, boundary, readiness, next gate, and ready human actions.
  6. Surface, defer, or mark satisfied each ready human action.
  7. Route one concrete next step if the active gate is technical or unassigned.
  8. Notify the coordination thread only when user attention is useful.
  9. Update the brief or active plan when the corresponding state changed.
  10. Return the coordination status for this check.
```

Treat thread roles as live. Infer ownership from the latest thread state, active work, delegations, blocked/completed state, open pull requests, and the coordination files. The active plan expresses current priority intent; live threads and PR surfaces supply current operational facts.

## Human Action Protocol

Every coordination check audits all current human gates. A ready human gate belongs in one of three visible states: surfaced to the user, explicitly deferred with the reason and revisit condition, or already satisfied with the verification evidence.

Use queue states to preserve the live interaction boundary. `Review in progress` means the user's decision is still forming; the approval boundary begins after that review. `Awaiting approval` means the readiness evidence and exact scope have been presented and one direct approval question is active. Use `Ready for you`, `Deferred`, and `Satisfied` where those states describe the current interaction. Update the state from observed conversation and verification.

An approval gate is ready when the underlying technical work has reached the agreed bar and the next useful movement requires consent. Examples include merging a reviewed PR, installing a shared Exo binary, recording an Exo outcome, promoting or merging an RFC, or creating and pushing an annotated release tag. Present the readiness evidence, exact action, and scope, then ask one direct approval question. After approval, perform or route the action and verify the result.

A user-performed gate is ready when the coordinator can name the external action but cannot do it directly. Examples include credentials, account state, org settings, UI-only approvals, and private access changes. Give exact commands, links, or steps; remain active in the conversation while the user performs them; state the non-sensitive result the user should return; ask them to redact tokens, secret values, and sensitive identifiers; then verify the changed state before moving the gate.

Keep technical review and CI in the owning thread until they become readiness evidence for a user decision. When several human actions are ready, lead with the critical path action and keep the others visible in the queue. Help the user resolve one action at a time.

Heartbeat behavior:

- `NOTIFY` when a new or materially changed human gate is ready and has not been surfaced. Lead with the useful action.
- Repeat a surfaced gate only when its readiness, scope, or blocking effect has materially changed.
- `DONT_NOTIFY` is the right result when watched threads are moving correctly or no new user attention is useful.

## Gates

Classify the coordination boundary before deciding whether to route work:

- **Human gate**: useful next steps require merge, approval, review decision, credential refresh, deployment permission, org/account state, or another external action. Use the Human Action Protocol and keep other threads parked unless they own useful support work.
- **Technical gate**: one thread can keep reducing uncertainty, implementing, validating, or recording evidence. Route one concrete next step to that owner.
- **Unassigned gate**: the active plan has a next step that no watched thread currently owns. Assign it to the thread whose routing boundary matches the work.

Forward motion means choosing the current owner and next action when work can move. Keep support threads parked unless they own useful work.

## PR and Review Checks

For each open PR owned by a watched thread, inspect current checks, mergeability, review state, and unresolved comments.

Route PR states that need owner action to the owning thread with the PR link, concrete status, and next action.

Surface a merge approval when required reviews are complete, all required checks have passed, GitHub reports the PR as mergeable, and its merge state permits the merge. Notify the coordination thread when post-merge release or install pickup is ready or when a PR decision changes the active evidence gate.

## Output Shape

When user attention is useful, place the Human Action Queue before coordination prose. When asked whether the user needs to do something, lead with a direct answer and this table. Human gates should remain visible even when several are ready; priority identifies the one to resolve first.

```text
Human Action Queue
| Priority | Your action | Why ready | What it blocks | State |
| --- | --- | --- | --- | --- |
| 1 | ... | ... | ... | Awaiting approval |
| 2 | ... | ... | ... | Review in progress |

Coordination status: <owner, boundary, readiness, and next gate in one or two sentences>
Routed: <concrete delegation, when one was sent>
```

For a quiet heartbeat, one status sentence is enough if the watched threads are active on the right next step and no user attention is useful. When the user asks and the queue is empty, answer directly in one sentence.

When sending a delegation to another thread, include the owner, boundary, evidence or PR link, and the next requested action. Keep the delegation scoped to what that thread owns.

## Examples

Approval gates:

- "PR #24 is fully green, reviewed, and mergeable. Approve merging exact head `X`?"
- "Approve installing merged Exo commit `Y`?"
- "Approve running one bounded VBL health sequence with the installed binary?"
- "Approve recording the already-reviewed Exo outcome?"
- "Approve creating and pushing annotated tag `v0.4.6` at commit `Z`?"

User-performed gate:

- "The SSO refresh is ready for you. Open `<link>`, approve access for org `<org>`, then return a non-sensitive confirmation here. Redact tokens, secret values, and sensitive identifiers. I will re-check the repo permission and move the gate after it verifies."
