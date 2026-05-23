# PER Arc — Plugin pipeline hardening

## Arc

The current arc is hardening the plugin pipeline by making source truths explicit and reducing drift between build, validation, publish, and resource discovery. Recent work stabilized the namespace (`wycats:*`), local install targeting, hidden stance resources, and the PER arc concept itself. The next phase is to make the machinery that ships those concepts less duplicative and less dependent on implicit state.

The project is moving from "local toolkit that works" toward "self-consistent plugin system whose build, validation, publish, and documentation paths reinforce each other."

## Current phase / position

First cycle completed and committed on `pipeline-source-truth-hardening`. The publish/build source-truth slice is ready for PR review. The next cycle should not widen until this branch lands; after that, the best follow-up is likely validation hardening for hidden stance resources and resource discovery errors.

## Hypothesis / current move

The first cycle tested the hypothesis that publish/build behavior could share source truth without redesigning publish credentials or branch semantics.

Resulting calibration:

- The build entry point was the right place for explicit config selection.
- Local publish scripts no longer need to mutate `config.json`.
- Workflows can be hardened with validation/check gates and manifest-derived marketplace metadata without yet invoking the local publish scripts directly.
- The remaining workflow inline publish logic is acceptable for this slice, but still represents future cleanup surface.

## Evidence

Recent read-only review found:

- Local publish scripts derive metadata from built manifests, while CI workflows hardcode metadata and shell-copy artifacts.
- `scripts/publish-vscode.ts` and `scripts/publish-cc.ts` temporarily overwrite `config.json` and restore it afterward.
- `scripts/build.ts` currently hard-requires `config.json`.
- Publish workflows install and build but do not run `pnpm validate` or `pnpm check` before publishing.
- `scripts/target-output.ts` centralizes target output mapping, but `publish-cc` still has hardcoded Claude output paths.
- Stances are now hidden skill resources, but validation should continue to enforce the hidden-user-facing boundary.
- Resource discovery currently tolerates missing sections, but broad error swallowing may hide real filesystem problems.

First cycle implementation found:

- `scripts/build.ts` now accepts `--config <path>`, `--config=<path>`, and `VSCODE_AI_PLUGIN_CONFIG_PATH`, while preserving default `config.json` behavior.
- `scripts/publish-vscode.ts` and `scripts/publish-cc.ts` now build from example configs without rewriting local `config.json`.
- `scripts/publish-cc.ts` now uses shared target-output helpers for Claude Code output paths.
- Both publish workflows now run `pnpm validate` and `pnpm check` before building/publishing.
- Both publish workflows now derive marketplace name/version/description from built manifests rather than hardcoding stale metadata.
- `scripts/build.ts` accepts both direct package-script arguments (`pnpm build --config ...`) and the common npm/pnpm separator form (`pnpm build -- --config ...`).

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

Open a PR for the committed publish/build source-truth cleanup and let CI exercise the workflow changes.

After that lands, run the next PER on validation hardening:

1. Enforce `user-invocable: false` for all `stances/*/SKILL.md`.
2. Tighten `resource-discovery` so expected missing optional directories are tolerated, but other filesystem errors surface.
3. Preserve the current hidden stance resource behavior and generated plugin counts.

Do not fold that validation work into the publish/build PR unless review uncovers a direct dependency.

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

- Confirmed. The next PER verified that publish/build source-of-truth cleanup was the right first bounded cycle.

### 2026-05-23 — Publish/build source-truth cleanup

Prepare hypothesis:

- Add explicit config selection to `scripts/build.ts`.
- Remove local `config.json` mutation from publish scripts.
- Use shared target-output helpers consistently in publish code.
- Add `pnpm validate` / `pnpm check` gates to publish workflows.
- Reduce hardcoded workflow metadata where practical without redesigning credentials or branch semantics.

Execution result:

- Implemented explicit build config selection through CLI/env.
- Updated local publish scripts to build from example configs.
- Updated workflows with validation gates and manifest-derived marketplace metadata.
- Kept workflows' inline publish logic to avoid expanding into credential and branch-semantics redesign.

Review calibration:

- Initial review found a concrete workflow invocation bug: `pnpm build -- --config ...` forwards a literal `--` and fails.
- Targeted fix changed workflow commands to `pnpm build --config ...`.
- Copilot review correctly generalized that `scripts/build.ts` should also tolerate the common separator form.
- Targeted fix made standalone `--` a no-op in build argument parsing and documented both invocation styles in usage text.
