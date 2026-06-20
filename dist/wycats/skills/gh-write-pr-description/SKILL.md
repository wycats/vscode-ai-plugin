---
name: gh-write-pr-description
description: "Use when drafting, updating, or reviewing a GitHub pull request title or body, including PR creation flows that need reviewer-facing prose. Follow the repo PR template when present, preserve the user's or project's voice, and route validation/session details to the right surface."
---

# GH Write PR Description

A PR description is a reviewer-facing change story, not a session report. It
should help a reviewer understand why the PR exists, what changed at the
product or maintainer level, and what deserves attention. The repo template
supplies form. The user and project supply voice. Local execution details
belong only when they change how the reviewer should read the PR.

## Core stance

The tension is reviewer story vs. local execution log.

Agents often drift toward completion reports because the recent context is full
of files changed, commands run, and checks performed. That information can be
real without belonging in the PR body. Write for the person reviewing the PR,
not for the agent proving that it worked.

Compose five stances:

- **Template fidelity**: inspect the repository's PR template and inhabit its
  sections instead of inventing a generic body.
- **Reviewer-facing story**: explain motivation, user or maintainer impact,
  approach, tradeoffs, and review focus.
- **Voice preservation**: match the user's and project's tone: density,
  directness, vocabulary, and appetite for detail.
- **Evidence routing**: keep validation evidence where reviewers expect it:
  CI, comments, follow-up discussion, or the chat closeout, unless the template
  asks for it or the result is itself review-relevant.
- **Relational continuity**: load **relational-continuity** to keep the PR
  language attached to the review story the change actually supports.

## Workflow

1. Find the template.
   - Check common locations such as `.github/pull_request_template.md`,
     `.github/PULL_REQUEST_TEMPLATE.md`, `.github/PULL_REQUEST_TEMPLATE/*.md`,
     `docs/pull_request_template.md`, `pull_request_template.md`, and
     `PULL_REQUEST_TEMPLATE.md`.
   - If a template exists, preserve its headings and omit optional sections
     that carry no signal.
   - If no template exists, use a small reviewer-facing structure: `Why`,
     `What changed`, and `Reviewer focus` when useful.

2. Calibrate the voice.
   - Prefer the current user's phrasing and the repo's template comments.
   - If useful and cheap, inspect one or two recent merged PR descriptions for
     tone and section density.
   - Keep the body compatible with the template even when matching the user's
     style.

3. Draft the body.
   - Put `Why` first, or directly under the template's summary when that is the
     established shape.
   - Describe the change at the level a reviewer needs: behavior, design,
     user-facing effect, or maintenance impact.
   - Include implementation notes only when the approach, tradeoff, risk, or
     non-obvious constraint matters for review.
   - Include reviewer focus only when there is a concrete decision, risk, or
     intentionally deferred follow-up.

4. Route validation evidence.
   - Mention validation in the PR body only when the template asks for it, the
     PR's risk makes the evidence part of the review story, or the reviewer
     needs a specific result to understand confidence.
   - If the template has a `Testing`, `Validation`, or similar section, fill it
     with the reviewer-relevant signal rather than an exhaustive command log.
   - Otherwise leave local command lists for chat closeout, CI, PR comments, or
     reviewer discussion.

5. Do a final pass for session-report drift.
   - Remove mechanical file inventories unless the template calls for them.
   - Remove agent process narration.
   - Remove local validation boilerplate that does not change review.
   - Keep specific risks, constraints, and reviewer questions.

## Practical notes

A good PR body can be short. If the change is straightforward, the template may
only need `Why` and one concrete user-facing or maintainer-facing change.

If the user asks for a body in their own style, preserve their cadence and
emphasis while still fitting the repository's template. Voice matching should
not flatten the user's intent into generic release-note prose.

If a publishing skill also runs checks before opening the PR, treat that as
execution evidence for the chat result. Copy it into the PR body only when it is
part of the reviewer story.
