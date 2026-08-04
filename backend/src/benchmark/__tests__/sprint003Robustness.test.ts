/**
 * sprint003Robustness.test.ts
 *
 * Unit tests for Sprint 003 Quality Profile Robustness, Leaderboard,
 * Field Robustness Matrix, Error Heatmap, and Diagnostics identification.
 */

import { ProfileRobustnessEvaluator } from '../evaluators/ProfileRobustnessEvaluator';
import { GradeIntegrityEvaluator } from '../evaluators/GradeIntegrityEvaluator';
import type { SampleComparisonResult, ErrorCategory } from '../types/benchmark.types';

describe('Sprint 003 Robustness & Degradation Diagnostics Unit Tests', () => {
  const sampleResults: SampleComparisonResult[] = [
    {
      sampleId: 'S1_clean',
      documentType: 'certificate',
      qualityProfile: 'clean',
      categoryMatch: true,
      predictionConfidence: 0.98,
      metrics: { cer: 0, wer: 0, exactMatch: true, precision: 1, recall: 1, f1Score: 1, matchedFieldsCount: 5, totalFieldsCount: 5 },
      discrepancies: [],
      groundTruthSummary: { category: 'certificate', fieldsCount: 5 },
      predictionSummary: { category: 'CERTIFICATE', confidence: 0.98, fieldsCount: 5 },
    },
    {
      sampleId: 'S1_rotated',
      documentType: 'certificate',
      qualityProfile: 'rotated_90',
      categoryMatch: false,
      predictionConfidence: 0.40,
      metrics: { cer: 0.8, wer: 0.9, exactMatch: false, precision: 0.2, recall: 0.2, f1Score: 0.2, matchedFieldsCount: 1, totalFieldsCount: 5 },
      discrepancies: [
        { field: 'candidateName', expected: 'Trisha Das', actual: 'Trisha', matched: false, cer: 0.3, errorCategory: 'PARTIAL_MATCH' },
        { field: 'rollNumber', expected: '2021IT000150', actual: null, matched: false, cer: 1.0, errorCategory: 'FIELD_MISSING' },
      ],
      groundTruthSummary: { category: 'certificate', fieldsCount: 5 },
      predictionSummary: { category: 'UNKNOWN', confidence: 0.40, fieldsCount: 2 },
    },
  ];

  const taxonomySummary: Record<ErrorCategory, number> = {
    OCR_ERROR: 2,
    NORMALIZATION_ERROR: 0,
    FORMAT_ERROR: 1,
    HALLUCINATION: 0,
    FIELD_MISSING: 5,
    FIELD_EXTRA: 0,
    PARTIAL_MATCH: 3,
    LOW_CONFIDENCE: 1,
    CATEGORY_ERROR: 1,
  };

  test('ProfileRobustnessEvaluator should identify best and worst profiles accurately', () => {
    const analysis = ProfileRobustnessEvaluator.analyzeRobustness(sampleResults, taxonomySummary);

    expect(analysis.bestPerformingProfile).toBe('clean');
    expect(analysis.worstPerformingProfile).toBe('rotated_90');
    expect(analysis.mostCommonErrorCategory).toBe('FIELD_MISSING');
  });

  test('GradeIntegrityEvaluator should evaluate grade points and grade strings correctly', () => {
    const expSubs = [{ code: 'IT202', grade: 'A+', gradePoints: 10 }];
    const actSubs = [{ code: 'IT202', grade: 'A+', gradePoints: 10 }];

    const evalResult = GradeIntegrityEvaluator.evaluateGradeIntegrity(expSubs, actSubs);
    expect(evalResult.totalGrades).toBe(1);
    expect(evalResult.correctGrades).toBe(1);
  });
});
