import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCanonicalPrompt,
  gradeResponse,
  parseEvaluationResponse,
  parseSuite,
  type EvaluationCase,
  type EvaluationResponse,
} from "./core.ts";

const testCase: EvaluationCase = {
  id: "paired-case",
  description: "Test fixture",
  document: "Specific input.",
  expect: {
    requiredFindings: [{ anyOf: ["Generic claims", "Rhetorical framing"] }],
    rewriteIncludes: ["specific input"],
    maximumFindings: 1,
  },
};

const response: EvaluationResponse = {
  findings: [
    {
      quote: "Specific input.",
      label: "Generic claims",
      why: "It does not establish a claim.",
      action: "replace",
    },
  ],
  rewrittenDocument: "Specific input with an observable claim.",
};

void test("parses plain and fenced JSON responses", () => {
  const raw = JSON.stringify(response);
  assert.deepEqual(parseEvaluationResponse(raw), response);
  assert.deepEqual(parseEvaluationResponse(`\`\`\`json\n${raw}\n\`\`\``), response);
});

void test("grades required findings, finding count, and preserved rewrite text", () => {
  assert.deepEqual(gradeResponse(testCase, response), {
    passed: true,
    failures: [],
    observedFindingLabels: ["Generic claims"],
  });

  const failure = gradeResponse(testCase, {
    findings: [
      { ...response.findings[0], label: "Empty contrast" },
      { ...response.findings[0], label: "Soft assertions" },
    ],
    rewrittenDocument: "A different sentence.",
  });
  assert.equal(failure.passed, false);
  assert.deepEqual(failure.failures, [
    "Observed 2 findings; expected at most 1.",
    "Missing required finding: one of Generic claims, Rhetorical framing.",
    "Rewritten document does not include: specific input.",
  ]);
});

void test("rejects a finding whose quote was invented", () => {
  const grade = gradeResponse(testCase, {
    ...response,
    findings: [{ ...response.findings[0], quote: "Text absent from the document." }],
  });
  assert.equal(grade.passed, false);
  assert.deepEqual(grade.failures, [
    "Finding 1 quotes text that does not appear in the document.",
  ]);
});

void test("treats unexpected findings in a clean counterexample as failures", () => {
  const cleanCase: EvaluationCase = {
    id: "clean",
    description: "A counterexample",
    document: "The report records the target.",
    expect: { maximumFindings: 0 },
  };
  const grade = gradeResponse(cleanCase, {
    findings: [
      {
        quote: "The report records the target.",
        label: "Generic claims",
        why: "Incorrectly treated as generic.",
        action: "delete",
      },
    ],
    rewrittenDocument: "The report records the target.",
  });
  assert.equal(grade.passed, false);
  assert.deepEqual(grade.failures, ["Observed 1 findings; expected at most 0."]);
});

void test("validates suite identity and assertions", () => {
  assert.throws(
    () =>
      parseSuite({
        schemaVersion: 1,
        resource: {
          identity: "wycats-plugin:agents/slop-linter",
          name: "slop-linter",
          path: "agents/slop-linter.agent.md",
        },
        description: "Example",
        cases: [
          { id: "same", description: "First", document: "One", expect: { maximumFindings: 0 } },
          { id: "same", description: "Second", document: "Two", expect: { maximumFindings: 0 } },
        ],
      }),
    /duplicates 'same'/,
  );
  assert.throws(
    () =>
      parseSuite({
        schemaVersion: 1,
        resource: {
          identity: "wycats-plugin:agents/slop-linter",
          name: "slop-linter",
          path: "agents/slop-linter.agent.md",
        },
        description: "Example",
        cases: [{ id: "empty", description: "Empty", document: "Text", expect: {} }],
      }),
    /at least one assertion/,
  );
});

void test("builds a host-neutral prompt with an authorship boundary", () => {
  const prompt = buildCanonicalPrompt("slop-linter", testCase);
  assert.match(prompt, /according to the slop-linter resource's own instructions/);
  assert.match(prompt, /Do not infer or discuss whether a person or a model wrote/);
  assert.match(prompt, /<document>\nSpecific input\.\n<\/document>/);
  assert.doesNotMatch(prompt, /Claude|Codex|VS Code/);
});
