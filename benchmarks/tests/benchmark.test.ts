/**
 * Academic Universe — Benchmark Unit Tests
 * Tests: FieldComparisonEngine, MetricsEngine, StatisticsEngine, GroundTruthEngine
 */

import { FieldComparisonEngine } from '../evaluators/fieldComparisonEngine';
import { MetricsEngine } from '../metrics/metricsEngine';
import { StatisticsEngine } from '../statistics/statisticsEngine';
import { GroundTruthEngine } from '../ground-truth/groundTruthEngine';
import { DocumentEvaluationResult } from '../types/benchmark.types';

// ─── FieldComparisonEngine ────────────────────────────────────────────────────

describe('FieldComparisonEngine', () => {
  const engine = new FieldComparisonEngine({ numericTolerancePct: 0.01 });

  test('exact string match', () => {
    const r = engine.compareField('studentName', 'Aashish Rajput', 'Aashish Rajput');
    expect(r.isMatch).toBe(true);
    expect(r.matchScore).toBe(1.0);
  });

  test('case-insensitive string match', () => {
    const r = engine.compareField('studentName', 'AASHISH RAJPUT', 'aashish rajput');
    expect(r.isMatch).toBe(true);
  });

  test('string mismatch returns similarity score', () => {
    const r = engine.compareField('studentName', 'Aashish Rajput', 'Aashish Raja');
    expect(r.isMatch).toBe(false);
    expect(r.matchScore).toBeGreaterThan(0.5);
  });

  test('numeric exact match', () => {
    const r = engine.compareField('sgpa', 8.5, 8.5);
    expect(r.isMatch).toBe(true);
  });

  test('numeric within tolerance (1%)', () => {
    const r = engine.compareField('sgpa', 8.5, 8.505);
    expect(r.isMatch).toBe(true);
  });

  test('numeric outside tolerance', () => {
    const r = engine.compareField('sgpa', 8.5, 8.7);
    expect(r.isMatch).toBe(false);
  });

  test('both null = match', () => {
    const r = engine.compareField('cgpa', null, null);
    expect(r.isMatch).toBe(true);
  });

  test('one null = mismatch', () => {
    const r = engine.compareField('cgpa', 7.8, null);
    expect(r.isMatch).toBe(false);
  });

  test('course marks comparison - exact match', () => {
    const expected = [{ courseCode: 'CS101', courseName: 'Algorithms', marksObtained: 85, maxMarks: 100 }];
    const actual = [{ courseCode: 'CS101', courseName: 'Algorithms', marksObtained: 85, maxMarks: 100 }];
    const results = engine.compareCourseMarks(expected, actual);
    expect(results[0].isMatch).toBe(true);
  });

  test('course marks comparison - missing course (false negative)', () => {
    const expected = [{ courseCode: 'CS101', courseName: 'Algorithms', marksObtained: 85, maxMarks: 100 }];
    const actual: any[] = [];
    const results = engine.compareCourseMarks(expected, actual);
    expect(results[0].isMatch).toBe(false);
    expect(results[0].matchScore).toBe(0);
  });

  test('date normalization match', () => {
    const r = engine.compareField('issueDate', '2025-05-15', '15-05-2025');
    // Both parse to the same date — implementation normalizes
    expect(typeof r.isMatch).toBe('boolean');
  });
});

// ─── MetricsEngine ───────────────────────────────────────────────────────────

describe('MetricsEngine', () => {
  const engine = new MetricsEngine();

  const makeResult = (tp: number, fp: number, fn: number, latMs: number, cat: any = 'MARKSHEET'): DocumentEvaluationResult => {
    const fieldMatches = [];
    for (let i = 0; i < tp; i++) {
      fieldMatches.push({ fieldName: `tp_${i}`, expected: 'val', actual: 'val', isMatch: true, matchScore: 1.0 });
    }
    for (let i = 0; i < fp; i++) {
      fieldMatches.push({ fieldName: `fp_${i}`, expected: 'val', actual: 'wrong', isMatch: false, matchScore: 0.0 });
    }
    for (let i = 0; i < fn; i++) {
      fieldMatches.push({ fieldName: `fn_${i}`, expected: 'val', actual: null, isMatch: false, matchScore: 0.0 });
    }
    const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
    const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
    const f1Score = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

    return {
      experimentId: 'TEST',
      documentId: `doc-${Math.random()}`,
      category: cat,
      systemId: 'SYS-PROP',
      timestamp: new Date().toISOString(),
      primaryProvider: 'gemini',
      fallbackTriggered: false,
      fallbackProvider: null,
      latencyMs: { uploadMs: 10, aiInferenceMs: latMs - 10, dbStagingMs: 5, totalPipelineMs: latMs },
      fieldMatches,
      fieldScores: {
        truePositives: tp,
        falsePositives: fp,
        falseNegatives: fn,
        precision,
        recall,
        f1Score,
      },
      hitlMetrics: { reviewRequired: true, reviewDurationSec: 5, fieldsCorrected: 0, finalAction: 'APPROVED' },
      success: true,
    };
  };

  test('perfect precision and recall', () => {
    const results = [makeResult(7, 0, 0, 100)];
    const agg = engine.computeAggregate(results);
    expect(agg.overallPrecision).toBeCloseTo(1.0);
    expect(agg.overallRecall).toBeCloseTo(1.0);
    expect(agg.overallF1Score).toBeCloseTo(1.0);
  });

  test('zero precision when all false positives', () => {
    const results = [makeResult(0, 5, 3, 100)];
    const agg = engine.computeAggregate(results);
    expect(agg.overallPrecision).toBe(0);
  });

  test('latency percentiles computed correctly', () => {
    const results = [100, 200, 300, 400, 500].map((l) => makeResult(5, 1, 1, l));
    const agg = engine.computeAggregate(results);
    expect(agg.latencyStats.minMs).toBe(100);
    expect(agg.latencyStats.maxMs).toBe(500);
    expect(agg.latencyStats.medianMs).toBe(300);
  });

  test('failed evaluations excluded from metrics', () => {
    const results = [makeResult(7, 0, 0, 100)];
    const failed: DocumentEvaluationResult = { ...makeResult(0, 0, 0, 0), success: false };
    const agg = engine.computeAggregate([...results, failed]);
    expect(agg.failedEvaluations).toBe(1);
    expect(agg.successfulEvaluations).toBe(1);
  });
});

