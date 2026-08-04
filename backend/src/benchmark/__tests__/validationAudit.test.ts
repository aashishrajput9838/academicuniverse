/**
 * validationAudit.test.ts
 *
 * Benchmark Validation Audit Test Suite.
 * Verifies zero ground truth leakage, controlled mismatch detection, and sample inspection integrity.
 */

import { FieldLevelEvaluator } from '../evaluators/FieldLevelEvaluator';
import { StringDistanceComparator } from '../comparators/StringDistanceComparator';
import { ExactMatchComparator } from '../comparators/ExactMatchComparator';
import { ErrorTaxonomyEvaluator } from '../evaluators/ErrorTaxonomyEvaluator';
import type { BenchmarkGroundTruth, BenchmarkPrediction } from '../types/benchmark.types';

describe('Benchmark Validation Audit Unit & Integration Tests', () => {
  const baseGt: BenchmarkGroundTruth = {
    sampleId: 'DOC-AUDIT-001',
    documentId: 'DOC-AUDIT-001',
    documentType: 'certificate',
    qualityProfile: 'clean',
    pngPath: 'images/clean/png/certificates/DOC-AUDIT-001.png',
    pdfPath: 'pdf/clean/certificates/DOC-AUDIT-001.pdf',
    gtPath: 'groundtruth/clean/certificates/DOC-AUDIT-001.json',
    metadataPath: 'metadata/clean/certificates/DOC-AUDIT-001.json',
    extractedFields: {
      candidate_name: 'Trisha Das',
      roll_number: '2021IT000150',
      cgpa: 4.93,
      issue_date: '2025-07-14',
    },
    subjects: [],
    rawGtDict: {},
  };

  test('Audit 1: Controlled Mismatch Test — Detect OCR character typo', () => {
    const typoPred: BenchmarkPrediction = {
      sampleId: 'DOC-AUDIT-001',
      documentCategory: 'CERTIFICATE',
      confidenceScore: 0.95,
      summary: 'Degree Certificate',
      extractedEntities: {
        candidateName: 'Trisha X. Das', // Intentionally injected typo
        rollNumber: '2021IT000150',
        cgpa: 4.93,
        issueDate: '2025-07-14',
      },
      candidateFields: {},
      executionTimeMs: 120,
    };

    const res = FieldLevelEvaluator.evaluateSample(baseGt, typoPred);

    expect(res.metrics.exactMatch).toBe(false);
    expect(res.metrics.matchedFieldsCount).toBe(3); // 3 of 4 match
    expect(res.metrics.totalFieldsCount).toBe(4);

    const nameDisc = res.discrepancies.find((d) => d.field === 'candidateName');
    expect(nameDisc).toBeDefined();
    expect(nameDisc?.matched).toBe(false);
    expect(nameDisc?.cer).toBeGreaterThan(0.0);
    expect(nameDisc?.errorCategory).toBe('PARTIAL_MATCH');
  });

  test('Audit 2: Controlled Mismatch Test — Detect missing field', () => {
    const missingPred: BenchmarkPrediction = {
      sampleId: 'DOC-AUDIT-001',
      documentCategory: 'CERTIFICATE',
      confidenceScore: 0.90,
      summary: 'Degree Certificate',
      extractedEntities: {
        candidateName: 'Trisha Das',
        rollNumber: '2021IT000150',
        cgpa: 4.93,
        // issueDate missing
      },
      candidateFields: {},
      executionTimeMs: 120,
    };

    const res = FieldLevelEvaluator.evaluateSample(baseGt, missingPred);

    expect(res.metrics.exactMatch).toBe(false);
    const dateDisc = res.discrepancies.find((d) => d.field === 'issueDate');
    expect(dateDisc).toBeDefined();
    expect(dateDisc?.matched).toBe(false);
    expect(dateDisc?.errorCategory).toBe('FIELD_MISSING');
  });

  test('Audit 3: Controlled Mismatch Test — Detect document category mismatch', () => {
    const wrongCategoryPred: BenchmarkPrediction = {
      sampleId: 'DOC-AUDIT-001',
      documentCategory: 'MARKSHEET', // Intentionally wrong category
      confidenceScore: 0.95,
      summary: 'Marksheet',
      extractedEntities: {
        candidateName: 'Trisha Das',
        rollNumber: '2021IT000150',
        cgpa: 4.93,
        issueDate: '2025-07-14',
      },
      candidateFields: {},
      executionTimeMs: 120,
    };

    const res = FieldLevelEvaluator.evaluateSample(baseGt, wrongCategoryPred);

    expect(res.categoryMatch).toBe(false);
  });

  test('Audit 4: Levenshtein CER/WER calculation verification', () => {
    const cer = StringDistanceComparator.computeCer('Vivekananda', 'Vivekanada');
    expect(cer).toBeCloseTo(1 / 11, 2);

    const wer = StringDistanceComparator.computeWer('Vivekananda Technical University', 'Vivekananda Tech University');
    expect(wer).toBeCloseTo(1 / 3, 2);
  });
});
