/**
 * sprint002Evaluators.test.ts
 *
 * Unit tests for Sprint 002 specialized document evaluators,
 * confidence calibration metrics, error taxonomy, and confusion matrices.
 */

import { CertificateEvaluator } from '../evaluators/CertificateEvaluator';
import { MarksheetEvaluator } from '../evaluators/MarksheetEvaluator';
import { StudentIdEvaluator } from '../evaluators/StudentIdEvaluator';
import { ConfusionMatrixEvaluator } from '../evaluators/ConfusionMatrixEvaluator';
import { ErrorTaxonomyEvaluator } from '../evaluators/ErrorTaxonomyEvaluator';
import { MetricCalculator } from '../metrics/MetricCalculator';
import type { BenchmarkGroundTruth, BenchmarkPrediction, SampleComparisonResult } from '../types/benchmark.types';

describe('Sprint 002 Document Evaluators & Error Taxonomy', () => {
  const dummyGt: BenchmarkGroundTruth = {
    sampleId: 'DOC-100_clean',
    documentId: 'DOC-100',
    documentType: 'certificate',
    qualityProfile: 'clean',
    pngPath: 'images/clean/png/certificates/DOC-100_clean.png',
    pdfPath: 'pdf/clean/certificates/DOC-100.pdf',
    gtPath: 'groundtruth/clean/certificates/DOC-100_clean.json',
    metadataPath: 'metadata/clean/certificates/DOC-100_clean.json',
    extractedFields: {
      candidate_name: 'Trisha Das',
      issuer: 'Vivekananda Technical University',
    },
    subjects: [],
    rawGtDict: {},
  };

  const dummyPred: BenchmarkPrediction = {
    sampleId: 'DOC-100_clean',
    documentCategory: 'CERTIFICATE',
    confidenceScore: 0.95,
    summary: 'Degree certificate',
    extractedEntities: {
      candidateName: 'Trisha Das',
      issuer: 'Vivekananda Technical University',
    },
    candidateFields: {},
    executionTimeMs: 120,
  };

  test('CertificateEvaluator should evaluate certificate fields correctly', () => {
    const res = CertificateEvaluator.evaluate(dummyGt, dummyPred);
    expect(res.categoryMatch).toBe(true);
    expect(res.metrics.exactMatch).toBe(true);
    expect(res.predictionConfidence).toBe(0.95);
  });

  test('ErrorTaxonomyEvaluator should categorize FIELD_MISSING errors correctly', () => {
    const errorCat = ErrorTaxonomyEvaluator.classifyFieldError(
      { field: 'issueDate', expected: '2025-07-14', actual: null, matched: false },
      0.90
    );
    expect(errorCat).toBe('FIELD_MISSING');
  });

  test('ErrorTaxonomyEvaluator should categorize HALLUCINATION errors correctly', () => {
    const errorCat = ErrorTaxonomyEvaluator.classifyFieldError(
      { field: 'extraSkill', expected: null, actual: 'Python', matched: false },
      0.90
    );
    expect(errorCat).toBe('HALLUCINATION');
  });

  test('ConfusionMatrixEvaluator should generate expected confusion matrix entries', () => {
    const sampleResults: SampleComparisonResult[] = [
      {
        sampleId: 'S1',
        documentType: 'certificate',
        qualityProfile: 'clean',
        categoryMatch: true,
        predictionConfidence: 0.95,
        metrics: { cer: 0, wer: 0, exactMatch: true, precision: 1, recall: 1, f1Score: 1, matchedFieldsCount: 2, totalFieldsCount: 2 },
        discrepancies: [],
        groundTruthSummary: { category: 'certificate', fieldsCount: 2 },
        predictionSummary: { category: 'CERTIFICATE', confidence: 0.95, fieldsCount: 2 },
      },
    ];

    const matrix = ConfusionMatrixEvaluator.computeConfusionMatrix(sampleResults);
    expect(matrix.length).toBe(1);
    expect(matrix[0].expectedCategory).toBe('CERTIFICATE');
    expect(matrix[0].predictedCategory).toBe('CERTIFICATE');
    expect(matrix[0].count).toBe(1);
  });

  test('MetricCalculator should compute confidence metrics and error taxonomy summary', () => {
    const sampleResults: SampleComparisonResult[] = [
      {
        sampleId: 'S1',
        documentType: 'certificate',
        qualityProfile: 'clean',
        categoryMatch: true,
        predictionConfidence: 0.95,
        metrics: { cer: 0, wer: 0, exactMatch: true, precision: 1, recall: 1, f1Score: 1, matchedFieldsCount: 2, totalFieldsCount: 2 },
        discrepancies: [],
        groundTruthSummary: { category: 'certificate', fieldsCount: 2 },
        predictionSummary: { category: 'CERTIFICATE', confidence: 0.95, fieldsCount: 2 },
      },
    ];

    const report = MetricCalculator.calculateRunReport('run_1', 'dataset', 1.0, sampleResults);
    expect(report.confidenceMetrics.averageConfidence).toBe(0.95);
    expect(report.confidenceMetrics.averageConfidenceCorrect).toBe(0.95);
    expect(report.errorTaxonomySummary.FIELD_MISSING).toBe(0);
  });
});
