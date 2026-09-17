import { lstat, mkdir, readdir, realpath, rm } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import {
  formatCompositionDiagnostics,
  validateProjectionCompleteness,
  type CanonicalComposition,
} from "./resource-composition.ts";

async function physicalDestination(path: string): Promise<string> {
  try {
    return await realpath(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    const parent = dirname(path);
    if (parent === path) throw error;
    return join(await physicalDestination(parent), basename(path));
  }
}

function contains(parent: string, child: string): boolean {
  const path = relative(parent, child);
  return path === "" || (path !== ".." && !path.startsWith(`..${sep}`) && !isAbsolute(path));
}

/** Overrides are fresh, external scratch destinations; normal out/<target> builds
 * retain their established replacement behavior. Resolve symlinked parents too. */
export async function assertSafeOutputOverride(root: string, output: string): Promise<void> {
  const source = await realpath(root);
  const destination = await physicalDestination(resolve(output));
  if (contains(source, destination) || contains(destination, source)) {
    throw new Error("--output must be outside the source checkout and its ancestors");
  }
  try {
    const stat = await lstat(output);
    if (stat.isSymbolicLink() || !stat.isDirectory() || (await readdir(output)).length > 0) {
      throw new Error("--output must name an empty directory or a new path, not a symlink or existing data");
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

interface PrepareProjectionOutputOptions {
  outDir: string;
  legacyOutDir?: string;
  target: string;
  composition: CanonicalComposition;
  outputBySourcePath: ReadonlyMap<string, string>;
}

/**
 * Cross the generated-output effect boundary only after target projection
 * completeness has passed. Keeping preflight and cleanup in one function makes
 * their ordering testable with a sentinel output directory.
 */
export async function prepareProjectionOutput({
  outDir,
  legacyOutDir,
  target,
  composition,
  outputBySourcePath,
}: PrepareProjectionOutputOptions): Promise<void> {
  const diagnostics = validateProjectionCompleteness(
    composition,
    outputBySourcePath,
    target,
  );
  if (diagnostics.length > 0) {
    throw new Error(
      `Target projection validation failed before output cleanup:\n${formatCompositionDiagnostics(diagnostics)}`,
    );
  }

  if (legacyOutDir) {
    await rm(legacyOutDir, { recursive: true, force: true });
  }
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });
}
