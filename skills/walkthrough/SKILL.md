---
name: walkthrough
description: "Use when walking through code changes with the user one chunk at a time, pausing for discussion after each chunk, linking directly to code, and checking design alignment as the review progresses."
---

# Walkthrough

Use this skill for an interactive, chunk-by-chunk review of code, plans, or changes with the user.

## What this skill does

This skill turns review into a guided conversation instead of a one-shot summary.

The agent should:

1. break the material into meaningful conceptual chunks
2. present one chunk at a time with direct links to the code
3. explain what changed or what the code is doing
4. relate that chunk back to the broader plan, design, or intent
5. pause for user discussion before continuing
6. carry forward what matters from earlier chunks into later ones

This skill is meant for joint reading and sense-making, not just final judgment.

## When to use

Use this skill when the user wants to:

- read code together with the agent
- review changes in stages rather than all at once
- compare implementation against a plan or architecture
- steer the review through discussion and feedback
- build up a shared sense of priorities over time

Do not use this skill when:

- the user wants a quick one-shot summary
- the change is trivial enough that chunking adds no value
- there is no meaningful code or document to walk through

## Core principles

### 1. Chunk by concept, not by file size

Prefer chunks such as:

- entry points
- data flow boundaries
- refactor seams
- feature slices
- validation logic
- tests for a particular behavior

Avoid arbitrary chunks such as:

- first 200 lines
- one file at a time when the concept spans multiple files

### 2. Link directly to the code

Every chunk should include links to the relevant files or ranges so the user can read along.

### 3. Explain and evaluate

For each chunk, the agent should do both:

- explain what the code appears to do
- evaluate whether it aligns with the plan, design, or intended direction

### 4. Pause after every chunk

After each chunk, stop and invite discussion before continuing.

Do not continue through the whole walkthrough in one response unless the user explicitly asks for that.

### 5. Preserve continuity

Each new chunk should take prior discussion into account.

Carry forward:

- concerns raised by the user
- design priorities that emerged earlier
- unresolved questions
- confirmed interpretations that later chunks depend on

## Walkthrough process

### Step 1: Orient

Before starting the walkthrough:

- identify the broad plan, request, or design goal
- identify the code or documents to review
- decide on a conceptual chunking strategy
- tell the user what kind of chunks you plan to use

If useful, use `vscode_askQuestions` to clarify:

- whether to optimize for explanation, validation, or design review
- whether to focus on changed code only or surrounding context too
- whether to review implementation, tests, or both first

### Step 2: Present the next chunk

For each chunk, provide:

- a short chunk title
- the relevant code links
- what changed or what the code is doing
- why this chunk matters in the larger design
- whether it seems aligned with the plan so far
- any risks, questions, or mismatches visible in this chunk

### Step 3: Pause for feedback

End each chunk by explicitly pausing.

Invite the user to:

- discuss the chunk
- ask for deeper reading
- redirect the focus
- confirm whether to continue

Use `vscode_askQuestions` when a structured checkpoint would help maintain momentum.

### Step 4: Continue with continuity

When moving to the next chunk:

- briefly connect it to the previous chunk
- incorporate user feedback from the last pause
- keep the design-alignment thread active

## Recommended output shape per chunk

Use a structure like:

```markdown
## Chunk N: [Conceptual area]

### Code

- [relevant file or range]
- [relevant file or range]

### What this chunk is doing

[short explanation]

### Design alignment

[how this compares to the plan, architecture, or intended behavior]

### Things to notice

- [important detail]
- [risk, mismatch, or question]

### Pause

[explicit invitation for discussion before continuing]
```

## Design-alignment checks

During the walkthrough, keep checking:

- does the implementation follow the broad plan?
- does the code introduce a different abstraction than intended?
- are responsibilities placed in the right module or layer?
- do tests validate the intended behavior or only the current implementation?
- has the code drifted from the architectural story the team is trying to tell?

## Use of questions

Use `vscode_askQuestions` sparingly but intentionally.

Good moments include:

- choosing between walkthrough modes at the start
- checking whether to continue after an important chunk
- asking the user which ambiguity matters most next
- confirming whether to go deeper on a possible design mismatch

Prefer concise, directional questions over broad open-ended prompts.

## Relationship to PER

This skill is general-purpose.

It can be used inside PER when:

- reviewing execution results with the user
- validating implementation against the prepare report
- doing a collaborative design review before closing the cycle

## Completion criteria

A walkthrough is successful when:

- the code was reviewed in meaningful chunks
- each chunk linked directly to the code
- the user had a chance to steer between chunks
- the conversation maintained continuity across the review
- design alignment was checked throughout, not only at the end

## Example prompts

- Walk me through this refactor one chunk at a time.
- Review these changes with me in stages and pause after each section.
- Walk through the implementation and validate it against the plan as we go.
- Read the tests and implementation with me, chunk by chunk, and help me decide what matters.

## Notes

- Favor collaborative pacing over completeness in one response.
- Favor conceptual chunking over file-by-file narration.
- Favor linked code reading over abstract description.
- Treat user discussion as part of the review itself.
