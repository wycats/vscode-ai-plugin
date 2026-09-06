import { lstat, realpath } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

async function exists(path: string): Promise<boolean> {
  try {
    await lstat(path);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}

export async function validateReportPath(root: string, output: string): Promise<void> {
  root = resolve(root);
  const reportRoot = join(root, ".runtime", "evals");
  const path = resolve(output);
  const local = relative(reportRoot, path);
  if (!local || local === ".." || local.startsWith(`..${sep}`) || isAbsolute(local)) {
    throw new Error("Evaluation output must be a new file under .runtime/evals/.");
  }
  if (await exists(path)) {
    throw new Error("Evaluation output already exists; choose a new report filename.");
  }
  const physicalRoot = await realpath(root);
  for (let parent = dirname(path); parent !== root; parent = dirname(parent)) {
    if (await exists(parent)) {
      if ((await realpath(parent)) !== join(physicalRoot, relative(root, parent))) {
        throw new Error("Evaluation output directories must not redirect through symlinks.");
      }
    }
  }
}
