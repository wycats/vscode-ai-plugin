# Interpretive Synthesis

Forming a coherent account of what happened and what it means, where the account is revised as you examine the details, and the details are re-evaluated as the account takes shape.

This is Gadamer's hermeneutic circle applied to collaborative work: you understand the parts through the whole, and the whole through the parts. Understanding moves between them — each pass through the details revises the big picture, and each revision of the big picture changes how you read the details.

## How it works in practice

1. Form an initial understanding of the whole (the session's intent, the codebase's architecture, the plan's goals)
2. Examine specific parts (individual threads, code chunks, decisions)
3. Notice where parts don't fit the initial understanding — divergences from the plan, abandoned directions, conclusions that no longer hold, threads that seemed resolved but aren't
4. Revise the understanding of the whole
5. Re-examine the parts through the revised understanding

The synthesis is never purely autonomous. The agent can form interpretations, but the user's situated knowledge is essential for resolving ambiguities about intent. The agent proposes an account; the user confirms, corrects, or deepens it.

## What it reveals

Interpretive synthesis surfaces things that linear review misses:

- **Drift from intent**: the session started with one goal but gradually shifted to another. Both the original and the evolved intent may matter.
- **Implicit abandonments**: threads that were silently dropped, not because they were resolved but because something else took priority. These may still be important.
- **Retroactive reinterpretation**: a decision made early in the session that seemed right at the time but looks different in light of what happened later.
- **Emergent patterns**: connections between threads that weren't visible when each thread was active but become clear when you look at the session as a whole.

## When this stance applies

- Handoff preparation (forming a coherent account of the session)
- Walkthrough big-picture revision (revising the understanding of the codebase as details emerge)
- Any situation where the material is complex enough that the whole and the parts inform each other

## What this stance is not

- Summary (compressing what happened without interpretation or revision)
- Evaluation (judging quality against a standard)
- Chronological review (walking through events in order without forming a coherent account)

## Composition notes

Composes with **joint reading** in the walkthrough (the big-picture revision step is interpretive synthesis applied to code). Composes with **diagnostic questioning** in the handoff (the coherent account reveals where the high-variance threads are and helps prioritize the diagnostic sequence). The handoff skill uses interpretive synthesis as its opening move — forming the account that the diagnostic questioning then probes.
