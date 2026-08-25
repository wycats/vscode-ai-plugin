import type { EvaluationSuite } from "../core.ts";

export interface AdapterObservation {
  rawResponse: string;
  stderr: string;
  durationMs: number;
  exitCode: number | null;
  executionError?: string;
}

export interface AdapterMetadata {
  id: string;
  target: string;
  transport: string;
  discoveredCommand: string;
  executable: string;
  argumentPrefix: string[];
  runtimeVersion: string;
  projection: string;
  launcherModel: {
    role: string;
    target: string;
  };
  modelMapping: Record<string, string | null>;
}

export interface EvaluationAdapter {
  readonly id: string;
  readonly target: string;
  readonly transport: string;
  prepare(): Promise<AdapterMetadata>;
  projectPrompt(suite: EvaluationSuite, canonicalPrompt: string): string;
  execute(projectedPrompt: string): AdapterObservation;
}
