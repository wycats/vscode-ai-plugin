import type { EvaluationResource, EvaluationSuite } from "../core.ts";

export interface AdapterObservation {
  rawResponse: string;
  transportOutput?: string;
  resourceInvocation?: ResourceInvocation;
  stderr: string;
  durationMs: number;
  exitCode: number | null;
  executionError?: string;
}

export interface ResourceInvocation {
  tool: string;
  resource: string;
  toolUseId: string;
}

export interface AdapterMetadata {
  id: string;
  target: string;
  transport: string;
  pluginName: string;
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
  projectedResourcePath(resource: EvaluationResource): string;
  projectPrompt(suite: EvaluationSuite, canonicalPrompt: string): string;
  execute(projectedPrompt: string, resource: EvaluationResource): AdapterObservation;
}
