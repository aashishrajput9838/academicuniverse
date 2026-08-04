/**
 * CertificateEvaluator.ts
 *
 * Specialized evaluator for Certificate documents.
 */

import { FieldLevelEvaluator } from './FieldLevelEvaluator';
import type { BenchmarkGroundTruth, BenchmarkPrediction, SampleComparisonResult } from '../types/benchmark.types';

export class CertificateEvaluator {
  public static evaluate(
    groundTruth: BenchmarkGroundTruth,
    prediction: BenchmarkPrediction
  ): SampleComparisonResult {
    return FieldLevelEvaluator.evaluateSample(groundTruth, prediction);
  }
}
