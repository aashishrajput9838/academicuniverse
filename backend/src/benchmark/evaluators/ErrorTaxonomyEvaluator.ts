/**
 * ErrorTaxonomyEvaluator.ts
 *
 * Categorizes failed comparisons into structured error taxonomy classes:
 * - OCR_ERROR
 * - NORMALIZATION_ERROR
 * - FORMAT_ERROR
 * - HALLUCINATION
 * - FIELD_MISSING
 * - FIELD_EXTRA
 * - PARTIAL_MATCH
 * - LOW_CONFIDENCE
 * - CATEGORY_ERROR
 */

import type { ErrorCategory, FieldComparisonDetail } from '../types/benchmark.types';

export class ErrorTaxonomyEvaluator {
  /**
   * Assign error category for a single mismatched field comparison.
   */
  public static classifyFieldError(
    cmp: FieldComparisonDetail,
    confidenceScore: number = 1.0
  ): ErrorCategory {
    if (cmp.matched) {
      return 'LOW_CONFIDENCE'; // Default if matched but confidence low
    }

    const exp = cmp.expected;
    const act = cmp.actual;
    const cer = cmp.cer ?? 1.0;

    // 1. Missing field in prediction
    if ((exp !== null && exp !== undefined && exp !== '') && (act === null || act === undefined || act === '')) {
      return 'FIELD_MISSING';
    }

    // 2. Extra field in prediction (hallucination/unrequested field)
    if ((exp === null || exp === undefined || exp === '') && (act !== null && act !== undefined && act !== '')) {
      return 'HALLUCINATION';
    }

    // 3. Category level error
    if (cmp.field === 'documentCategory') {
      return 'CATEGORY_ERROR';
    }

    // 4. Low confidence error flag
    if (confidenceScore < 0.70) {
      return 'LOW_CONFIDENCE';
    }

    // 5. Date / Number format error
    const lowerField = cmp.field.toLowerCase();
    if (lowerField.includes('issuedate') || lowerField.includes('birthdate') || lowerField.includes('dob') || lowerField.includes('gpa') || lowerField.includes('cgpa')) {
      return 'FORMAT_ERROR';
    }

    // 6. Partial match vs OCR error
    if (cer > 0.0 && cer <= 0.50) {
      return 'PARTIAL_MATCH';
    }

    if (cer > 0.50) {
      return 'OCR_ERROR';
    }

    return 'NORMALIZATION_ERROR';
  }
}
