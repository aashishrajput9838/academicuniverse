/**
 * Academic Universe — Metrics Calculator Unit Tests
 * Tests canonical TP/FP/FN/precision/recall/F1 computation.
 */

import { computeFieldMetrics, validateFieldMetrics, validateMetricEquations } from '../../metrics/metricsCalculator';
import { FieldMatchResult } from '../../types/benchmark.types';

describe('MetricsCalculator', () => {
  describe('computeFieldMetrics', () => {
    it('should compute perfect metrics when all fields match', () => {
      const fieldMatches: FieldMatchResult[] = [
        { fieldName: 'studentName', expected: 'Alice', actual: 'Alice', isMatch: true, matchScore: 1.0 },
        { fieldName: 'rollNumber', expected: '001', actual: '001', isMatch: true, matchScore: 1.0 },
        { fieldName: 'sgpa', expected: 8.5, actual: 8.5, isMatch: true, matchScore: 1.0 },
        { fieldName: 'courseMarks', expected: [], actual: [], isMatch: true, matchScore: 1.0 },
      ];

      const result = computeFieldMetrics(fieldMatches);
      expect(result.tp).toBe(4);
      expect(result.fp).toBe(0);
      expect(result.fn).toBe(0);
      expect(result.precision).toBeCloseTo(1.0);
      expect(result.recall).toBeCloseTo(1.0);
      expect(result.f1).toBeCloseTo(1.0);
    });

    it('should compute metrics when some fields mismatch with actual values', () => {
      const fieldMatches: FieldMatchResult[] = [
        { fieldName: 'studentName', expected: 'Alice', actual: 'Alice', isMatch: true, matchScore: 1.0 },
        { fieldName: 'rollNumber', expected: '001', actual: '002', isMatch: false, matchScore: 0.5 },
        { fieldName: 'sgpa', expected: 8.5, actual: null, isMatch: false, matchScore: 0.0 },
      ];

      const result = computeFieldMetrics(fieldMatches);
      expect(result.tp).toBe(1);
      expect(result.fp).toBe(1);  // actual !== null
      expect(result.fn).toBe(1);  // actual === null
      expect(result.precision).toBeCloseTo(0.5);
      expect(result.recall).toBeCloseTo(0.5);
      expect(result.f1).toBeCloseTo(0.5);
    });

    it('should handle empty fieldMatches', () => {
      const result = computeFieldMetrics([]);
      expect(result.tp).toBe(0);
      expect(result.fp).toBe(0);
      expect(result.fn).toBe(0);
      expect(result.precision).toBeCloseTo(0);
      expect(result.recall).toBeCloseTo(0);
      expect(result.f1).toBeCloseTo(0);
    });

    it('should handle all mismatches with actual values', () => {
      const fieldMatches: FieldMatchResult[] = [
        { fieldName: 'f1', expected: 'a', actual: 'b', isMatch: false, matchScore: 0.0 },
        { fieldName: 'f2', expected: 'c', actual: 'd', isMatch: false, matchScore: 0.0 },
      ];

      const result = computeFieldMetrics(fieldMatches);
      expect(result.tp).toBe(0);
      expect(result.fp).toBe(2);
      expect(result.fn).toBe(0);
      expect(result.precision).toBeCloseTo(0);
      expect(result.recall).toBeCloseTo(0);
      expect(result.f1).toBeCloseTo(0);
    });

    it('should handle all false negatives', () => {
      const fieldMatches: FieldMatchResult[] = [
        { fieldName: 'f1', expected: 'a', actual: null, isMatch: false, matchScore: 0.0 },
        { fieldName: 'f2', expected: 'b', actual: undefined, isMatch: false, matchScore: 0.0 },
      ];

      const result = computeFieldMetrics(fieldMatches);
      expect(result.tp).toBe(0);
      expect(result.fp).toBe(0);
      expect(result.fn).toBe(2);
      expect(result.precision).toBeCloseTo(0);
      expect(result.recall).toBeCloseTo(0);
      expect(result.f1).toBeCloseTo(0);
    });

    it('should compute F1 correctly for known values', () => {
      // TP=3, FP=1, FN=1 => P=0.75, R=0.75, F1=0.75
      const fieldMatches: FieldMatchResult[] = [
        { fieldName: 'f1', expected: 'a', actual: 'a', isMatch: true, matchScore: 1.0 },
        { fieldName: 'f2', expected: 'b', actual: 'b', isMatch: true, matchScore: 1.0 },
        { fieldName: 'f3', expected: 'c', actual: 'c', isMatch: true, matchScore: 1.0 },
        { fieldName: 'f4', expected: 'd', actual: 'x', isMatch: false, matchScore: 0.0 },
        { fieldName: 'f5', expected: 'e', actual: null, isMatch: false, matchScore: 0.0 },
      ];

      const result = computeFieldMetrics(fieldMatches);
      expect(result.tp).toBe(3);
      expect(result.fp).toBe(1);
      expect(result.fn).toBe(1);
      expect(result.precision).toBeCloseTo(0.75);
      expect(result.recall).toBeCloseTo(0.75);
      expect(result.f1).toBeCloseTo(0.75);
    });
  });

  describe('validateFieldMetrics', () => {
    it('should return null for valid metrics', () => {
      const fieldMatches: FieldMatchResult[] = [
        { fieldName: 'f1', expected: 'a', actual: 'a', isMatch: true, matchScore: 1.0 },
        { fieldName: 'f2', expected: 'b', actual: null, isMatch: false, matchScore: 0.0 },
      ];
      const stored = { truePositives: 1, falsePositives: 0, falseNegatives: 1, precision: 1.0, recall: 0.5, f1Score: 0.6667 };
      const error = validateFieldMetrics(fieldMatches, stored);
      expect(error).toBeNull();
    });

    it('should return error for mismatched TP', () => {
      const fieldMatches: FieldMatchResult[] = [
        { fieldName: 'f1', expected: 'a', actual: 'a', isMatch: true, matchScore: 1.0 },
      ];
      const stored = { truePositives: 0, falsePositives: 0, falseNegatives: 1, precision: 0, recall: 0, f1Score: 0 };
      const error = validateFieldMetrics(fieldMatches, stored);
      expect(error).toContain('TP mismatch');
    });
  });

  describe('validateMetricEquations', () => {
    it('should return null for valid equations', () => {
      expect(validateMetricEquations(0.8, 0.9, 0.847)).toBeNull();
    });

    it('should return error for invalid F1', () => {
      expect(validateMetricEquations(0.8, 0.9, 0.5)).toContain('F1 equation violated');
    });
  });
});
