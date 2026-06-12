---
name: gh-resolve-review-threads
description: "Use when Yehuda explicitly asks to mark addressed GitHub or Copilot pull request review comments resolved. Resolve the corresponding PR review threads by default after verifying the fix landed, while leaving ambiguous, unaddressed, conflicting, or human-decision threads open."
---

# GH Resolve Review Threads

Coordinate resolution of addressed GitHub PR review threads. This skill is a policy layer over the normal GitHub tools, not a replacement for them.

## Default stance

When Yehuda explicitly asks to mark addressed PR review comments resolved, treat resolution as part of finishing the work. After verifying the requested fix landed, resolve the matching review thread unless there is a concrete reason to pause.

Do not infer this permission from a generic request to "address comments" or "fix feedback." The explicit request matters because resolving a thread changes the review surface for humans.

## Workflow

1. Identify the PR and review comments Yehuda means.
   - Prefer thread-aware GitHub reads over flattened comment lists.
   - If the available GitHub connector does not expose review-thread IDs, use `gh api graphql` to read `pullRequest.reviewThreads`.
   - Collect enough context to distinguish sibling comments on the same file and line: thread ID, resolved state, file path, line or diff position, author, body, URL, and any replies.

2. Verify the fix landed.
   - Inspect the local diff, pushed commit, PR diff, or relevant test evidence.
   - Match the fix to the review thread's actual concern, not only to the file or line.
   - Treat Copilot comments like any other review comments: useful signal, but still verify the code behavior.

3. Resolve clear matches.
   - Use the thread ID, not a comment ID, when resolving review threads.
   - Prefer the GitHub connector when it supports review-thread resolution.
   - Otherwise use GitHub GraphQL, for example the `resolveReviewThread` mutation via `gh api graphql`.

4. Leave threads open when resolution would be misleading.
   - The requested thread is ambiguous or you cannot map it to a specific review thread.
   - The fix is not actually present in the PR branch.
   - The thread conflicts with another review point or the code changed in a way that needs reviewer judgment.
   - Resolving would hide a meaningful human-review decision, design tradeoff, or unresolved product question.
   - The thread is already resolved; record it as already resolved instead of resolving it again.

5. Report the outcome.
   - Summarize resolved threads with enough identifying context: file, reviewer, short concern, and URL when available.
   - Summarize left-open threads separately with the concrete reason each remains open.
   - Mention the evidence used to verify the fix, including tests or PR diff checks when relevant.

## Practical notes

GitHub's REST review-comment APIs often lose the thread boundary that matters for resolution. When in doubt, query the PR's GraphQL `reviewThreads` connection and resolve by `PullRequestReviewThread` ID.

Avoid resolving a thread merely because the changed line moved, the thread is outdated, or a bot comment looks low-risk. Outdated or bot-authored threads can still represent live feedback if the underlying concern remains.
