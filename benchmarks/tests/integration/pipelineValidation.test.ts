/**
 * Academic Universe — Integration Tests
 * End-to-end validation of the benchmark pipeline.
 * Verifies that the complete pipeline produces mathematically consistent artifacts.
 */

import { DatasetLoader } from '../../dataset/datasetLoader';
import { GroundTruthEngine } from '../../ground-truth/groundTruthEngine';
import { FieldComparisonEngine, CourseMarksComparisonMode } from '../../evaluators/fieldComparisonEngine';
import { computeFieldMetrics } from '../../metrics/metricsCalculator';
import { MetricsEngine } from '../../metrics/metricsEngine';
import { BenchmarkValidator } from '../../validation/benchmarkValidator';
import { DocumentEvaluationResult, BaselineSystemId, FieldMatchResult, AggregateMetrics } from '../../types/benchmark.types';
import { loadBenchmarkConfig, BenchmarkConfig } from '../../config/benchmark.config';
import path from 'path';

describe('Benchmark Pipeline Integration', () => {
  const config = loadBenchmarkConfig({
    experimentId: 'EXP-INTEGRATION-TEST',
  });

  const datasetDir = path.join(__dirname, '../../synthetic-dataset-5/documents');
  const groundTruthDir = path.join(__dirname, '../../synthetic-dataset-5/ground-truth');

  let validator: BenchmarkValidator;
  let metricsEngine: MetricsEngine;

  beforeEach(() => {
    validator = new BenchmarkValidator();
    metricsEngine = new MetricsEngine();
  });

  describe('End-to-end consistency', () => {
    it('should validate a complete document evaluation with PER_ARRAY mode', () => {
      const engine = new FieldComparisonEngine({
        numericTolerancePct: 0.01,
        courseMarksMode: CourseMarksComparisonMode.PER_ARRAY,
      });

      const expected = {
        studentName: 'Alice',
        rollNumber: '001',
        semester: '1',
        sgpa: 8.5,
        cgpa: 8.0,
        issueDate: '2024-01-01',
        courseMarks: [
          { courseCode: 'CS101', courseName: 'Math', marksObtained: 90, maxMarks: 100 },
          { courseCode: 'CS102', courseName: 'Physics', marksObtained: 85, maxMarks: 100 },
        ],
      };

      const actual = {
        studentName: 'Alice',
        rollNumber: '001',
        semester: '1',
        sgpa: 8.5,
        cgpa: 8.0,
        issueDate: '2024-01-01',
        courseMarks: [
          { courseCode: 'CS101', courseName: 'Math', marksObtained: 90, maxMarks: 100 },
          { courseCode: 'CS102', courseName: 'Physics', marksObtained: 85, maxMarks: 100 },
        ],
      };

      const fieldMatches = engine.compareAll(expected, actual, [
        'studentName', 'rollNumber', 'semester', 'sgpa', 'cgpa', 'issueDate'
      ]);

      // Verify field count is 7 (not 7 + N courses)
      expect(fieldMatches).toHaveLength(7);

      // Compute metrics from fieldMatches
      const computed = computeFieldMetrics(fieldMatches);
      expect(computed.tp).toBe(7);
      expect(computed.fp).toBe(0);
      expect(computed.fn).toBe(0);
      expect(computed.precision).toBeCloseTo(1.0);
      expect(computed.recall).toBeCloseTo(1.0);
      expect(computed.f1).toBeCloseTo(1.0);

      // Create DocumentEvaluationResult
      const result: DocumentEvaluationResult = {
        experimentId: 'EXP-INTEGRATION',
        documentId: 'DOC-001',
        category: 'MARKSHEET',
        systemId: 'SYS-PROP',
        timestamp: new Date().toISOString(),
        primaryProvider: 'gemini',
        fallbackTriggered: false,
        fallbackProvider: null,
        latencyMs: { uploadMs: 100, aiInferenceMs: 2000, dbStagingMs: 100, totalPipelineMs: 2200 },
        fieldMatches,
        fieldScores: {
          truePositives: computed.tp,
          falsePositives: computed.fp,
          falseNegatives: computed.fn,
          precision: computed.precision,
          recall: computed.recall,
          f1Score: computed.f1,
        },
        hitlMetrics: { reviewRequired: false, reviewDurationSec: 0, fieldsCorrected: 0, finalAction: 'APPROVED' },
        success: true,
      };

      // Validate the result
      const validation = validator.validateDocument(result);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);

      // Validate aggregate from single result
      const aggregates = metricsEngine.computeAggregate([result]);
      expect(aggregates.overallPrecision).toBeCloseTo(1.0);
      expect(aggregates.overallRecall).toBeCloseTo(1.0);
      expect(aggregates.overallF1Score).toBeCloseTo(1.0);

      const aggValidation = validator.validateAggregates([result], aggregates);
      expect(aggValidation.isValid).toBe(true);
    });

    it('should detect inconsistency when fieldScores do not match fieldMatches', () => {
      const fieldMatches: FieldMatchResult[] = [
        { fieldName: 'f1', expected: 'a', actual: 'a', isMatch: true, matchScore: 1.0 },
        { fieldName: 'f2', expected: 'b', actual: 'b', isMatch: true, matchScore: 1.0 },
        { fieldName: 'f3', expected: 'c', actual: null, isMatch: false, matchScore: 0.0 },
      ];

      // Intentionally wrong stored metrics
      const result: DocumentEvaluationResult = {
        experimentId: 'EXP-INTEGRATION',
        documentId: 'DOC-002',
        category: 'MARKSHEET',
        systemId: 'SYS-BASE-1',
        timestamp: new Date().toISOString(),
        primaryProvider: 'tesseract',
        fallbackTriggered: false,
        fallbackProvider: null,
        latencyMs: { uploadMs: 100, aiInferenceMs: 1000, dbStagingMs: 50, totalPipelineMs: 1150 },
        fieldMatches,
        fieldScores: {
          truePositives: 99, // WRONG
          falsePositives: 0,
          falseNegatives: 1,
          precision: 1.0,
          recall: 0.5,
          f1Score: 0.666,
        },
        hitlMetrics: { reviewRequired: false, reviewDurationSec: 0, fieldsCorrected: 0, finalAction: 'APPROVED' },
        success: true,
      };

      const validation = validator.validateDocument(result);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors.some(e => e.field === 'truePositives')).toBe(true);
    });

    it('should validate aggregate consistency across multiple documents', () => {
      const results: DocumentEvaluationResult[] = [
        createMockResult('DOC-1', 7, 7),
        createMockResult('DOC-2', 7, 5),
        createMockResult('DOC-3', 7, 3),
      ];

      const aggregates = metricsEngine.computeAggregate(results);
      const validation = validator.validateAggregates(results, aggregates);
      expect(validation.isValid).toBe(true);
    });

    it('should fail aggregate validation when latency stats are inconsistent', () => {
      const results = [
        createMockResult('DOC-1', 7, 7),
      ];

      const badAggregates: AggregateMetrics = {
        totalDocuments: 1,
        successfulEvaluations: 1,
        failedEvaluations: 0,
        overallPrecision: 1.0,
        overallRecall: 1.0,
        overallF1Score: 1.0,
        latencyStats: { meanMs: 9999, medianMs: 9999, p95Ms: 9999, p99Ms: 9999, minMs: 9999, maxMs: 9999 },
        fallbackMetrics: { totalFallbackAttempts: 0, successfulFallbacks: 0, fallbackRecoveryRate: 0 },
        hitlMetrics: {
          totalDocsWithReview: 0,
          totalDocsWithCorrections: 0,
          totalReviewDurationSec: 0,
          meanReviewDurationSec: 0,
          totalFieldsCorrected: 0,
          humanCorrectionRate: 0
        },
        categoryBreakdown: {
          MARKSHEET: { count: 1, precision: 1.0, recall: 1.0, f1Score: 1.0, meanLatencyMs: 2200 },
        } as any,
      };

      const validation = validator.validateAggregates(results, badAggregates);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.field === 'latencyStats.meanMs')).toBe(true);
    });
  });

  describe('Mathematical invariants', () => {
    it('should satisfy precision/recall/F1 equation for all TP/FP/FN combinations', () => {
      // Property-based test: for all valid TP/FP/FN combinations, F1 = 2PR/(P+R)
      for (let tp = 0; tp <= 10; tp++) {
        for (let fp = 0; fp <= 10; fp++) {
          for (let fn = 0; fn <= 10; fn++) {
            if (tp === 0 && fp === 0 && fn === 0) continue;

            const fieldMatches: FieldMatchResult[] = [];
            for (let i = 0; i < tp; i++) {
              fieldMatches.push({ fieldName: `tp${i}`, expected: 'a', actual: 'a', isMatch: true, matchScore: 1.0 });
            }
            for (let i = 0; i < fp; i++) {
              fieldMatches.push({ fieldName: `fp${i}`, expected: 'a', actual: 'b', isMatch: false, matchScore: 0.0 });
            }
            for (let i = 0; i < fn; i++) {
              fieldMatches.push({ fieldName: `fn${i}`, expected: 'a', actual: null, isMatch: false, matchScore: 0.0 });
            }

            const computed = computeFieldMetrics(fieldMatches);
            const p = tp + fp > 0 ? tp / (tp + fp) : 0;
            const r = tp + fn > 0 ? tp / (tp + fn) : 0;
            const expectedF1 = p + r > 0 ? (2 * p * r) / (p + r) : 0;

            expect(computed.precision).toBeCloseTo(p);
            expect(computed.recall).toBeCloseTo(r);
            expect(computed.f1).toBeCloseTo(expectedF1);
            expect(computed.tp + computed.fp + computed.fn).toBe(tp + fp + fn);
          }
        }
      }
    });

    it('should satisfy aggregate sum invariants', () => {
      // Property: sum of per-document TP = aggregate TP
      const results: DocumentEvaluationResult[] = [];
      for (let i = 0; i < 5; i++) {
        const tp = Math.floor(Math.random() * 7);
        const fp = Math.floor(Math.random() * (7 - tp));
        const fn = 7 - tp - fp;
        results.push(createMockResult(`DOC-${i}`, 7, tp, fp, fn));
      }

      const aggregates = metricsEngine.computeAggregate(results);
      const validation = validator.validateAggregates(results, aggregates);
      expect(validation.isValid).toBe(true);
    });
  });
});

