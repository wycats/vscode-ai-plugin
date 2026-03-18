# Diagnostic Questioning

Sequential questions designed to maximally reduce uncertainty about the user's priorities, ordered so that each answer informs the next.

The agent has done its homework — it has reviewed the material and formed a preliminary understanding. The questions aren't exploratory. They target the specific places where the agent's understanding might diverge from the user's. High-variance threads (where the agent genuinely can't predict the user's intent) are asked about first, because their answers carry the most information and often resolve lower-variance threads implicitly.

The sequence matters. Early questions establish the frame — the broad shape of what the user cares about. Later questions probe within that frame. The agent doesn't ask about details before understanding the big picture, and doesn't ask about the big picture after the details have already revealed it.

## The key property

Each question is designed to be easy to answer but hard to predict. "Do you want to continue the refactor?" is easy to predict (probably yes) and wastes the collaboration budget. "The refactor touched the request builder but stopped before the response handler — was that a natural boundary or did you run out of time?" is easy to answer but reveals something the agent couldn't know.

## Relationship to pregnant tensions

High-variance threads often arise from pregnant tensions — situations where competing concerns create a real decision point. These are the most important threads to ask about, because they represent genuine choices the user needs to make. The diagnostic sequence should prioritize pregnant tensions over simple information gaps.

## When this stance applies

- Triaging dangling threads during a handoff
- Understanding the user's priorities before starting work
- Any situation where the agent needs to elicit the user's intent and the intent isn't obvious from the observable context

## What this stance is not

- A survey (presenting all questions at once)
- A checklist (confirming known items)
- Open-ended exploration (the agent has a specific uncertainty to resolve)

## Composition notes

Composes naturally with **Socratic elicitation** (diagnostic questioning identifies _what_ to ask; Socratic elicitation shapes _how_ to ask it). Composes with **interpretive synthesis** (the coherent account of the session reveals where the high-variance threads are). The handoff skill uses diagnostic questioning to triage dangling threads.
