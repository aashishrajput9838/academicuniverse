/**
 * MarksheetEvaluator.ts
 *
 * Specialized evaluator for Marksheet & Transcript documents.
 */

import { FieldLevelEvaluator } from './FieldLevelEvaluator';
import type { BenchmarkGroundTruth, BenchmarkPrediction, SampleComparisonResult } from '../types/benchmark.types';

export class MarksheetEvaluator {
  public static evaluate(
    groundTruth: BenchmarkGroundTruth,
    prediction: BenchmarkPrediction
  ): SampleComparisonResult {
    return FieldLevelEvaluator.evaluateSample(groundTruth, prediction);
  }
}
