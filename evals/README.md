# Behavioral evaluations

The cases in this directory describe what a canonical resource should do. They
do not describe how a particular host invokes it. Runtime adapters project the
same request into each host and report the target, model mapping, source
revision, raw response, and grade.

Each positive case should have a nearby counterexample. A phrase can be a useful
clue without being a defect in every context. The paired case keeps the
evaluation attached to the judgment the resource is meant to make.

The slop-linter cases diagnose prose. They do not infer whether a person or a
model wrote it. Sources such as Wikipedia's [Signs of AI
writing](https://en.wikipedia.org/w/index.php?title=Wikipedia:Signs_of_AI_writing&oldid=1369699198)
can suggest cases, but each case needs to name the underlying prose failure and
include a counterexample where the same surface feature is doing real work.

## Running the suite

The deterministic tests exercise fixture validation, response parsing, and
grading without calling a model:

```sh
pnpm test:eval
```

Inspect each canonical request beside the target's projected prompt:

```sh
pnpm eval -- --target claude-code --dry-run
```

Run the suite through an authenticated Claude Code CLI:

```sh
pnpm eval -- --target claude-code
```

Live results are written under `.runtime/evals/`, which is ignored by git.
