/**
 * Academic Universe — Benchmark Validator Unit Tests
 * Tests validation of document-level and aggregate-level invariants.
 */

import { BenchmarkValidator } from '../../validation/benchmarkValidator';
import { DocumentEvaluationResult, FieldMatchResult } from '../../types/benchmark.types';
import { AggregateMetrics } from '../../types/benchmark.types';

describe('BenchmarkValidator', () => {
  let validator: BenchmarkValidator;

  beforeEach(() => {
    validator = new BenchmarkValidator();
  });

  function createFieldMatches(count: number, matchCount: number): FieldMatchResult[] {
    const matches: FieldMatchResult[] = [];
    for (let i = 0; i < count; i++) {
      matches.push({
        fieldName: `field${i}`,
        expected: `expected${i}`,
        actual: i < matchCount ? `expected${i}` : `wrong${i}`,
        isMatch: i < matchCount,
        matchScore: i < matchCount ? 1.0 : 0.0,
      });
    }
    return matches;
  }

  function createResult(fieldCount: number, matchCount: number, overrides: Partial<DocumentEvaluationResult> = {}): DocumentEvaluationResult {
    const fieldMatches = createFieldMatches(fieldCount, matchCount);
    const { tp, fp, fn } = validator['computeMetricsFromFieldMatches'](fieldMatches);
    const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
    const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
    const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

    return {
      experimentId: 'EXP-TEST',
      documentId: 'DOC-001',
      category: 'MARKSHEET',
      systemId: 'SYS-PROP',
      timestamp: '2026-07-29T00:00:00.000Z',
      primaryProvider: 'gemini',
      fallbackTriggered: false,
      fallbackProvider: null,
      latencyMs: { uploadMs: 100, aiInferenceMs: 2000, dbStagingMs: 100, totalPipelineMs: 2200 },
      fieldMatches,
      fieldScores: { truePositives: tp, falsePositives: fp, falseNegatives: fn, precision, recall, f1Score: f1 },
      hitlMetrics: { reviewRequired: true, reviewDurationSec: 5, fieldsCorrected: 1, finalAction: 'APPROVED' },
      success: true,
      ...overrides,
    };
  }

  describe('validateDocument', () => {
    it('should pass for a valid document', () => {
      const result = createResult(7, 7);
      const validation = validator.validateDocument(result);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should fail when stored TP does not match computed TP', () => {
      const result = createResult(7, 5);
      result.fieldScores.truePositives = 99; // wrong
      const validation = validator.validateDocument(result);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.field === 'truePositives')).toBe(true);
    });

    it('should fail when TP+FP+FN does not equal fieldMatches count', () => {
      const result = createResult(7, 5);
      result.fieldScores.falseNegatives = 99; // wrong
      const validation = validator.validateDocument(result);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.field === 'falseNegatives' || e.violation.includes('TP+FP+FN'))).toBe(true);
    });

    it('should fail when precision equation is violated', () => {
      const result = createResult(7, 5);
      result.fieldScores.precision = 0.999; // wrong
      const validation = validator.validateDocument(result);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.field === 'precision')).toBe(true);
    });

    it('should fail when latency total does not match components', () => {
      const result = createResult(7, 7);
      result.latencyMs.totalPipelineMs = 9999; // wrong
      const validation = validator.validateDocument(result);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.field === 'latencyMs.totalPipelineMs')).toBe(true);
    });

    it('should fail when fieldsCorrected > 0 but reviewDurationSec = 0', () => {
      const result = createResult(7, 7);
      result.hitlMetrics = { reviewRequired: false, reviewDurationSec: 0, fieldsCorrected: 1, finalAction: 'APPROVED' };
      const validation = validator.validateDocument(result);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.violation.includes('Corrections require'))).toBe(true);
    });

    it('should fail when fallbackTriggered but fallbackProvider is null', () => {
      const result = createResult(7, 7);
      result.fallbackTriggered = true;
      result.fallbackProvider = null;
      const validation = validator.validateDocument(result);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.field === 'fallbackProvider')).toBe(true);
    });

    it('should skip validation for failed documents', () => {
      const result = createResult(7, 7, { success: false, errorMessage: 'timeout' });
      const validation = validator.validateDocument(result);
      expect(validation.isValid).toBe(true);
    });
  });

  describe('validateAggregates', () => {
    it('should pass when aggregates match per-document sums', () => {
      const results = [
        createResult(7, 7, { documentId: 'DOC-1' }),
        createResult(7, 5, { documentId: 'DOC-2' }),
      ];

      const metricsEngine = new (require('../../metrics/metricsEngine').MetricsEngine)();
      const aggregates = metricsEngine.computeAggregate(results);

      const validation = validator.validateAggregates(results, aggregates);
      expect(validation.isValid).toBe(true);
    });

    it('should fail when aggregate precision does not match recomputed value', () => {
      const results = [
        createResult(7, 7, { documentId: 'DOC-1' }),
      ];

      const aggregates: AggregateMetrics = {
        totalDocuments: 1,
        successfulEvaluations: 1,
        failedEvaluations: 0,
        overallPrecision: 0.5, // wrong
        overallRecall: 1.0,
        overallF1Score: 0.666,
        latencyStats: { meanMs: 2200, medianMs: 2200, p95Ms: 2200, p99Ms: 2200, minMs: 2200, maxMs: 2200 },
        fallbackMetrics: { totalFallbackAttempts: 0, successfulFallbacks: 0, fallbackRecoveryRate: 0 },
        hitlMetrics: {
          totalDocsWithReview: 1,
          totalDocsWithCorrections: 1,
          totalReviewDurationSec: 5,
          meanReviewDurationSec: 5,
          totalFieldsCorrected: 1,
          humanCorrectionRate: 0
        },
        categoryBreakdown: {
          MARKSHEET: { count: 1, precision: 1.0, recall: 1.0, f1Score: 1.0, meanLatencyMs: 2200 },
        } as any,
      };

      const validation = validator.validateAggregates(results, aggregates);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.field === 'overallPrecision')).toBe(true);
    });
  });

  describe('computeMetricsFromFieldMatches', () => {
    it('should compute correct metrics for 7-field document', () => {
      // 5 matches, 1 FP (wrong value), 1 FN (missing)
      const fieldMatches: FieldMatchResult[] = [
        { fieldName: 'studentName', expected: 'A', actual: 'A', isMatch: true, matchScore: 1.0 },
        { fieldName: 'rollNumber', expected: '001', actual: '001', isMatch: true, matchScore: 1.0 },
        { fieldName: 'semester', expected: '1', actual: '1', isMatch: true, matchScore: 1.0 },
        { fieldName: 'sgpa', expected: 8, actual: 8, isMatch: true, matchScore: 1.0 },
        { fieldName: 'cgpa', expected: 8, actual: 8, isMatch: true, matchScore: 1.0 },
        { fieldName: 'issueDate', expected: '2024-01-01', actual: '2024-01-01', isMatch: true, matchScore: 1.0 },
        { fieldName: 'courseMarks', expected: [], actual: [{}], isMatch: false, matchScore: 0.0 },
      ];

      const metrics = validator.computeMetricsFromFieldMatches(fieldMatches);
      expect(metrics.tp).toBe(6);
      expect(metrics.fp).toBe(1); // actual !== null/undefined
      expect(metrics.fn).toBe(0);
      expect(metrics.precision).toBeCloseTo(6 / 7);
      expect(metrics.recall).toBeCloseTo(1.0);
      expect(metrics.f1).toBeCloseTo(12 / 13);
    });
  });
});
