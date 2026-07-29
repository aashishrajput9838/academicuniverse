/**
 * Academic Universe — Property-Based Tests
 * Validates mathematical invariants across randomized benchmark scenarios.
 *
 * These tests verify that the benchmark pipeline produces mathematically
 * correct results regardless of input variation.
 */

import { computeFieldMetrics, validateFieldMetrics, validateMetricEquations, validateFieldCount } from '../../metrics/metricsCalculator';
import { FieldMatchResult } from '../../types/benchmark.types';
import { BenchmarkValidator } from '../../validation/benchmarkValidator';
import { DocumentEvaluationResult } from '../../types/benchmark.types';
import { MetricsEngine } from '../../metrics/metricsEngine';

describe('Property-Based Tests', () => {
  describe('Invariant 1: Precision/Recall/F1 Equation', () => {
    // Property: For ALL valid TP/FP/FN combinations, F1 must equal 2*P*R/(P+R)
    const testCases: { tp: number; fp: number; fn: number }[] = [];

    for (let tp = 0; tp <= 20; tp++) {
      for (let fp = 0; fp <= 20; fp++) {
        for (let fn = 0; fn <= 20; fn++) {
          if (tp === 0 && fp === 0 && fn === 0) continue;
          testCases.push({ tp, fp, fn });
        }
      }
    }

    test.each(testCases)('F1 equation holds for TP=%i FP=%i FN=%i', ({ tp, fp, fn }) => {
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

      const metrics = computeFieldMetrics(fieldMatches);
      const p = tp + fp > 0 ? tp / (tp + fp) : 0;
      const r = tp + fn > 0 ? tp / (tp + fn) : 0;
      const expectedF1 = p + r > 0 ? (2 * p * r) / (p + r) : 0;

      expect(metrics.precision).toBeCloseTo(p);
      expect(metrics.recall).toBeCloseTo(r);
      expect(metrics.f1).toBeCloseTo(expectedF1);
    });
  });

  describe('Invariant 2: TP+FP+FN = Field Count', () => {
    test('TP+FP+FN always equals total fieldMatches count', () => {
      for (let count = 1; count <= 20; count++) {
        const fieldMatches: FieldMatchResult[] = [];
        for (let i = 0; i < count; i++) {
          const isMatch = Math.random() > 0.3;
          fieldMatches.push({
            fieldName: `f${i}`,
            expected: 'a',
            actual: isMatch ? 'a' : 'b',
            isMatch,
            matchScore: isMatch ? 1.0 : 0.0,
          });
        }

        const metrics = computeFieldMetrics(fieldMatches);
        expect(metrics.tp + metrics.fp + metrics.fn).toBe(fieldMatches.length);
      }
    });
  });

  describe('Invariant 3: Aggregate Sums Equal Per-Document Sums', () => {
    test('aggregate TP equals sum of per-document TP', () => {
      const results: DocumentEvaluationResult[] = [];
      let expectedTotalTP = 0;

      for (let i = 0; i < 10; i++) {
        const tp = Math.floor(Math.random() * 7);
        const fp = Math.floor(Math.random() * (7 - tp));
        const fn = 7 - tp - fp;
        expectedTotalTP += tp;

        const fieldMatches: FieldMatchResult[] = [];
        for (let j = 0; j < tp; j++) {
          fieldMatches.push({ fieldName: `f${j}`, expected: 'a', actual: 'a', isMatch: true, matchScore: 1.0 });
        }
        for (let j = 0; j < fp; j++) {
          fieldMatches.push({ fieldName: `f${tp + j}`, expected: 'a', actual: 'b', isMatch: false, matchScore: 0.0 });
        }
        for (let j = 0; j < fn; j++) {
          fieldMatches.push({ fieldName: `f${tp + fp + j}`, expected: 'a', actual: null, isMatch: false, matchScore: 0.0 });
        }

        const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
        const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
        const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

        results.push({
          experimentId: 'EXP-PROP',
          documentId: `DOC-${i}`,
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
        });
      }

      const metricsEngine = new MetricsEngine();
      const aggregates = metricsEngine.computeAggregate(results);

      // The aggregate precision/recall/F1 should equal TP_total / (TP_total + FP_total) etc.
      expect(aggregates.overallPrecision).toBeCloseTo(expectedTotalTP / (expectedTotalTP + results.reduce((s, r) => s + r.fieldScores.falsePositives, 0)));
    });
  });

  describe('Invariant 4: Validation Catches All Errors', () => {
    test('validator should detect any injected error', () => {
      const validator = new BenchmarkValidator();

      // Generate valid result
      const fieldMatches: FieldMatchResult[] = [
        { fieldName: 'f1', expected: 'a', actual: 'a', isMatch: true, matchScore: 1.0 },
        { fieldName: 'f2', expected: 'b', actual: null, isMatch: false, matchScore: 0.0 },
      ];
      const computed = computeFieldMetrics(fieldMatches);

      const result: DocumentEvaluationResult = {
        experimentId: 'EXP-PROP',
        documentId: 'DOC-ERR',
        category: 'MARKSHEET',
        systemId: 'SYS-PROP',
        timestamp: new Date().toISOString(),
        primaryProvider: 'test',
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

      // Test each possible error injection
      const errorCases = [
        { name: 'wrong TP', mutate: (r: DocumentEvaluationResult) => { r.fieldScores.truePositives = 99; } },
        { name: 'wrong FP', mutate: (r: DocumentEvaluationResult) => { r.fieldScores.falsePositives = 99; } },
        { name: 'wrong FN', mutate: (r: DocumentEvaluationResult) => { r.fieldScores.falseNegatives = 99; } },
        { name: 'wrong precision', mutate: (r: DocumentEvaluationResult) => { r.fieldScores.precision = 0.999; } },
        { name: 'wrong recall', mutate: (r: DocumentEvaluationResult) => { r.fieldScores.recall = 0.999; } },
        { name: 'wrong F1', mutate: (r: DocumentEvaluationResult) => { r.fieldScores.f1Score = 0.999; } },
        { name: 'wrong latency total', mutate: (r: DocumentEvaluationResult) => { r.latencyMs.totalPipelineMs = 9999; } },
        { name: 'fallback without provider', mutate: (r: DocumentEvaluationResult) => { r.fallbackTriggered = true; r.fallbackProvider = null; } },
        { name: 'correction without review', mutate: (r: DocumentEvaluationResult) => { r.hitlMetrics.fieldsCorrected = 1; r.hitlMetrics.reviewDurationSec = 0; } },
      ];

      for (const testCase of errorCases) {
        const mutated = JSON.parse(JSON.stringify(result)) as DocumentEvaluationResult;
        testCase.mutate(mutated);
        const validation = validator.validateDocument(mutated);
        expect(validation.isValid).toBe(false);
        expect(validation.errors.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Invariant 5: Deterministic Metric Calculation', () => {
    test('same fieldMatches always produce same metrics', () => {
      const fieldMatches: FieldMatchResult[] = [
        { fieldName: 'f1', expected: 'a', actual: 'a', isMatch: true, matchScore: 1.0 },
        { fieldName: 'f2', expected: 'b', actual: null, isMatch: false, matchScore: 0.0 },
        { fieldName: 'f3', expected: 'c', actual: 'd', isMatch: false, matchScore: 0.0 },
      ];

      const results: number[] = [];
      for (let i = 0; i < 100; i++) {
        results.push(computeFieldMetrics(fieldMatches).f1);
      }

      expect(new Set(results).size).toBe(1); // All identical
    });
  });
});