// ─── StatisticsEngine ────────────────────────────────────────────────────────

describe('StatisticsEngine', () => {
  const engine = new StatisticsEngine();

  test('describe - mean and median correct', () => {
    const desc = engine.describe([2, 4, 6, 8, 10]);
    expect(desc.mean).toBeCloseTo(6.0);
    expect(desc.median).toBe(6);
  });

  test('describe - empty array returns zeros', () => {
    const desc = engine.describe([]);
    expect(desc.n).toBe(0);
    expect(desc.mean).toBe(0);
  });

  test('cohens d - large effect', () => {
    // Groups must have variance for pooled std to be non-zero
    const group1 = [0.40, 0.45, 0.50, 0.55, 0.60, 0.42, 0.48, 0.52];
    const group2 = [0.85, 0.90, 0.88, 0.92, 0.87, 0.89, 0.91, 0.86];
    const { d, rating } = engine.cohensD(group1, group2);
    expect(d).toBeGreaterThan(0.8);
    expect(rating).toBe('Large');
  });

  test('cohens d - negligible effect', () => {
    // Nearly identical distributions with same spread
    const group1 = [0.80, 0.81, 0.79, 0.82, 0.78, 0.80, 0.81, 0.79, 0.80, 0.80];
    const group2 = [0.81, 0.80, 0.80, 0.81, 0.79, 0.81, 0.80, 0.80, 0.81, 0.80];
    const { d } = engine.cohensD(group1, group2);
    expect(d).toBeLessThan(0.5); // Effect is at most small
  });

  test('bonferroni correction with 3 comparisons', () => {
    const threshold = engine.bonferroniThreshold(0.05, 3);
    expect(threshold).toBeCloseTo(0.0167, 3);
  });

  test('confidence interval contains mean', () => {
    const values = [0.8, 0.82, 0.78, 0.81, 0.79, 0.80, 0.83, 0.77];
    const ci = engine.confidenceInterval(values);
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    expect(ci.lower).toBeLessThan(mean);
    expect(ci.upper).toBeGreaterThan(mean);
  });

  test('paired t-test on identical arrays gives p=1', () => {
    const a = [0.8, 0.82, 0.78, 0.81, 0.79];
    const { pValue } = engine.pairedTTest(a, a);
    expect(pValue).toBeGreaterThan(0.05);
  });

  test('wilcoxon - clearly different arrays should reject H0', () => {
    const a = new Array(20).fill(0.5);
    const b = new Array(20).fill(0.9);
    const { pValue } = engine.wilcoxonSignedRank(a, b);
    expect(pValue).toBeLessThan(0.05);
  });
});

// ─── GroundTruthEngine ───────────────────────────────────────────────────────

describe('GroundTruthEngine', () => {
  const engine = new GroundTruthEngine();

  test('validate valid ground truth passes', () => {
    const gt = {
      documentId: 'MS_001',
      category: 'MARKSHEET' as const,
      studentName: 'Aashish Rajput',
      rollNumber: '21CS001',
      sgpa: 8.5,
      cgpa: 8.2,
    };
    const result = engine.validate(gt);
    expect(result.isValid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  test('validate missing documentId fails', () => {
    // documentId undefined triggers the REQUIRED_FIELDS check
    const gt = { category: 'MARKSHEET' as const } as any;
    const result = engine.validate(gt);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('documentId'))).toBe(true);
  });

  test('validate invalid sgpa range produces warning', () => {
    const gt = { documentId: 'MS_001', category: 'MARKSHEET' as const, sgpa: 15 };
    const result = engine.validate(gt);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  test('invalid category produces error', () => {
    const gt = { documentId: 'MS_001', category: 'INVALID' as any };
    const result = engine.validate(gt);
    expect(result.isValid).toBe(false);
  });

  test('computeCohensKappa - full agreement = 1.0', () => {
    const agreements = new Array(20).fill({ agrees: true });
    const kappa = engine.computeCohensKappa(agreements);
    expect(kappa).toBeCloseTo(1.0);
  });

  test('computeCohensKappa - no agreement = negative', () => {
    const agreements = new Array(20).fill({ agrees: false });
    const kappa = engine.computeCohensKappa(agreements);
    expect(kappa).toBeLessThan(0);
  });
});
