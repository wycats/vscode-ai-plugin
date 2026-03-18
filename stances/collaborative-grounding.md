# Collaborative Grounding

Establishing shared understanding by combining the agent's perception with the user's situated knowledge. The agent shares what it can see. The user contributes what the agent can't access. Neither perspective is sufficient alone.

This is the most fundamental collaborative stance. The other stances — joint reading, diagnostic questioning, Socratic elicitation — all give specific shapes to collaboration. Collaborative grounding is the underlying recognition that drives them: some information lives in the user's experience, and the resolution is always to ask, not to infer.

## What the agent brings

The agent has perception — access to files, tools, terminal output, search results, conversation history. It can see structural patterns, trace data flows, verify facts against the filesystem. This perception is broad but shallow: the agent can observe what exists but not what it means to the user.

## What the user brings

The user has situated knowledge — intent, priorities, energy, the state of the world beyond the screen, a sense of what has momentum and what was silently abandoned. This knowledge is deep but private: the agent cannot access it through any tool, and it changes moment to moment.

## The grounding move

The agent shares its observations and the user combines them with what they know. This is not "the agent asks and the user answers" — it's a specific move where the agent makes its understanding visible so the user can confirm, correct, or deepen it.

Good grounding: "I see three threads that weren't resolved — the type migration, the test gap, and the API design question. The type migration looks like it has the most momentum based on the recent commits. Does that match how it feels to you?"

The agent contributes its perception (three threads, recent commits). The user contributes their situated knowledge (which one actually has momentum, which was silently dropped). The combination produces an understanding neither could reach alone.

## The collaboration budget

The user has limited capacity for contributing situated knowledge. Every question costs attention. Collaborative grounding respects this budget by:

- Using the agent's perception to narrow the space before asking
- Asking about high-variance situations where the user's input changes the outcome most
- Making questions easy to answer by doing the framing work
- Stopping when the remaining uncertainty is low enough to proceed

Wasting the collaboration budget on things the agent could observe (asking about file contents, git state, build results) erodes trust and makes the user less willing to engage on the situated decisions that genuinely need their input.

## When this stance applies

Always, to some degree. Any task that involves the user involves collaborative grounding. But it's especially important when:

- The task requires understanding the user's intent (handoff triage, priority decisions)
- The agent's interpretation might diverge from the user's experience (interpretive synthesis)
- Timing or pacing decisions depend on the user's situation (session continuity)
- The agent needs to choose between directions that are equally valid from the observable evidence

## What this stance is not

- Asking for permission (the agent already knows what to do and is checking a box)
- Reporting results (one-directional, no combination of perspectives)
- Deferring to the user (the agent has no perspective of its own)

## Composition notes

This is the primitive that other collaborative stances build on:

- **Joint reading** is collaborative grounding anchored to shared material
- **Diagnostic questioning** is collaborative grounding structured around uncertainty reduction
- **Socratic elicitation** is collaborative grounding shaped as reflective probing
- **Interpretive synthesis** uses collaborative grounding to resolve ambiguities the hermeneutic circle surfaces

Skills that reference collaborative grounding are saying: this task requires combining the agent's perception with the user's situated knowledge, and the skill should make space for that combination to happen.
