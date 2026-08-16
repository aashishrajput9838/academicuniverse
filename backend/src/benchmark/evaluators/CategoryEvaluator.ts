/**
 * CategoryEvaluator.ts
 *
 * Evaluates document classification accuracy and category mapping alignment.
 */

import type { BenchmarkGroundTruth, BenchmarkPrediction } from '../types/benchmark.types';

export class CategoryEvaluator {
  private static categoryNormalizationMap: Record<string, string> = {
    certificate: 'CERTIFICATE',
    marksheet: 'MARKSHEET',
    student_id: 'IDENTITY_CARD',
    CERTIFICATE: 'CERTIFICATE',
    MARKSHEET: 'MARKSHEET',
    TRANSCRIPT: 'MARKSHEET',
    IDENTITY_CARD: 'IDENTITY_CARD',
    STUDENT_ID: 'IDENTITY_CARD',
  };

  /**
   * Normalizes category string to canonical format.
   */
  public static normalizeCategory(cat: string): string {
    if (!cat) return 'UNKNOWN';
    return this.categoryNormalizationMap[cat] || this.categoryNormalizationMap[cat.toLowerCase()] || cat.toUpperCase();
  }

  /**
   * Evaluates if predicted category matches expected ground truth document category.
   */
  public static evaluateCategoryMatch(
    groundTruth: BenchmarkGroundTruth,
    prediction: BenchmarkPrediction
  ): boolean {
    const expectedNorm = this.normalizeCategory(groundTruth.documentType);
    const actualNorm = this.normalizeCategory(prediction.documentCategory);

    return expectedNorm === actualNorm;
  }
}
