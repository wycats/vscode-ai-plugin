# Quality Principles

These principles govern how skills, agents, and prompts in this plugin are written. They are grounded in how language activates reasoning in language models and how document structure shapes agent attention.

They are not style guidelines. They are first-principles observations about how the model's probability engine works. If a skill deviates from these principles, it should be for one of two reasons:

1. The task genuinely requires compliance mode — no tensions to resolve, no judgment needed, just exact execution. This is rare.
2. The task is deterministic and should be code, not a skill. Natural language is the wrong tool for mechanical processes.

If neither reason applies and a skill still deviates, that's a signal something is wrong with the skill.

## Structure matches execution shape

The document's visual structure should mirror the workflow's actual shape. If the workflow is a loop, the document should look like a loop. If one phase is more important than the others, it should be the longest and most prominent section.

An agent should be able to understand the workflow shape by reading only the section headers.

## Front-load the mental model

The first few lines of a skill should describe the *shape* of the work, not the first step. The agent needs to know what kind of process this is before it starts executing. A sentence like "this skill has three phases — the second is the core" reframes everything that follows.

## The critical path is visually dominant

If there's one thing the agent must not skip, make it the longest section, position it where attention is highest, and state its importance explicitly. Structural prominence is preattentive — the agent registers it before reasoning about content.

## Tensions over rules

A well-stated tension is more precise than a rule because it adapts to context. Rules are equally strict in all situations, which means they're either too tight (blocking valid cases) or too loose (permitting invalid ones). Tensions encode the relationship between competing concerns and trust the agent to resolve them with judgment.

When writing about what can go wrong, name the underlying tension rather than listing prohibited behaviors. "Source truth vs. session memory" covers more ground and produces better reasoning than three separate "don't" statements.

## Stance emerges from honest description

The way a skill is written activates a region of the model's training distribution. Language that describes tensions honestly, explains why things matter, and trusts the reader to apply principles — this naturally sits in the distribution neighborhood of good technical writing, mentorship, and architectural guidance.

You do not need to engineer the stance deliberately. Understand the tensions, describe them clearly, and the stance takes care of itself. Trying to sound authoritative or adding defensive rules pushes toward worse regions of the distribution (compliance documentation, corrective feedback on poor work).

## Separate execution path from reference material

During execution, the agent needs to know what to do next. Templates, triage tables, and edge case details are reference material — useful when a specific step is reached, but diluting when interleaved with the execution path.

If you could imagine looking something up in a table of contents, it's reference material. Put it after the process.

## Explicit loop constructs for iteration

Agents follow sequences well but infer loops poorly. If the workflow requires iteration, show the loop structure as pseudocode:

```
repeat:
  1. Do X
  2. Do Y
  3. If condition → go to 1
  4. If done → exit
```

Prose instructions to "repeat from step N" are easy to skim past. Pseudocode blocks are read as control flow.

## One concern per section

When a step tries to do multiple things (spawn a subagent, triage questions, surface decisions to the user, ask a meta-question), the agent has to hold all of them in working memory at once. Split them into separate sub-steps so each one can be executed independently.

## Language is the precision tool

Natural language is uniquely good at encoding conditional precision — statements that become more precise as context narrows. A well-written tension is vague in the abstract but resolves sharply when the agent knows the specific situation. This is not a weakness of language. It is a feature that formal specifications lack.

Use language to describe constraints in a way that captures the tensions between them. Formal specification language pushes the model toward exhaustive enumeration and mechanical verification, which is the opposite of contextual judgment.

## Negative instructions cluster with poor work

Dense blocks of "don't do X" instructions are correlated in the training data with corrective feedback, low-trust delegation, and defensive documentation. The model has learned that this pattern surrounds contexts where expected output quality is low.

Reframe negative instructions as positive principles or named tensions. Keep explicit warnings only for genuinely non-obvious mechanical facts (e.g., "session memory is cleared between conversations" or "strikethrough text is still read and acted on by agents").

## Write for the agent's attention curve

Agents read skills front-to-back with highest attention at the beginning. This means:

- Mental model first
- Critical path early
- Reference material last
- The most important "do not skip" instruction at the transition point where the agent is most likely to take a shortcut
