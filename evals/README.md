# Behavioral evaluations

The cases in this directory describe what a canonical resource should do. They
do not describe how a particular host invokes it. Runtime adapters project the
same request into each host and report the target, transport, model mapping,
source revision, raw response, and grade.

Each positive case should have a nearby counterexample. A phrase can be a useful
clue without being a defect in every context. The paired case keeps the
evaluation attached to the judgment the resource is meant to make.

The slop-linter cases diagnose prose. They do not infer whether a person or a
model wrote it. Sources such as Wikipedia's [Signs of AI
writing](https://en.wikipedia.org/w/index.php?title=Wikipedia:Signs_of_AI_writing&oldid=1369699198)
can suggest cases, but each case needs to name the underlying prose failure and
include a counterexample where the same surface feature is doing real work.

A required finding names the exact passage it should diagnose. One finding can
quote the complete passage, or several exact quotes can cover it together. Add
accepted labels when the classification itself is part of the contract; leave
them out when the case is only about whether the passage receives a finding.
Use `maximumFindings` when finding count is itself meaningful. `rewriteExcludes`
verifies that a diagnosed defect was removed. `rewritePreserves` keeps an exact
span unchanged inside a larger rewrite, while `rewriteEqualsInput` protects a
clean document as a whole.

## Running the suite

The deterministic tests exercise fixture validation, response parsing, and
grading without calling a model:

```sh
pnpm test:eval
```

Inspect each canonical request beside the target's projected prompt:

```sh
pnpm eval -- --adapter claude-code-cli --dry-run
```

Run the suite through an authenticated Claude Code CLI:

```sh
pnpm eval -- --adapter claude-code-cli
```

This adapter targets Claude Code through its standalone CLI transport. A Claude
Code session running only as a VS Code extension does not provide that
executable; it needs a different adapter, not different evaluation cases.

Live results are written under `.runtime/evals/`, which is ignored by git.
