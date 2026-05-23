# PER Arc — Plugin pipeline hardening

## Arc

The current arc is hardening the plugin pipeline by making source truths explicit and reducing drift between build, validation, publish, and resource discovery. Recent work stabilized the namespace (`wycats:*`), local install targeting, hidden stance resources, and the PER arc concept itself. The next phase is to make the machinery that ships those concepts less duplicative and less dependent on implicit state.

The project is moving from "local toolkit that works" toward "self-consistent plugin system whose build, validation, publish, and documentation paths reinforce each other."

## Current phase / position

Between cycles. A read-only codebase review surfaced a prioritized set of pipeline hardening opportunities. The next PER cycle should choose a bounded slice and test it against the repo.

## Hypothesis / current move

The highest-leverage first move is to make publish/build behavior share source truth instead of duplicating logic across local scripts and GitHub workflows.

Working hypothesis:

- CI publish workflows and local publish scripts currently duplicate enough metadata/package logic that they can drift.
- `scripts/build.ts` requiring `config.json` forces publish scripts to mutate local config rather than passing an explicit config path.
- Adding an explicit config input to build/publish paths will simplify publish scripts, reduce restore-footguns, and make workflows easier to harden with `pnpm validate` / `pnpm check` gates.

## Evidence

Recent read-only review found:

- Local publish scripts derive metadata from built manifests, while CI workflows hardcode metadata and shell-copy artifacts.
- `scripts/publish-vscode.ts` and `scripts/publish-cc.ts` temporarily overwrite `config.json` and restore it afterward.
- `scripts/build.ts` currently hard-requires `config.json`.
- Publish workflows install and build but do not run `pnpm validate` or `pnpm check` before publishing.
- `scripts/target-output.ts` centralizes target output mapping, but `publish-cc` still has hardcoded Claude output paths.
- Stances are now hidden skill resources, but validation should continue to enforce the hidden-user-facing boundary.
- Resource discovery currently tolerates missing sections, but broad error swallowing may hide real filesystem problems.

Current repo state at arc setup:

- Branch: `main`
- Status: clean
- Latest merged work: PR #27, including `docs/per-arc.md` and `.github/pull_request_template.md`
- Generated VS Code artifacts are under `dist/wycats/`

## Divergences

The major divergence from earlier assumptions is that session lifecycle artifacts are no longer the only continuity mechanism worth improving. GPT 5.5 and better repo/tool perception reduce the need for full session reconstruction, but not the need for project-level continuity. The PER arc should preserve calibrated motion across cycles while session lifecycle skills remain responsible for time-bound handoff.

Another divergence: stances have moved from plain copied markdown into hidden skill resources. That increases composability, but it also makes visibility/hiddenness a validation concern rather than just a documentation convention.

## Live tensions

- **Shared source truth vs. operational convenience:** publish scripts and workflows are easier to write separately, but separate logic creates invisible drift.
- **Explicit config vs. local ergonomics:** requiring `config.json` is simple for local iteration, but publish/build automation needs explicit config inputs that do not mutate local state.
- **Validation as protection vs. validation as drag:** publish workflows should fail before shipping bad artifacts, but the added gates should not make routine publishing ceremonial.
- **Hidden resources vs. accidental user surface:** stances are useful to agents as hidden resources, but a missing `user-invocable: false` could leak cognitive scaffolding into user-facing skills.
- **Arc dashboard vs. backlog:** this file should preserve calibrated project motion, not become an inventory of every possible cleanup.

## Next good move

Run a PER on publish/build source-of-truth cleanup.

Suggested boundary:

1. Teach `scripts/build.ts` to accept an explicit config path via CLI flag or environment variable.
2. Update `publish-vscode` and `publish-cc` to build from example configs without rewriting `config.json`.
3. Make publish code use shared target-output helpers consistently.
4. Update workflows to avoid hardcoded publish metadata where practical and add `pnpm validate` / `pnpm check` gates.
5. Validate both VS Code and Claude Code build paths.

Stop before widening into resource-discovery or stance-validation unless the build/publish changes force touching them.

## Parked threads

- Enforce `user-invocable: false` for all `stances/*/SKILL.md` in validation.
- Tighten `resource-discovery` so it only swallows expected missing optional directories and surfaces other read errors.
- Make `setup` report registration failure more explicitly instead of ending with generic success language.
- Replace manual YAML serialization sharp edges in `scripts/build.ts` with safer quoting or a serializer.
- Consider whether TypeScript `dist` output and published plugin `dist/wycats` should remain under the same top-level directory long term.
- Decide whether `PER-ARC.md` should remain a repo artifact, become a memory artifact, or eventually be managed by a `/per-arc` skill.

## Cycle log

### 2026-05-23 — Arc setup

Prepare context:

- The repo now has a design note at `docs/per-arc.md` describing this artifact shape.
- A read-only review identified build/publish/resource validation hardening as the next coherent arc.

Execution result:

- Created this `PER-ARC.md` as the project instrument panel for the hardening arc.

Review calibration:

- Pending. The next PER should verify whether publish/build source-of-truth cleanup is the right first bounded cycle.
