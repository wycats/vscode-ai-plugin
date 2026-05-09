import { readdir } from "node:fs/promises";
import { join, relative } from "node:path";

export const RESOURCE_SECTIONS = [
  "agents",
  "skills",
  "instructions",
  "hooks",
] as const;

export type ResourceSection = (typeof RESOURCE_SECTIONS)[number];

export interface DiscoveredResource {
  section: ResourceSection;
  sourcePath: string;
  pluginPath: string;
}

interface ResourcePattern {
  directory: ResourceSection;
  pattern: RegExp;
}

const RESOURCE_PATTERNS = {
  agents: { directory: "agents", pattern: /\.agent\.md$/ },
  skills: { directory: "skills", pattern: /^SKILL\.md$/ },
  instructions: { directory: "instructions", pattern: /\.instructions\.md$/ },
  hooks: { directory: "hooks", pattern: /\.json$/ },
} satisfies Record<ResourceSection, ResourcePattern>;

export async function findFiles(
  dir: string,
  pattern: RegExp,
): Promise<string[]> {
  const results: string[] = [];

  try {
    const entries = (await readdir(dir, { withFileTypes: true })).sort((a, b) =>
      a.name.localeCompare(b.name),
    );

    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...(await findFiles(full, pattern)));
      } else {
        pattern.lastIndex = 0;
        if (pattern.test(entry.name)) {
          results.push(full);
        }
      }
    }
  } catch {
    return [];
  }

  return results;
}

export async function discoverResourceFiles(
  root: string,
): Promise<Record<ResourceSection, DiscoveredResource[]>> {
  const resources: Record<ResourceSection, DiscoveredResource[]> = {
    agents: [],
    skills: [],
    instructions: [],
    hooks: [],
  };

  for (const section of RESOURCE_SECTIONS) {
    const { directory, pattern } = RESOURCE_PATTERNS[section];
    const files = await findFiles(join(root, directory), pattern);
    resources[section] = files.map((sourcePath) => ({
      section,
      sourcePath,
      pluginPath: `./${relative(root, sourcePath)}`,
    }));
  }

  return resources;
}