import matter from "gray-matter";
import type { EvaluationResource } from "./core.ts";

export const CANONICAL_RESOURCE_AUTHORITY = "wycats-plugin";

export interface CanonicalResourceDescriptor {
  kind: "agent" | "skill" | "stance";
  name: string;
  locator: string;
}

export function canonicalResourceDescriptor(path: string): CanonicalResourceDescriptor {
  const normalized = path.replaceAll("\\", "/");
  const agent = normalized.match(/^agents\/(.+)\.agent\.md$/);
  if (agent) return { kind: "agent", name: agent[1], locator: `agents/${agent[1]}` };

  const skillLike = normalized.match(/^(skills|stances)\/([^/]+)\/SKILL\.md$/);
  if (skillLike) {
    return {
      kind: skillLike[1] === "skills" ? "skill" : "stance",
      name: skillLike[2],
      locator: `${skillLike[1]}/${skillLike[2]}`,
    };
  }

  throw new Error(`Unsupported canonical resource path: ${path}.`);
}

export function validateCanonicalResource(
  resource: EvaluationResource,
  source: string,
): void {
  const descriptor = canonicalResourceDescriptor(resource.path);
  const frontmatter = matter(source).data as Record<string, unknown>;
  if (frontmatter.name !== undefined && frontmatter.name !== descriptor.name) {
    throw new Error(
      `Resource name ${JSON.stringify(frontmatter.name)} in ${resource.path} does not match canonical name '${descriptor.name}'.`,
    );
  }
  if (descriptor.kind !== "agent" && frontmatter.name === undefined) {
    throw new Error(`${resource.path} must declare its canonical name in frontmatter.`);
  }
  if (resource.name !== descriptor.name) {
    throw new Error(
      `Resource name '${resource.name}' does not match canonical name '${descriptor.name}'.`,
    );
  }

  const separator = resource.identity.indexOf(":");
  const sourceName = resource.identity.slice(0, separator);
  const identityLocator = resource.identity.slice(separator + 1);
  if (
    separator <= 0 ||
    sourceName !== CANONICAL_RESOURCE_AUTHORITY ||
    identityLocator !== descriptor.locator
  ) {
    throw new Error(
      `Resource identity '${resource.identity}' does not match canonical identity '${CANONICAL_RESOURCE_AUTHORITY}:${descriptor.locator}'.`,
    );
  }
}
