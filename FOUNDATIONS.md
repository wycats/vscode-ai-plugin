# Foundations

This document describes the distributional mechanics behind the design principles in QUALITY.md. It explains _why_ those principles work, grounded in how language models process context and generate output.

These ideas are not speculative. They are grounded in the mechanics of transformer attention and probability distributions, informed by practical observation of what works and what fails in skill and agent design.

## The probability landscape

A language model generates text by computing, at each step, a probability distribution over possible next tokens. This distribution is shaped by everything that precedes it — the system instructions, the skill content, the conversation history, and the user's message.

Think of this distribution as a landscape with peaks and valleys. Context reshapes the landscape. Some contexts create broad, shallow valleys where many continuations are plausible (generic prose). Others create narrow, deep wells where very few continuations are likely (code in a strongly-typed language, mathematical proofs).

The depth and narrowness of the well determines the precision of the output. Deep, narrow wells produce precise, coherent output. Broad, shallow valleys produce generic output that drifts toward the statistical center of the training data — which, for prose, includes a lot of mediocre writing.

## Wells and stances

A _stance_ is a consistent set of relationships between the writer, the content, and the reader. In distributional terms, a stance creates a gravitational well — it pulls generation toward a coherent region of the probability landscape.

"The reader is a senior engineer" creates a well. "Every sentence must advance the argument" creates a well. "Explain the tradeoffs, not just the conclusion" creates a well. Each one reshapes the landscape, making certain continuations more likely and others less likely.

The practical question is always: what well does this instruction create, and does it reinforce or compete with the other wells in play?

## How stances compose

### Reinforcement

Stances reinforce when each one makes the others' wells deeper. "Write clearly" + "the reader is a senior engineer" + "explain tradeoffs" — each of these pulls toward the same region. The combined well is deeper and more specific than any individual stance. The output is more precise because the model has less room to drift.

### Interference

Stances interfere when they create competing wells — pulling the model toward different regions simultaneously. "Write clearly" + "avoid these 20 patterns" creates a ridge between the generation well (clear writing) and the evaluation well (pattern awareness). The model oscillates between generating and critiquing, producing stilted, self-conscious prose.

### Orthogonality

Stances compose most productively when they're _orthogonal_ — constraining different dimensions of the output rather than the same dimension from different angles.

"Princess Leia obituary" constrains content. "Linguistics paper style" constrains form. These are independent dimensions, so they compose cleanly — the model finds a small, specific, interesting region that satisfies both.

"Documentation" constrains both content and form. "Not-slop" also constrains form. They're parallel — both pulling on the same dimension — and they compete rather than compose.

The design principle: choose stances that constrain different dimensions. Content, form, audience, purpose, and voice are largely independent dimensions that compose well.

## Leverage

Some phrases activate deep wells with very few tokens. "Senior engineer" is high-leverage — two words that create a specific, deep well with many implicit assumptions about vocabulary, precision, and respect for the reader's time.

High leverage is efficient but rigid. The well is deep, which is good, but its shape is determined by the phrase's associations in the training data, which you don't fully control. "Senior engineer" carries assumptions about communication style, technical depth, and even personality that may not all be what you want.

Lower-leverage phrases (more words, more specific descriptions) give you more control over the well's shape but create shallower wells. And very verbose instructions risk activating the "verbose instructions" well — a meta-well that pulls toward the kind of output that follows verbose instructions, which is often mediocre.

The sweet spot is moderate leverage: specific enough to create a meaningful well, concise enough to avoid activating the verbosity well, and aligned enough that the well's implicit assumptions match your actual intent.

## Resolution

The model's probability distribution has a certain granularity — it can distinguish between regions down to some level of detail, but below that level, it's effectively noise.

When a well is wider than the model's resolution, the model navigates within it productively. When a well is narrower than the model's resolution, the model can't reliably stay in it. It hits the walls and behaves erratically — producing output that's _almost_ right but with strange artifacts.

The diagnostic: if output feels like it's trying to do the right thing but can't quite get there — right vocabulary, right structure, but slightly off in ways that are hard to pin down — the well may be too narrow. The fix is to relax one of the constraining stances, giving the model more room to maneuver.

