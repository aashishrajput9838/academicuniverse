/**
 * ExactMatchComparator.ts
 *
 * Evaluates field-level matching accuracy between Ground Truth and Prediction values.
 */

import { StringDistanceComparator } from './StringDistanceComparator';
import type { FieldComparisonDetail } from '../types/benchmark.types';

export class ExactMatchComparator {
  /**
   * Compare a single key-value pair between expected (GT) and actual (Prediction).
   */
  public static compareField(
    key: string,
    expected: any,
    actual: any,
    numericTolerance: number = 0.01
  ): FieldComparisonDetail {
    // Both missing or null -> Matched
    if (
      (expected === null || expected === undefined || expected === '') &&
      (actual === null || actual === undefined || actual === '')
    ) {
      return {
        field: key,
        expected,
        actual,
        matched: true,
        cer: 0.0,
        wer: 0.0,
      };
    }

    // Handle numbers with tolerance
    if (typeof expected === 'number' || typeof actual === 'number') {
      const num1 = Number(expected);
      const num2 = Number(actual);

      if (!isNaN(num1) && !isNaN(num2)) {
        const diff = Math.abs(num1 - num2);
        const matched = diff <= numericTolerance;
        return {
          field: key,
          expected: num1,
          actual: num2,
          matched,
          cer: matched ? 0.0 : 1.0,
          wer: matched ? 0.0 : 1.0,
        };
      }
    }

    // String comparison with CER and WER computation
    const str1 = String(expected ?? '');
    const str2 = String(actual ?? '');
    const cer = StringDistanceComparator.computeCer(str1, str2);
    const wer = StringDistanceComparator.computeWer(str1, str2);
    const matched = StringDistanceComparator.isExactMatch(str1, str2);

    return {
      field: key,
      expected,
      actual,
      matched,
      cer,
      wer,
    };
  }
}
