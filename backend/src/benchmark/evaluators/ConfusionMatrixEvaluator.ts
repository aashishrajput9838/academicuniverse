/**
 * ConfusionMatrixEvaluator.ts
 *
 * Computes document classification confusion matrix across categories.
 */

import { CategoryEvaluator } from './CategoryEvaluator';
import type { SampleComparisonResult, ConfusionMatrixEntry } from '../types/benchmark.types';

export class ConfusionMatrixEvaluator {
  public static computeConfusionMatrix(results: SampleComparisonResult[]): ConfusionMatrixEntry[] {
    const counts: Record<string, number> = {};

    for (const res of results) {
      const exp = CategoryEvaluator.normalizeCategory(res.documentType);
      const pred = CategoryEvaluator.normalizeCategory(res.predictionSummary.category);
      const key = `${exp}__${pred}`;
      counts[key] = (counts[key] || 0) + 1;
    }

    const matrix: ConfusionMatrixEntry[] = [];
    for (const [key, count] of Object.entries(counts)) {
      const [exp, pred] = key.split('__');
      matrix.push({
        expectedCategory: exp,
        predictedCategory: pred,
        count,
      });
    }

    return matrix.sort((a, b) => a.expectedCategory.localeCompare(b.expectedCategory));
  }
}
