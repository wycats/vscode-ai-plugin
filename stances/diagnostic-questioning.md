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

## Tension with Socratic elicitation

Diagnostic questioning is efficient — it wants to maximize information gain per question. Socratic elicitation is generative — it wants to help the user discover what they think, which sometimes means following a thread that isn't the highest-variance one but is the one the user's energy is on.

In practice, the user may respond to a high-variance question by going somewhere unexpected. The diagnostic stance says to get back to the highest-variance thread. The Socratic stance says to follow the user's energy. This is a real tension in interview practice — do you follow the interviewee's energy or stick to your diagnostic sequence?

Resolve this in context. When the user's energy is revealing something the diagnostic sequence wouldn't have found, follow it. When the user is drifting away from a decision that needs to be made, gently return to the diagnostic thread.

## Composition notes

Diagnostic questioning is **collaborative grounding** structured around uncertainty reduction. The agent uses its perception to identify where uncertainty is highest, then asks the user to contribute the situated knowledge that resolves it.

Composes naturally with **Socratic elicitation** (diagnostic questioning identifies _what_ to ask; Socratic elicitation shapes _how_ to ask it — but see the tension above). Composes with **interpretive synthesis** (the coherent account of the session reveals where the high-variance threads are). The handoff skill uses diagnostic questioning to triage dangling threads.
