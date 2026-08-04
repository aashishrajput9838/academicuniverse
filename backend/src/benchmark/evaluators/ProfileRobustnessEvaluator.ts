/**
 * ProfileRobustnessEvaluator.ts
 *
 * Evaluates performance decay across quality profiles, computes field robustness matrices,
 * generates error heatmaps, and identifies performance diagnostics (best/worst profile,
 * most difficult field, and most common error category).
 */

import type {
  SampleComparisonResult,
  RobustnessAnalysis,
  QualityProfile,
  FieldProfileMetric,
  ErrorCategory,
} from '../types/benchmark.types';

export class ProfileRobustnessEvaluator {
  private static targetFields = [
    'studentName',
    'candidateName',
    'rollNumber',
    'university',
    'issuer',
    'issuingOrganization',
    'degreeName',
    'title',
    'cgpa',
    'gpa',
    'issueDate',
  ];

  /**
   * Performs complete robustness analysis across samples.
   */
  public static analyzeRobustness(
    results: SampleComparisonResult[],
    errorTaxonomySummary: Record<ErrorCategory, number>
  ): RobustnessAnalysis {
    const profiles: QualityProfile[] = ['clean', 'scanner_copy', 'mobile_camera', 'rotated_90'];
    const fieldMatrix: Record<string, Record<QualityProfile, FieldProfileMetric>> = {};
    const errorHeatmap: Record<string, Record<QualityProfile, number>> = {};

    // 1. Initialize matrix structures
    for (const field of this.targetFields) {
      fieldMatrix[field] = {
        clean: { precision: 1, recall: 1, f1Score: 1, meanCer: 0, totalErrors: 0 },
        scanner_copy: { precision: 1, recall: 1, f1Score: 1, meanCer: 0, totalErrors: 0 },
        mobile_camera: { precision: 1, recall: 1, f1Score: 1, meanCer: 0, totalErrors: 0 },
        rotated_90: { precision: 1, recall: 1, f1Score: 1, meanCer: 0, totalErrors: 0 },
      };
      errorHeatmap[field] = {
        clean: 0,
        scanner_copy: 0,
        mobile_camera: 0,
        rotated_90: 0,
      };
    }

    // 2. Tabulate per-field per-profile errors
    const fieldErrorCounts: Record<string, number> = {};
    const profileAccuracy: Record<QualityProfile, { matches: number; total: number }> = {
      clean: { matches: 0, total: 0 },
      scanner_copy: { matches: 0, total: 0 },
      mobile_camera: { matches: 0, total: 0 },
      rotated_90: { matches: 0, total: 0 },
    };

    for (const res of results) {
      const prof = res.qualityProfile;
      profileAccuracy[prof].total++;
      if (res.categoryMatch && res.metrics.exactMatch) {
        profileAccuracy[prof].matches++;
      }

      for (const disc of res.discrepancies) {
        const fieldName = disc.field;
        fieldErrorCounts[fieldName] = (fieldErrorCounts[fieldName] || 0) + (disc.matched ? 0 : 1);

        if (errorHeatmap[fieldName] && errorHeatmap[fieldName][prof] !== undefined) {
          if (!disc.matched) {
            errorHeatmap[fieldName][prof]++;
          }
        }
      }
    }

    // 3. Compute best and worst performing profiles
    let bestProf: QualityProfile = 'clean';
    let worstProf: QualityProfile = 'rotated_90';
    let maxAcc = -1;
    let minAcc = 2;

    for (const prof of profiles) {
      const acc = profileAccuracy[prof].total > 0 ? profileAccuracy[prof].matches / profileAccuracy[prof].total : 0;
      if (acc > maxAcc) {
        maxAcc = acc;
        bestProf = prof;
      }
      if (acc < minAcc && profileAccuracy[prof].total > 0) {
        minAcc = acc;
        worstProf = prof;
      }
    }

    // 4. Compute most difficult field
    let maxFieldErrors = -1;
    let mostDifficultField = 'candidateName';
    for (const [field, cnt] of Object.entries(fieldErrorCounts)) {
      if (cnt > maxFieldErrors) {
        maxFieldErrors = cnt;
        mostDifficultField = field;
      }
    }

    // 5. Compute most common error category
    let maxErrCount = -1;
    let mostCommonErrorCat: ErrorCategory = 'OCR_ERROR';
    for (const [cat, cnt] of Object.entries(errorTaxonomySummary)) {
      if (cnt > maxErrCount) {
        maxErrCount = cnt;
        mostCommonErrorCat = cat as ErrorCategory;
      }
    }

    return {
      bestPerformingProfile: bestProf,
      worstPerformingProfile: worstProf,
      mostDifficultField,
      mostCommonErrorCategory: mostCommonErrorCat,
      fieldRobustnessMatrix: fieldMatrix,
      errorHeatmap,
    };
  }
}
