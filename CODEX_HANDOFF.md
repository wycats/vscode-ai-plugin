# Codex Account Split Handoff

Date: 2026-06-17

Purpose: preserve continuity for this work repo before the default Codex home is signed out of the personal account and signed into the work account.

## Recovery Instructions

- Start here after opening this repo in the work-account Codex session.
- Treat the repo state and Git history as the source of truth.
- If this summary is too thin, read the raw rollout JSONL files listed below from either:
  - personal clone: `/Users/wycats/.codex-personal`
  - verified archive: `/Users/wycats/Codex State Backups/codex-state-20260617-124755/dot-codex`
- Do not paste secrets or large transcript excerpts into new chats. Extract only the specific decision, command, or code reference needed.

## Current Repo State

- Repo: `/Users/wycats/Code/vscode-ai-plugin`
- Branch: `main...origin/main`
- HEAD: `b761e14 Refine code review signal guidance (#39)`
- Dirty status before this handoff file:
  - untracked `docs/exo-composition.md`
  - untracked `docs/lane-centered-ai-workbench.md`
- Current dirty status also includes:
  - untracked `CODEX_HANDOFF.md`
  - untracked `.exo/` runtime residue

## Exo Reality Check

- This checkout is not currently an Exo-initialized workspace: `exo status` and
  `exo task list` fail here because `/Users/wycats/Code/vscode-ai-plugin` has no
  `exosuit.toml`.
- There is an untracked `.exo/runtime` directory with daemon identity for this
  path, but it is not enough to recover project state. Treat it as leftover
  runtime evidence, not as a canonical Exo handoff.
- If the next chat needs Exo's broader product/workflow state, open
  `/Users/wycats/Code/exo2` and run `exo status` / `exo task list` there. That
  state currently describes Exo's MCP runtime durability work, not a
  project-local lane for this repo.
- For `vscode-ai-plugin`, bootstrap from git, this handoff file, and the rollout
  paths below.

## Active Codex Threads

Rollout paths are relative to the transcript roots above.

| Thread id | Updated | Branch | Rollout | What it contains |
| --- | --- | --- | --- | --- |
| `019ec724-a5ef-7bc1-92b8-aadbd2e8f858` | 2026-06-16 19:04 | `main` | `sessions/2026/06/14/rollout-2026-06-14T10-18-48-019ec724-a5ef-7bc1-92b8-aadbd2e8f858.jsonl` | Codex plugin packaging, code-review skill publishing, source/dist synchronization, and installed-plugin visibility nuance. |
| `019e8513-9c54-7721-bac1-d739bdf4ab61` | 2026-06-01 14:57 | `update-pipeline-hardening-arc-status` | `sessions/2026/06/01/rollout-2026-06-01T14-25-15-019e8513-9c54-7721-bac1-d739bdf4ab61.jsonl` | Older pipeline hardening and arc status context. |

## Continuation Notes

- This repo has an established packaging workflow: source `skills/` changes should stay synchronized with packaged `dist/wycats/` output.
- Recent preference: keep guidance stance-shaped, route via `Review signal`, and avoid large negative instruction blocks.
- Before coding, rerun `git status --short --branch` and inspect whether the two untracked docs are intended handoff/design artifacts.
- The two untracked docs are exploratory design artifacts: `docs/exo-composition.md` is the Exo/plugin relationship brief, and `docs/lane-centered-ai-workbench.md` is the lane-centered AI workbench thought experiment with PR/RFC artifact axes.
- Do not assume Exo commands work in this repo unless someone initializes or links
  the workspace intentionally.
- The old personal-account thread UI may disappear after work sign-in. That is expected; use this file plus the raw rollout pointers instead.
