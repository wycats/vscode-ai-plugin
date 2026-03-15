# Quality Principles

These principles govern how skills, agents, and prompts in this plugin are written. They are the practical application of the distributional mechanics described in [FOUNDATIONS.md](FOUNDATIONS.md) — how stances create gravitational wells in the probability landscape, how wells compose through reinforcement and orthogonality, and how information flows between agent and user.

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

## Collaboration over inference for situated decisions

Some tensions involve information that only the user has — timing, priorities, energy, the state of the world beyond the screen. These are not gaps in the agent's knowledge that better tools could close. They are structurally situated in the user's experience.

When a skill involves situated tensions, the resolution is always collaboration: the agent shares what it observes (context usage, progress, complexity of remaining work) and asks the user to combine that with what they know. The form matters — a question that says "here's what I see, what does that mean for you?" is more useful than "should we continue?"

## The information landscape

Information the agent needs falls into four categories. Knowing which category a piece of information belongs to determines how the agent should act.

**Agent-only perception** — information the agent can access through tools that the user doesn't typically see. Terminal output details, log contents, file system structure beyond the visible explorer. The agent should use tools to get this information directly. Gaps here are subtle — the user doesn't know what the agent can't see, and the agent doesn't know what it's missing. Identifying these gaps requires an architect's eye.

**Shared perception** — information both the agent and user can see, using the same concepts and design language. Diagnostics in the Problems panel, the file open in the editor, visible errors. This is the highest-value category because it aligns the agent's understanding with the user's experience. When the agent references something from shared perception, the user can immediately confirm or correct. Tools like `get_errors` and the integrated browser live here. Gaps in shared perception feel surprising to the user — they see something "obvious" that the agent is blind to.

**Unshared environmental** — information that exists in the environment but the agent can't access yet. This is the most dangerous category. The agent doesn't know it's blind, so it defaults to inference from patterns rather than asking. The information is objective and knowable, but without the right tool it silently becomes a guess. When a skill depends on information that might be unshared, it should explicitly direct the agent to ask rather than infer. As tools improve, unshared information moves to perception — but until it does, treating it as situated (ask the user) is safer than letting it become inferential (guess from patterns).

**Inherently situated** — information that lives in the user's embodied experience. Priorities, energy, timing, flow state, what's happening around them. No tool will ever capture this. The resolution is always collaboration, and it's always contextual.

### Diagnosing skill failures with the information landscape

When a skill isn't working well:

- Is the agent inferring something it should be observing? → tool gap, or the agent isn't using available tools
- Is the agent inferring something it should be asking about? → collaboration gap in the skill
- Is the agent asking about something it could observe? → wasting the collaboration budget
- Is the user frustrated by questions? → unshared environmental information needs to become observable

### The collaboration budget

The user has limited capacity for answering questions about things the agent "should" be able to see. Every question about an unshared environmental fact feels like a tool failure, even when asking is the right thing to do. This means the collaboration budget should be reserved for inherently situated decisions — the things that genuinely require the user's judgment. Moving unshared environmental information into perception (through better tools) is not just a capability improvement. It preserves the collaboration budget for where it matters most.
