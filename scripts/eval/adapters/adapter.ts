import type { EvaluationSuite } from "../core.ts";

export interface AdapterObservation {
  rawResponse: string;
  durationMs: number;
}

export interface AdapterMetadata {
  id: string;
  executable: string;
  runtimeVersion: string;
  projection: string;
  modelMapping: Record<string, string | null>;
}

export interface EvaluationAdapter {
  readonly id: string;
  prepare(): Promise<AdapterMetadata>;
  projectPrompt(suite: EvaluationSuite, canonicalPrompt: string): string;
  execute(projectedPrompt: string): AdapterObservation;
}
