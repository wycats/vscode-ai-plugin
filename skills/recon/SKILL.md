---
name: recon
description: "Use when investigating unfamiliar code, tracing data flows, mapping architecture, or answering questions that require adaptive exploration — where the agent needs to follow leads, use tools interactively, and synthesize findings rather than just search for known terms."
---

# Recon

Investigate a codebase question that requires adaptive exploration.
Unlike simple search, recon follows leads, uses tools interactively,
and makes judgment calls about what's worth pursuing.

## When to use

Use this skill when the question:

- requires understanding how something works, not just where it lives
- spans multiple modules, files, or abstraction layers
- needs tool interaction beyond search (git history, project tooling, terminal)
- can't be reduced to a single search query
- benefits from the agent deciding its own exploration path

## When not to use

| Instead of recon... | Use... | Because... |
|---------------------|--------|------------|
| The answer comes from executing a known search plan | Explore | Each result won't change what you search next |
| Parallel search gathering during a recon investigation | Explore (as fan-out) | Explore is the gatherer; recon is the synthesizer |
| Parallel bounded investigation needing rich tools | Recon-worker (as fan-out) | Needs git/terminal/exo and judgment, but scoped |
| Making code changes | Execute or a PER cycle | Recon investigates; it doesn't implement |
| A quick "where is X?" | Explore | Don't bring a detective to a dictionary lookup |

## Process

### 1. Clarify the question

Before searching, make sure you understand:

- What specifically needs to be understood?
- What's the scope? (one module, a data flow, an entire subsystem?)
- What's the purpose? (planning work, debugging, learning, auditing?)

If the question is ambiguous, use `vscode_askQuestions` to narrow it.
If the caller is another agent, infer scope from context — but flag
assumptions in your report.

### 2. Plan the exploration

Break the question into concrete search dimensions:

- Entry points to find
- Dependencies to trace
- Patterns to look for
- History to check (if "why" or "when" matters)

This plan is internal — you don't need to present it. But having it
prevents aimless wandering.

### 3. Explore adaptively

This is where recon diverges from Explore. You don't just execute a
search plan — you adjust it based on what you find.

**Start broad, then follow leads:**

1. Use search tools (grep, semantic search, file listing) to orient.
2. When a result suggests a new direction, follow it.
3. When a direction dead-ends, note what you tried and pivot.
4. Use tools beyond search when they help:
   - `git log` / `git blame` for history and intent
   - `exo` commands for project state
   - Terminal commands for structural queries (`find`, `wc`, etc.)
   - Reading config files, READMEs, or docs that explain architecture

**When to fan out:**

Recon can dispatch subagents for parallel work. Choose the right
target based on what the sub-task needs:

| Sub-task needs... | Fan out to... | Because... |
|-------------------|---------------|------------|
| Search, file reads, symbol lookup | **Explore** | Fast, mechanically constrained, output is close to raw evidence |
| Git, terminal, exo, or judgment about what to pursue | **Recon-worker** | Needs tools and adaptive investigation within a bounded scope |
| Each result informs the next step | **Don't fan out** — do it yourself | Sequential investigation can't be parallelized |

**Explore fan-out** (the default for parallel gathering):