/**
 * Helper to create a mock DocumentEvaluationResult with specified metrics.
 */
function createMockResult(
  documentId: string,
  totalFields: number,
  tp: number,
  fp: number = 0,
  fn: number = 0
): DocumentEvaluationResult {
  const fieldMatches: FieldMatchResult[] = [];

  for (let i = 0; i < tp; i++) {
    fieldMatches.push({ fieldName: `f${i}`, expected: 'a', actual: 'a', isMatch: true, matchScore: 1.0 });
  }
  for (let i = 0; i < fp; i++) {
    fieldMatches.push({ fieldName: `f${tp + i}`, expected: 'a', actual: 'b', isMatch: false, matchScore: 0.0 });
  }
  for (let i = 0; i < fn; i++) {
    fieldMatches.push({ fieldName: `f${tp + fp + i}`, expected: 'a', actual: null, isMatch: false, matchScore: 0.0 });
  }

  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

  return {
    experimentId: 'EXP-INTEGRATION',
    documentId,
    category: 'MARKSHEET',
    systemId: 'SYS-PROP',
    timestamp: new Date().toISOString(),
    primaryProvider: 'test',
    fallbackTriggered: false,
    fallbackProvider: null,
    latencyMs: { uploadMs: 100, aiInferenceMs: 2000, dbStagingMs: 100, totalPipelineMs: 2200 },
    fieldMatches,
    fieldScores: { truePositives: tp, falsePositives: fp, falseNegatives: fn, precision, recall, f1Score: f1 },
    hitlMetrics: { reviewRequired: false, reviewDurationSec: 0, fieldsCorrected: 0, finalAction: 'APPROVED' },
    success: true,
  };
}
