---
name: per-cycle
description: "Use when running a prepare-execute-review (PER) cycle, doing a PER workflow, or coordinating work through `prepare`, `execute`, and `review` subagents with explicit gates."
---

# PER Cycle

Use this skill to run a structured prepare-execute-review workflow for non-trivial work.

## What this skill does

This skill turns a moderately complex task into three gated phases:

1. `prepare` audits the request and codebase for readiness.
2. `execute` implements only the approved plan.
3. `review` verifies the result and reports issues or follow-ups.

Use this when you want stronger planning discipline, context isolation, and explicit handoff points between phases.

## When to use

Use this skill when the task:

- changes behavior across multiple files or modules
- has moderate risk or ambiguity
- benefits from a plan before implementation
- should be reviewed independently after coding
- needs subagent isolation to keep the main chat focused

Do not use this skill for:

- trivial one-line fixes
- purely exploratory research
- quick questions with no code changes
- tasks where the overhead of three phases exceeds the work

## Phase 1: Prepare

Use the `prepare` subagent to audit the task before any implementation.

### Prepare inputs

Provide:

- the user’s goal
- relevant files or directories by path
- constraints and non-goals
- expected outputs or acceptance criteria
- any repo-specific instructions that must be followed

### Prepare output

Require a readiness report with:

- ✅ verified assumptions
- ⚠️ corrections needed
- 🔴 blockers
- 📋 implementation order
- test or validation expectations

### Prepare gate

Do not start execution until:

- blockers are resolved or explicitly accepted
- the implementation order is concrete
- scope and constraints are clear enough to serialize into an execution prompt

### Prepare validation

Before trusting the `prepare` output, the coordinating agent should verify it.

- re-read the files or directories named in the readiness report when the claims are important to execution
- check that referenced paths actually exist
- confirm that any claimed assumptions are grounded in files, search results, or command output
- reject prepare output that contains unsupported assertions, invented files, or vague implementation steps
- if validation fails, rerun `prepare` with the correction request instead of moving forward

## Phase 2: Execute

Use the `execute` subagent to implement the approved plan.

### Execute rules

The `execute` prompt should:

- reference the approved prepare report
- instruct the agent to follow it exactly
- forbid scope creep unless a blocker forces escalation
- require code, tests, and validation for the requested change
- prefer editing files directly instead of narrating hypothetical changes

### Execute output

Expect:

- completed code changes
- tests or validation steps performed
- any remaining risks or caveats
- a concise change summary

### Execute gate

Do not move to review until:

- the planned implementation is complete
- relevant validation has run, if feasible
- any deviations from the prepare report are documented

### Execute validation

Before handing work to `review`, the coordinating agent should verify the execution report.

- inspect changed files directly instead of trusting summaries alone
- compare the reported edits against the approved prepare plan
- confirm that reported tests or checks were actually run when command output is available
- treat any mismatch between the execution report and the workspace state as plan drift that must be resolved first
- require a corrected execution summary when the report overclaims what was changed or validated

## Phase 3: Review

Use the `review` subagent to verify the executed work.

When the user wants a collaborative, chunked review instead of a one-shot review summary, use the `walkthrough` skill to conduct the review phase interactively.

### Review focus

Ask the reviewer to check:

- correctness against the original request
- adherence to the prepare report
- missing edge cases
- regressions or risky changes
- test coverage and validation quality
- follow-up fixes or suggestions

If using `walkthrough`, do this progressively across chunks and preserve continuity from earlier discussion.

### Review output

Require a review report with:

- ✅ correct implementations
- ⚠️ issues found
- 💡 suggestions
- a merge/ship readiness judgment when relevant

### Review validation

Before closing the PER cycle, the coordinating agent should verify the review report.

- spot check the cited files, symbols, and line references
- confirm that blocking findings correspond to real code or document issues
- reject reviews that make claims without evidence from the workspace
- if the review is too vague or unsupported, rerun `review` with stricter instructions to cite concrete evidence

If using `walkthrough`, verify each chunk before moving on and let user feedback influence the next chunk.

## Branching logic

### If prepare finds blockers

- stop before implementation
- resolve the blocker in the main chat or by a targeted follow-up task
- rerun prepare if the blocker changes scope materially

### If execute discovers plan drift

- stop and report the mismatch
- either amend the plan in the main chat or rerun `prepare`
- do not silently widen scope

### If review finds issues

- treat review findings as a new bounded execution task
- rerun `execute` for fixes
- rerun `review` for confirmation when the fix is substantial

### If the user wants joint code reading

- switch the review phase into the `walkthrough` skill
- review one conceptual chunk at a time
- pause after each chunk for discussion and steering
- keep checking execution against the prepare report while moving through the code

### If validation finds hallucinations

- stop the phase transition immediately
- identify which claims were unsupported
- rerun the same phase with an instruction to ground every claim in files, search results, or terminal output
- escalate to the main chat if repeated retries still produce unverified claims

## Prompt patterns

### Prepare prompt pattern

Ask `prepare` to:

- audit a specific task
- inspect named files or directories
- produce a readiness report with assumptions, blockers, implementation order, and validation needs
- avoid implementation

### Execute prompt pattern

Ask `execute` to:

- implement the approved prepare report
- keep to the defined scope
- run relevant validation
- summarize changes and note any deviations

### Review prompt pattern

Ask `review` to:

- inspect the resulting changes
- compare them to the request and prepare report
- list issues and improvement suggestions
- state whether the work appears complete

If the user wants an interactive read-along, invoke `walkthrough` instead of asking `review` for a single final report.

## Completion criteria

A PER cycle is complete when:

- `prepare` produced an actionable plan with no unresolved blockers
- `execute` completed the scoped implementation
- `review` found no blocking issues, or identified follow-ups are explicitly accepted
- the coordinating agent has validated each phase output against the workspace state

## Example prompts

- Run a PER cycle for adding schema validation to the manifest loader.
- Use PER to refactor the CLI command dispatch without changing behavior.
- Prepare, execute, and review a migration from ad hoc parsing to typed config models.

## Notes

- Prefer passing file paths and reports by reference instead of pasting large file contents.
- Use PER for clarity and auditability, not as mandatory ceremony for tiny tasks.
- Keep each phase’s output structured so the next phase can consume it directly.
- Favor direct verification over trust: re-reading files is acceptable when it reduces hallucination risk.