- Each search is expressible as a single prompt
- Results are independent (one doesn't inform the other)
- Treat results as leads, not conclusions — verify before building on them

**Recon-worker fan-out** (for parallel bounded investigation):

Use when the sub-question genuinely needs tools and judgment that
Explore can't provide. When dispatching a recon-worker:

1. **Brief it on the overall question** — not just "find X" but
   "we're investigating Y, and I need you to explore the Z angle"
2. **Require grounded findings** — same evidence discipline as this
   skill (step 6)
3. **Ask it to report surprises** — "what did you find that doesn't
   fit, or that I should know about even though I didn't ask?"

Recon-worker returns interpreted findings with sourcing, not raw
data. Treat its findings with more trust than Explore output (it
applied judgment) but verify claims that are critical to your
conclusions.

**Default to Explore.** Only use recon-worker when the sub-question
requires adaptive investigation with rich tools. Most fan-out is
mechanical gathering.

### 4. Track what you've tried

As you explore, maintain a mental ledger of:

- What you searched for and what you found
- What you searched for and *didn't* find (this is evidence too)
- Assumptions you're making
- Leads you chose not to follow and why

This ledger feeds directly into the grounding of your report. If you
can't say where a finding came from, it's not a finding — it's a guess.

### 5. Know when to stop

Recon is adaptive, but not unbounded. The right stopping point depends
on the purpose of the investigation.

**If the caller specified a purpose**, use it:

| Purpose | Stop when... |
|---------|-------------|
| Planning work | You can identify the files, boundaries, and risks involved |
| Debugging | You've traced the issue to a root cause or narrowed to candidates |
| Understanding | You can explain the mechanism to someone unfamiliar with it |
| Auditing | You've enumerated the relevant instances and their states |

**If the purpose is unclear**, the default test is: "Could the caller
make a decision based on what I've found?"

**Stop early and report back when:**

- Sources of truth conflict and you can't determine which is current
  (see step 6)
- The question requires design intent the code can't answer
- Investigation scope is expanding beyond the original question
- Two plausible interpretations lead to materially different answers

These are not failures — they're findings. Reporting "I can't
determine X because Y and Z disagree" is more valuable than guessing.

Use `vscode_askQuestions` when the caller is the user. When the caller
is another agent, return the ambiguity in your report so the agent can
escalate or refine the question.

### 6. Ground every finding

The primary failure mode of recon is confident-sounding claims with no
evidence trail. Every finding in your report must be traceable to a
source.

**Grounding by evidence type:**

| Evidence type | How to ground it |
|---------------|-----------------|
| Code structure | File path + line range or symbol name |
| History/intent | Commit hash + relevant message or diff |
| Tool output | Quote the relevant output |
| Configuration | File path + key/value |
| Negative result | What you searched for, where, and that it wasn't found |
| Inference | Explicitly mark as inference; state what it's based on |

Adapt this to the situation — the principle is: **make the evidence
inspectable**. A reader should be able to verify any claim by
following your citation.

**For non-trivial findings, state what would change your mind.** If
you claim "module X handles all auth token refresh," ask yourself:
what evidence would contradict this? If you can't articulate that,
your confidence is lower than you think. Include the falsification
condition when the finding matters to the caller's decision.

**Notice when sources disagree.** Committed code, dirty working tree
files, scratch pads, config files, documentation, and tool output may
all tell different stories. Do not silently pick a winner. When
sources conflict:

1. Surface the conflict explicitly in your report
2. State which source you're treating as current and why
3. If the conflict undermines further investigation, stop and report
   it (see step 5) — this is a legitimate finding, not a failure

The caller or user is better positioned to resolve source-of-truth
questions than you are. Your job is to notice the conflict and make
it visible.

**Treat subagent results with appropriate trust:**

- **Explore results are leads, not conclusions.** Explore is fast but
  shallow — it may return partial matches or miss context. Verify the
  ones that matter before building on them.
- **Recon-worker results are findings, but not gospel.** The worker
  applied judgment and grounding, so its output is more trustworthy
  than raw search results. But verify claims that are critical to
  your conclusions — the worker couldn't steer based on your full
  context.

### 7. Produce the report

Structure your output to separate what you know from what you infer.
Scale the report weight to the investigation complexity.

**For simple investigations** (one module, clear answer):

Deliver findings inline — a few paragraphs with citations. No
template needed.

**For complex investigations** (multi-module, architectural, or
ambiguous):

```markdown
## Recon Report: [Topic]

### Answer
[Direct answer to the question, 1-3 sentences]

### Findings
- [Finding with file:line or commit citation]
  - Falsifiable if: [what would contradict this]
- [Finding with evidence reference]

### Conflicts
- [Source A] says X; [Source B] says Y
  - Treating [A] as current because [reason]
  — OR: cannot determine — caller should clarify

### Negative results
- Searched for [X] in [scope] — not found
- [Pattern] does not appear in [area]

### Open questions
- [Thing the code can't answer — needs user or design input]
- [Source-of-truth ambiguity that blocked further investigation]
```

**When invoked by another agent**, always use the structured format —
the caller needs parseable findings, not prose.

**When invoked by the user directly**, use judgment about formality.
A conversational answer with inline citations may be better than a
full report for a focused question.

## Anti-patterns

- **Confident prose with no citations** — "The auth system works by..."
  → "Auth tokens are refreshed in `src/auth/refresh.ts:L42-L58`,
  called from `src/middleware/session.ts:L110`"

- **"No config exists"** — "Searched for
  `fooEnabled|foo_enabled|foo.enabled` across `src/**` and
  `config/**`, found none"

- **"History suggests..."** — "`git blame` on
  `src/auth/refresh.ts:L42` shows commit `a1b2c3d` changed the
  retry logic; intent is inferred from the commit message, not
  confirmed"

- **Silently resolving source conflicts** — "The handler is in
  `api.ts`" when `api.ts` on disk differs from the committed version
  → "The committed `api.ts` and the working tree version disagree on
  the handler location; the working tree adds a new route at L85
  that isn't committed yet"

- **Laundering Explore output as verified fact** — Explore returned
  three files matching a pattern; recon reports all three as
  confirmed call sites without reading them → Read the ones that
  matter before citing them as findings

- **Guessing at design intent** — "This was probably done for
  performance" → "I don't know why this indirection exists. The
  commit message (`a1b2c3d`) says 'refactor,' which doesn't explain
  the motivation. This is an open question."

- **Scope creep without signaling** — The question was "how does X
  work?" and you're now mapping the entire subsystem → Stop, report
  what you have, note that the scope expanded, and ask whether the
  caller wants the broader investigation

- **Stopping because you're tired, not because you're done** — If
  you've used a lot of context but haven't answered the question,
  say so. "I've exhausted my search approaches without a clear
  answer" is a valid finding. Trailing off is not.

## Self-verify

Before delivering your report:

- [ ] Does every finding cite evidence (file, commit, command output)?
- [ ] Are negative results recorded (what was searched, where, not found)?
- [ ] Are inferences explicitly marked and distinguished from observations?
- [ ] Are source-of-truth conflicts surfaced, not silently resolved?
- [ ] Did you stop because you answered the question (or hit a
      legitimate blocker), not because you ran out of patience?
- [ ] For Explore fan-out: did you verify key results before citing them?
- [ ] Could the caller act on or understand this without re-doing
      your investigation?

## Output

The deliverable depends on how recon was invoked:

| Invoked by | Deliverable |
|------------|-------------|
| Another agent | Structured recon report (always use the template) |
| The user, complex question | Structured recon report |
| The user, focused question | Inline findings with citations |

In all cases, the report must separate observations from inferences
and surface any conflicts or open questions that could affect
downstream decisions.
