import matter from "gray-matter";
import type { EvaluationResource } from "./core.ts";

function resourceLocator(path: string): string {
  const normalized = path.replaceAll("\\", "/");
  const agent = normalized.match(/^agents\/(.+)\.agent\.md$/);
  if (agent) return `agents/${agent[1]}`;

  const skillLike = normalized.match(/^(skills|stances)\/([^/]+)\/SKILL\.md$/);
  if (skillLike) return `${skillLike[1]}/${skillLike[2]}`;

  throw new Error(`Unsupported canonical resource path: ${path}.`);
}

export function validateCanonicalResource(
  resource: EvaluationResource,
  source: string,
): void {
  const frontmatter = matter(source).data as Record<string, unknown>;
  if (frontmatter.name !== resource.name) {
    throw new Error(
      `Resource name '${resource.name}' does not match '${String(frontmatter.name)}' in ${resource.path}.`,
    );
  }

  const locator = resourceLocator(resource.path);
  const separator = resource.identity.indexOf(":");
  const sourceName = resource.identity.slice(0, separator);
  const identityLocator = resource.identity.slice(separator + 1);
  if (separator <= 0 || !sourceName || identityLocator !== locator) {
    throw new Error(
      `Resource identity '${resource.identity}' does not match canonical path '${locator}'.`,
    );
  }
  if (!locator.endsWith(`/${resource.name}`)) {
    throw new Error(
      `Resource name '${resource.name}' does not match canonical path '${locator}'.`,
    );
  }
}
