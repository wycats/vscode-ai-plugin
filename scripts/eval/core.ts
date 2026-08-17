import { readFile } from "node:fs/promises";

export interface RequiredFinding {
  anyOf: string[];
}

export interface CaseExpectation {
  requiredFindings?: RequiredFinding[];
  rewriteIncludes?: string[];
  maximumFindings?: number;
}

export interface EvaluationCase {
  id: string;
  description: string;
  document: string;
  expect: CaseExpectation;
}

export interface EvaluationResource {
  identity: string;
  name: string;
  path: string;
}

export interface EvaluationSuite {
  schemaVersion: 1;
  resource: EvaluationResource;
  description: string;
  cases: EvaluationCase[];
}

export interface EvaluationFinding {
  quote: string;
  label: string;
  why: string;
  action: string;
}

export interface EvaluationResponse {
  findings: EvaluationFinding[];
  rewrittenDocument: string;
}

export interface Grade {
  passed: boolean;
  failures: string[];
  observedFindingLabels: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireString(value: unknown, path: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${path} must be a non-empty string.`);
  }
  return value;
}

function optionalStringArray(value: unknown, path: string): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) {
    throw new Error(`${path} must be an array.`);
  }
  return value.map((item, index) => requireString(item, `${path}[${String(index)}]`));
}

function parseExpectation(value: unknown, path: string): CaseExpectation {
  if (!isRecord(value)) throw new Error(`${path} must be an object.`);

  let requiredFindings: RequiredFinding[] | undefined;
  if (value.requiredFindings !== undefined) {
    if (!Array.isArray(value.requiredFindings)) {
      throw new Error(`${path}.requiredFindings must be an array.`);
    }
    requiredFindings = value.requiredFindings.map((entry, index) => {
      if (!isRecord(entry)) {
        throw new Error(`${path}.requiredFindings[${String(index)}] must be an object.`);
      }
      const anyOf = optionalStringArray(
        entry.anyOf,
        `${path}.requiredFindings[${String(index)}].anyOf`,
      );
      if (!anyOf || anyOf.length === 0) {
        throw new Error(`${path}.requiredFindings[${String(index)}].anyOf must not be empty.`);
      }
      return { anyOf };
    });
  }

  const expectation: CaseExpectation = {
    requiredFindings,
    rewriteIncludes: optionalStringArray(value.rewriteIncludes, `${path}.rewriteIncludes`),
  };
  if (value.maximumFindings !== undefined) {
    if (!Number.isInteger(value.maximumFindings) || Number(value.maximumFindings) < 0) {
      throw new Error(`${path}.maximumFindings must be a non-negative integer.`);
    }
    expectation.maximumFindings = Number(value.maximumFindings);
  }

  if (
    !expectation.requiredFindings?.length &&
    !expectation.rewriteIncludes?.length &&
    expectation.maximumFindings === undefined
  ) {
    throw new Error(`${path} must contain at least one assertion.`);
  }

  return expectation;
}

export function parseSuite(value: unknown): EvaluationSuite {
  if (!isRecord(value)) throw new Error("Suite must be an object.");
  if (value.schemaVersion !== 1) throw new Error("schemaVersion must be 1.");
  if (!Array.isArray(value.cases) || value.cases.length === 0) {
    throw new Error("cases must be a non-empty array.");
  }

  const seenIds = new Set<string>();
  const cases = value.cases.map((entry, index): EvaluationCase => {
    const path = `cases[${String(index)}]`;
    if (!isRecord(entry)) throw new Error(`${path} must be an object.`);
    const id = requireString(entry.id, `${path}.id`);
    if (seenIds.has(id)) throw new Error(`${path}.id duplicates '${id}'.`);
    seenIds.add(id);
    return {
      id,
      description: requireString(entry.description, `${path}.description`),
      document: requireString(entry.document, `${path}.document`),
      expect: parseExpectation(entry.expect, `${path}.expect`),
    };
  });

  if (!isRecord(value.resource)) throw new Error("resource must be an object.");

  return {
    schemaVersion: 1,
    resource: {
      identity: requireString(value.resource.identity, "resource.identity"),
      name: requireString(value.resource.name, "resource.name"),
      path: requireString(value.resource.path, "resource.path"),
    },
    description: requireString(value.description, "description"),
    cases,
  };
}

export async function loadSuite(path: string): Promise<EvaluationSuite> {
  const source = await readFile(path, "utf-8");
  let parsed: unknown;
  try {
    parsed = JSON.parse(source) as unknown;
  } catch (error) {
    throw new Error(`Could not parse suite JSON at ${path}: ${String(error)}`, { cause: error });
  }
  return parseSuite(parsed);
}

function parseFinding(value: unknown, path: string): EvaluationFinding {
  if (!isRecord(value)) throw new Error(`${path} must be an object.`);
  return {
    quote: requireString(value.quote, `${path}.quote`),
    label: requireString(value.label, `${path}.label`),
    why: requireString(value.why, `${path}.why`),
    action: requireString(value.action, `${path}.action`),
  };
}

export function parseEvaluationResponse(raw: string): EvaluationResponse {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const json = fenced?.[1] ?? trimmed;

  let value: unknown;
  try {
    value = JSON.parse(json) as unknown;
  } catch (error) {
    throw new Error(`Response is not JSON: ${String(error)}`, { cause: error });
  }
  if (!isRecord(value)) throw new Error("Response must be a JSON object.");
  if (!Array.isArray(value.findings)) throw new Error("Response findings must be an array.");

  return {
    findings: value.findings.map((finding, index) =>
      parseFinding(finding, `findings[${String(index)}]`),
    ),
    rewrittenDocument: requireString(value.rewrittenDocument, "rewrittenDocument"),
  };
}

function normalize(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

export function gradeResponse(testCase: EvaluationCase, response: EvaluationResponse): Grade {
  const failures: string[] = [];
  const observedFindingLabels = response.findings.map((finding) => finding.label);
  const normalizedLabels = new Set(observedFindingLabels.map(normalize));

  for (const [index, finding] of response.findings.entries()) {
    if (!testCase.document.includes(finding.quote)) {
      failures.push(`Finding ${String(index + 1)} quotes text that does not appear in the document.`);
    }
  }

  const maximumFindings = testCase.expect.maximumFindings;
  if (maximumFindings !== undefined && response.findings.length > maximumFindings) {
    failures.push(
      `Observed ${String(response.findings.length)} findings; expected at most ${String(maximumFindings)}.`,
    );
  }

  for (const requirement of testCase.expect.requiredFindings ?? []) {
    if (!requirement.anyOf.some((label) => normalizedLabels.has(normalize(label)))) {
      failures.push(`Missing required finding: one of ${requirement.anyOf.join(", ")}.`);
    }
  }

  const normalizedRewrite = normalize(response.rewrittenDocument);
  for (const text of testCase.expect.rewriteIncludes ?? []) {
    if (!normalizedRewrite.includes(normalize(text))) {
      failures.push(`Rewritten document does not include: ${text}.`);
    }
  }

  return {
    passed: failures.length === 0,
    failures,
    observedFindingLabels,
  };
}

export function buildCanonicalPrompt(resourceName: string, testCase: EvaluationCase): string {
  return `Evaluate the document according to the ${resourceName} resource's own instructions.

Return only a JSON object with this shape:
{
  "findings": [
    {
      "quote": "exact text from the document",
      "label": "exact label from the resource",
      "why": "why this finding applies",
      "action": "delete, replace, or TODO"
    }
  ],
  "rewrittenDocument": "the complete rewritten document"
}

Use an empty findings array when the document has no findings. Do not infer or discuss whether a person or a model wrote the document.

<document>
${testCase.document}
</document>`;
}
