import assert from "node:assert/strict";
import test from "node:test";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveCanonicalResourcePath, validateCanonicalResource } from "./resource.ts";

void test("keeps canonical resource symlinks inside the repository", async () => {
  const temporary = await mkdtemp(join(tmpdir(), "eval-resource-"));
  const root = join(temporary, "repo");
  try {
    await mkdir(root);
    const inside = join(root, "inside.md");
    const outside = join(temporary, "outside.md");
    await writeFile(inside, "Inside");
    await writeFile(outside, "Outside");
    await symlink(inside, join(root, "inside-link.md"));
    await symlink(outside, join(root, "outside-link.md"));
    assert.equal(await resolveCanonicalResourcePath(root, "inside-link.md"), join(root, "inside-link.md"));
    await assert.rejects(resolveCanonicalResourcePath(root, "outside-link.md"), /must resolve inside/);
    await assert.rejects(resolveCanonicalResourcePath(root, "../outside.md"), /must resolve inside/);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});

const source = `---
name: slop-linter
description: Example
---

Instructions.
`;

void test("ties resource name and identity to the canonical source", () => {
  assert.doesNotThrow(() => {
    validateCanonicalResource(
      {
        identity: "wycats-plugin:agents/slop-linter",
        name: "slop-linter",
        path: "agents/slop-linter.agent.md",
      },
      source,
    );
  });
  assert.throws(
    () => {
      validateCanonicalResource(
        {
          identity: "wycats-plugin:agents/review",
          name: "review",
          path: "agents/slop-linter.agent.md",
        },
        source,
      );
    },
    /does not match canonical name 'slop-linter'/,
  );
  assert.throws(
    () => {
      validateCanonicalResource(
        {
          identity: "wycats-plugin:agents/review",
          name: "slop-linter",
          path: "agents/slop-linter.agent.md",
        },
        source,
      );
    },
    /does not match canonical identity 'wycats-plugin:agents\/slop-linter'/,
  );
  assert.throws(
    () => {
      validateCanonicalResource(
        {
          identity: "other-plugin:agents/slop-linter",
          name: "slop-linter",
          path: "agents/slop-linter.agent.md",
        },
        source,
      );
    },
    /does not match canonical identity 'wycats-plugin:agents\/slop-linter'/,
  );
  assert.throws(
    () => {
      validateCanonicalResource(
        {
          identity: "wycats-plugin:agents/../agents/review",
          name: "../agents/review",
          path: "agents/../agents/review.agent.md",
        },
        `---\ndescription: Reviews changes.\n---\n\nInstructions.\n`,
      );
    },
    /must use its canonical repository-relative form/,
  );
});

void test("derives an agent name when frontmatter omits it", () => {
  assert.doesNotThrow(() => {
    validateCanonicalResource(
      {
        identity: "wycats-plugin:agents/review",
        name: "review",
        path: "agents/review.agent.md",
      },
      `---\ndescription: Reviews changes.\n---\n\nInstructions.\n`,
    );
  });
});

void test("requires runtime discovery frontmatter", () => {
  assert.throws(
    () => {
      validateCanonicalResource(
        {
          identity: "wycats-plugin:agents/review",
          name: "review",
          path: "agents/review.agent.md",
        },
        `---\nname: review\n---\n\nInstructions.\n`,
      );
    },
    /must declare a non-empty description in frontmatter/,
  );
  assert.throws(
    () => {
      validateCanonicalResource(
        {
          identity: "wycats-plugin:stances/quiet-review",
          name: "quiet-review",
          path: "stances/quiet-review/SKILL.md",
        },
        `---\nname: quiet-review\ndescription: Reviews quietly.\n---\n\nInstructions.\n`,
      );
    },
    /must declare 'user-invocable: false' in frontmatter/,
  );
  assert.doesNotThrow(() => {
    validateCanonicalResource(
      {
        identity: "wycats-plugin:stances/quiet-review",
        name: "quiet-review",
        path: "stances/quiet-review/SKILL.md",
      },
      `---\nname: quiet-review\ndescription: Reviews quietly.\nuser-invocable: false\n---\n\nInstructions.\n`,
    );
  });
});
