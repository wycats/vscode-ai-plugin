---
name: per-cycle
description: "Use when running a prepare-execute-review (PER) cycle, doing a PER workflow, or coordinating work through `prepare`, `execute`, and `review` subagents with explicit gates."
---

# PER Cycle

A hypothesis → experiment → evaluation cycle for non-trivial work. Prepare forms predictions about what the codebase will encounter. Execute tests those predictions against reality. Review reads the distance between prediction and result.

The value of the cycle isn't in the gates between phases. It's in the cognitive separation: each phase thinks differently, and the handoff between them is where the interesting findings emerge. Prepare's predictions tell execute where to look. Execute's encounters with reality tell review what to evaluate. Review's calibration tells you whether to proceed, iterate, or revise the approach.

## When to use

The overhead of three phases is justified when the task has enough complexity or risk that you'd benefit from separating prediction from action from evaluation. Tasks that change behavior across multiple files, have ambiguity about the right approach, or benefit from independent verification of the result.

The overhead is not justified for trivial fixes, purely exploratory research, or tasks where the three phases would be slower than just doing the work. Use judgment.

## The arc

### Prepare: form the hypothesis

Dispatch the `prepare` subagent with the user's goal, relevant file paths, constraints, and what success looks like. Prepare will form predictions about what the codebase looks like, where the plan will encounter friction, and what the outcome should be.

What comes back is a pre-execution hypothesis: specific, falsifiable predictions organized by confidence and consequence. The most valuable predictions are the ones where being wrong would change the approach.

Before proceeding: check whether the high-consequence predictions are grounded in evidence (file paths that exist, symbols that are real, assumptions verified against the workspace). If a critical prediction is unverified or vague, send it back to prepare with what's missing. The hypothesis needs to be specific enough that execute can test it and review can evaluate it.

### Execute: run the experiment

Dispatch the `execute` subagent with the user's goal and prepare's hypothesis. Execute will advance the plan through the codebase, making bounded changes and reading how reality responds.

What comes back is changed files, executed commands, and an honest account of what happened — including where prepare's predictions were wrong and where reality surprised.

Before proceeding: spot-check the account against the workspace. Did the reported changes actually happen? Are the reported test results consistent with what the commands would produce? Execute maintains contact with reality, but the coordinating agent verifies that the reporting is accurate too.

### Review: evaluate the hypothesis

Dispatch the `review` subagent with prepare's predictions and execute's account. Review will compare prediction against outcome and judge what the divergences mean.

What comes back is a calibration report: what matched, what diverged, what the divergences mean, and whether the result warrants confidence to proceed.

When the user wants a collaborative review rather than a one-shot report, use the `walkthrough` skill to conduct the review phase interactively — examining the changes together, one chunk at a time.

## When phases loop

The cycle is not always linear. Reality creates branches.

**Prepare discovers something that blocks the plan.** The prediction is: "this won't work as described." Don't proceed to execute. Resolve the blocker in conversation with the user, then re-enter prepare with the revised understanding.

**Execute encounters something prepare didn't predict.** The mismatch between prediction and reality is itself a finding. Execute surfaces it rather than absorbing it. If the mismatch changes the approach, return to prepare. If it's local and manageable, execute continues and documents the divergence for review.

**Review finds a consequential problem.** The problem becomes a new bounded task. Re-enter execute with the specific fix, then review the fix. Don't re-run the entire cycle for a targeted correction.

**Review finds the hypothesis was wrong in an interesting way.** Prepare's model of the codebase was incorrect, and the incorrectness reveals something about the system that nobody anticipated. This is the most valuable outcome of the cycle — not a failure but a discovery. Surface it to the user.

## The coordinating agent's role

You — the agent using this skill — are not one of the three subagents. You're the scientist running the experiment. You design the dispatch prompts, verify the outputs, manage the transitions, and decide when to loop vs. proceed.

The tension to navigate: trust vs. verification. The subagents are generally reliable, but they operate in isolation. Each one can only see what you give it. Verify consequential claims against the workspace, but don't re-do each subagent's work. The verification is about catching the occasional fabrication or gap, not about distrust.

The other tension: ceremony vs. momentum. The cycle adds overhead. Use it when the overhead pays for itself in clarity and confidence. Skip phases when they'd be pure ceremony — if the task is clear enough that prepare would just confirm what everyone already knows, go straight to execute.