This is different from interference (competing wells), which produces output that feels confused or inconsistent — like it's trying to do two different things.

## Coherence across sources

In practice, the probability landscape is shaped by multiple sources simultaneously: system instructions, skill content, agent definitions, conversation history, and the user's current message. Each source creates wells. The model operates in the intersection of all of them.

Coherence means all these wells reinforce. Incoherence means some of them compete.

The most dangerous incoherence is invisible — when the user's phrasing implicitly activates a well that competes with the skill's wells, and neither party realizes it. The user says "help me with this document" (broad, shallow "helpful assistant" well) while the skill has carefully constructed a precise stance. The broad well partially floods the precise one, and the output is mediocre in a way that's hard to diagnose.

This is why skills should make their stance visible. If the user understands what well the skill creates, they can phrase their requests in ways that reinforce it rather than compete with it.

## Generation vs. evaluation

Generation and evaluation are both token generation, but they activate different regions of the probability landscape.

Generation ("write a document about X") activates a broad region — many plausible continuations, including mediocre ones. The well is shaped by all the writing about X in the training data, weighted by frequency.

Evaluation ("is this sentence slop?") activates a narrow region — the model is classifying against a specific standard. The surrounding context in the training data is criticism and editing, where the standard of quality is explicit.

This is why models can detect slop more reliably than they can avoid generating it. Detection is a narrow well. Generation is a broad valley. The broad valley includes slop because the training data includes slop.

The practical implication: don't try to combine generation and evaluation in a single stance. "Write without slop" creates competing wells (generation + criticism). Instead, separate them into phases: generate first (with a stance that activates good writing), then evaluate (with a stance that activates critical analysis). Each phase uses the stance appropriate to its task.

## The information landscape

The model's ability to resolve tensions depends on what information it can access. Information falls into four categories:

**Agent-only perception** — information accessible through tools that the user doesn't typically see. Terminal output, log contents, file system structure. Gaps here are subtle — neither party knows what's missing. Identifying these gaps requires thinking carefully about what the model needs vs. what it can access.

**Shared perception** — information both the agent and user can see, using the same concepts. Diagnostics panels, editor state, visible errors. This is the highest-value category because it aligns the agent's wells with the user's experience. When the agent references shared perception, the user can immediately confirm or correct — the wells reinforce.

**Unshared environmental** — information that exists in the environment but the agent can't access yet. The most dangerous category. The agent doesn't know it's blind, so it defaults to inference — creating a well based on statistical patterns rather than actual state. This well is often wrong, and the error is invisible. When a skill depends on potentially unshared information, it should direct the agent to ask rather than infer.

**Inherently situated** — information that lives in the user's embodied experience. Priorities, energy, timing, flow state. No tool will capture this. The resolution is always collaboration — the agent shares what it observes and asks the user to combine that with what they know.

As tools improve, unshared environmental information moves to perception. This isn't just a capability improvement — it preserves the collaboration budget for inherently situated decisions where human judgment is genuinely irreplaceable.

## Implications for skill design

These mechanics lead to practical principles:

**Create reinforcing wells.** Each instruction in a skill should deepen the same well. If an instruction creates a competing well, it's working against the skill's own purpose.

**Use orthogonal stances.** Constrain different dimensions (content, form, audience, purpose) rather than the same dimension from different angles.

**Prefer moderate leverage.** Specific enough to create a meaningful well, concise enough to avoid the verbosity well, aligned enough that implicit assumptions match intent.

**Separate generation from evaluation.** Don't ask the model to write and critique simultaneously. Use phases or separate tools.

**State tensions, not rules.** A well-stated tension creates a deep well with internal structure that the model can navigate. A list of rules creates many shallow, competing wells.

**Make the stance visible.** If the user understands what well the skill creates, they can reinforce it rather than accidentally competing with it.

**Watch for invisible incoherence.** The most dangerous failures come from wells that compete without anyone realizing it — especially when user phrasing implicitly activates a well that undermines the skill's stance.

**Route information correctly.** Observable information should be observed (tools). Situated information should be collaborated on (ask the user). Unshared environmental information should be treated as situated until the right tool exists.
