/**
 * FieldLevelEvaluator.ts
 *
 * Evaluates field-by-field extraction performance between Ground Truth and Prediction.
 */

import { CategoryEvaluator } from './CategoryEvaluator';
import { ExactMatchComparator } from '../comparators/ExactMatchComparator';
import { SubjectArrayComparator } from '../comparators/SubjectArrayComparator';
import { CanonicalNormalizer } from '../normalizers/CanonicalNormalizer';
import { ErrorTaxonomyEvaluator } from './ErrorTaxonomyEvaluator';
import type {
  BenchmarkGroundTruth,
  BenchmarkPrediction,
  SampleComparisonResult,
  FieldComparisonDetail,
} from '../types/benchmark.types';

export class FieldLevelEvaluator {
  /**
   * Evaluate a single sample prediction against its ground truth.
   */
  public static evaluateSample(
    groundTruth: BenchmarkGroundTruth,
    prediction: BenchmarkPrediction
  ): SampleComparisonResult {
    const categoryMatch = CategoryEvaluator.evaluateCategoryMatch(groundTruth, prediction);
    const discrepancies: FieldComparisonDetail[] = [];

    let totalFields = 0;
    let matchedFields = 0;

    let totalCerSum = 0;
    let totalWerSum = 0;

    // Apply Canonical Normalization Layer to expected (GT) and actual (Prediction)
    const canonicalGt = CanonicalNormalizer.normalizeFields(groundTruth.extractedFields);
    const canonicalPred = CanonicalNormalizer.normalizeFields({
      ...prediction.extractedEntities,
      ...prediction.candidateFields,
    });

    // Evaluate scalar fields over canonical representations
    for (const [key, expVal] of Object.entries(canonicalGt)) {
      totalFields++;
      const actVal = canonicalPred[key];

      const cmp = ExactMatchComparator.compareField(key, expVal, actVal);
      if (!cmp.matched) {
        cmp.errorCategory = ErrorTaxonomyEvaluator.classifyFieldError(cmp, prediction.confidenceScore);
      }
      discrepancies.push(cmp);

      if (cmp.matched) {
        matchedFields++;
      }

      totalCerSum += cmp.cer ?? (cmp.matched ? 0.0 : 1.0);
      totalWerSum += cmp.wer ?? (cmp.matched ? 0.0 : 1.0);
    }

    // Evaluate subject array if present (e.g. for marksheets)
    if (groundTruth.subjects && groundTruth.subjects.length > 0) {
      const actualSubjects = canonicalPred.subjects || [];
      const subRes = SubjectArrayComparator.compareSubjects(groundTruth.subjects, actualSubjects);

      discrepancies.push(...subRes.details);

      totalFields += subRes.details.length;
      matchedFields += subRes.details.filter(d => d.matched).length;

      for (const d of subRes.details) {
        totalCerSum += d.cer ?? (d.matched ? 0.0 : 1.0);
        totalWerSum += d.wer ?? (d.matched ? 0.0 : 1.0);
      }
    }

    const precision = totalFields > 0 ? matchedFields / totalFields : 0.0;
    const recall = totalFields > 0 ? matchedFields / totalFields : 0.0;
    const f1Score = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0.0;

    const meanCer = totalFields > 0 ? totalCerSum / totalFields : 0.0;
    const meanWer = totalFields > 0 ? totalWerSum / totalFields : 0.0;
    const exactMatch = matchedFields === totalFields && totalFields > 0;

    return {
      sampleId: groundTruth.sampleId,
      documentType: groundTruth.documentType,
      qualityProfile: groundTruth.qualityProfile,
      categoryMatch,
      predictionConfidence: prediction.confidenceScore,
      metrics: {
        cer: meanCer,
        wer: meanWer,
        exactMatch,
        precision,
        recall,
        f1Score,
        matchedFieldsCount: matchedFields,
        totalFieldsCount: totalFields,
      },
      discrepancies,
      groundTruthSummary: {
        category: groundTruth.documentType,
        fieldsCount: totalFields,
      },
      predictionSummary: {
        category: prediction.documentCategory,
        confidence: prediction.confidenceScore,
        fieldsCount: Object.keys(canonicalPred).length,
      },
    };
  }

  private static camelCase(str: string): string {
    return str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
  }
}
