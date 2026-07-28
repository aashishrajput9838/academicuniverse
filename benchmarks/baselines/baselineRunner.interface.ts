/**
 * Academic Universe — Baseline Runner Interface & Implementations
 * Every runner exposes the same IBaselineRunner interface for uniform orchestration.
 */

import { ExtractionPrediction, BaselineSystemId } from '../types/benchmark.types';

export interface RunnerInput {
  documentId: string;
  fileBuffer: Buffer;
  fileFormat: string;
  mimeType: string;
}

export interface RunnerOutput {
  systemId: BaselineSystemId;
  prediction: ExtractionPrediction;
  primaryProvider: string;
  fallbackTriggered: boolean;
  fallbackProvider: string | null;
  latencyMs: {
    uploadMs: number;
    aiInferenceMs: number;
    dbStagingMs: number;
    totalPipelineMs: number;
  };
  rawResponse?: string;
  errorMessage?: string;
}

/**
 * Common interface that every baseline system must implement.
 */
export interface IBaselineRunner {
  readonly systemId: BaselineSystemId;
  readonly displayName: string;
  initialize(): Promise<void>;
  extract(input: RunnerInput): Promise<RunnerOutput>;
  shutdown(): Promise<void>;
}
