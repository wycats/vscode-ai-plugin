# Canonical Resources and Runtime Projections

The plugin carries stable relational structures through different tasks,
timescales, and runtimes. Those surfaces should reinforce one another without
becoming independent sources of meaning.

The governing principle is:

> Coherence preserves a stable relational structure across situated
> projections. The canonical articulation governs changes to that structure;
> projections adapt it to a task, timescale, or runtime without becoming a
> competing source of meaning.

## Canonical means authority to revise

A canonical resource owns the language and activation intent that define its
behavior. For a stance, that includes its relational invariant, central
tension, cross-domain examples, applicability, and composition boundaries.
For a workflow skill, it includes the maneuver's entry conditions, process,
output, and handoff.

Canonical does not mean physically unique. Generated packages necessarily
materialize source files in several places, and a workflow may repeat a short
stance handle to keep its well active. The relevant question is where a change
to the meaning belongs. A projection may reinforce or apply the canonical
resource; it should not acquire independent authority to redefine it.

Exact language matters. These resources shape a model's probability landscape,
so semantic preservation is stronger than carrying the same topic or intent.
Prefer copying authoritative language directly. Treat a rewritten projection
as a semantic change unless the difference is confined to the host envelope.

## Projection across the plugin

The same relationship appears at several layers:

| Projection | Canonical owner | What the projection contributes |
| ---------- | --------------- | ------------------------------- |
| Cross-domain example | Stance | A different subject that preserves the stance's relational invariant |
| Workflow skill | Its own maneuver plus composed stances | Entry, sequencing, collaboration, output, and handoff for a situated task |
| Agent | Its fused cognitive mode plus crystallized stances | Persistent operational behavior for a delegated role |
| Project Orientation | User steering or the designated project-purpose surface | A current-bet view that carries purpose into sessions and coordination |
| Runtime package | Root source resources and build configuration | Host-specific location, discovery, model/tool names, hook envelopes, and supported surfaces |

These projections are not interchangeable. A skill composes stances; it does
not become their new definition. A session trajectory mirrors project purpose;
it does not replace the designated source. A generated package makes resources
available to a host; it does not become the authoring surface.

## Activation intent and runtime discovery

A resource's description states when it should enter the context.
`user-invocable` states whether it belongs on the user's direct workflow
surface. Those fields are semantic activation intent and remain owned by the
canonical resource.

Each runtime supplies a different discovery contract. The build adapts the
same intent to that contract:

| Target | Discovery and capability projection |
| ------ | ----------------------------------- |
| VS Code | Registers agents, workflow skills, hidden stances, instructions, and hooks through explicit manifest paths |
| Claude Code | Auto-discovers agents and skills, materializes stances in `skills/`, and consumes a consolidated hook manifest |
| Codex | Discovers workflow skills and materialized stances from `skills/`; packaged agents are reference material, while this plugin's hooks and instructions are not active |

Different discovery mechanisms can preserve the same activation intent. They
are not automatically behaviorally equivalent: a host may fail to activate a
resource, expose a hidden stance, or omit a capability. Projection validation
therefore checks both content fidelity and the host-visible surface.

## Reinforcement, variants, and loss

Intentional restatement is useful when it deepens the same well. A compact
phrase in a skill can reactivate a stance at the phase where it matters. An
agent can embody the stance in the voice of its role. The restatement remains
a projection when its meaning still changes through the canonical owner.

A projection has become a competing authority when it can answer the same
semantic question differently: when a skill independently defines what a
stance means, a generated file changes when the resource applies, or a session
artifact silently revises project purpose.

When a consumer genuinely needs different semantics, make the fork explicit.
Revise the canonical resource when the invariant itself changed. Introduce a
named variant when both meanings remain valid. When a runtime simply lacks the
required capability, describe the omission as capability loss rather than
simulating equivalence through different guidance.

## Authoring boundary

The root `stances/`, `skills/`, `agents/`, `instructions/`, and neutral hook
manifests are the plugin's canonical authoring surfaces. Abstract model roles,
tool groups, and canonical hook tool names let the build adapt execution
details without rewriting behavior. Generated `out/`, tracked `dist/wycats/`,
and publication branches are derived runtime artifacts.

This repository is the proving ground for this architecture and owns the
resources it authors. It does not need to become the permanent home of every
knowledge corpus that later adopts the same model. A shared corpus can live in
a neutral home while this plugin consumes and projects it under the same
authority boundary.
