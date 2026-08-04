/**
 * StudentIdEvaluator.ts
 *
 * Specialized evaluator for Student ID Card documents.
 */

import { FieldLevelEvaluator } from './FieldLevelEvaluator';
import type { BenchmarkGroundTruth, BenchmarkPrediction, SampleComparisonResult } from '../types/benchmark.types';

export class StudentIdEvaluator {
  public static evaluate(
    groundTruth: BenchmarkGroundTruth,
    prediction: BenchmarkPrediction
  ): SampleComparisonResult {
    return FieldLevelEvaluator.evaluateSample(groundTruth, prediction);
  }
}
