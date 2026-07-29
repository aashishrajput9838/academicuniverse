/**
 * Academic Universe — Legacy JSON Rectification Tests
 * Verifies that the legacy JSON rectification script produces 100% mathematically
 * consistent and certified benchmark output.
 */

import fs from 'fs';
import path from 'path';
import { computeFieldMetrics } from '../../metrics/metricsCalculator';
import { BenchmarkValidator } from '../../validation/benchmarkValidator';

const RECTIFIED_JSON_PATH = path.join(__dirname, '../../../paper-draft-v1/benchmark-results/experiment_VAL-20260729.json');
const CERTIFICATE_PATH = path.join(__dirname, '../../../paper-draft-v1/benchmark-results/benchmark_certificate.json');

describe('Legacy JSON Rectification & Certification', () => {
  it('should have created rectified JSON and certified benchmark certificate', () => {
    expect(fs.existsSync(RECTIFIED_JSON_PATH)).toBe(true);
    expect(fs.existsSync(CERTIFICATE_PATH)).toBe(true);
  });

  it('should have 100% mathematical consistency across all records in rectified JSON', () => {
    const content = fs.readFileSync(RECTIFIED_JSON_PATH, 'utf-8');
    const data = JSON.parse(content);
    const evaluations = data.evaluations || [];

    expect(evaluations.length).toBeGreaterThan(0);

    const validator = new BenchmarkValidator();

    for (const ev of evaluations) {
      // 1. Every fieldScores MUST equal computeFieldMetrics(fieldMatches)
      const computed = computeFieldMetrics(ev.fieldMatches);
      expect(ev.fieldScores.truePositives).toBe(computed.tp);
      expect(ev.fieldScores.falsePositives).toBe(computed.fp);
      expect(ev.fieldScores.falseNegatives).toBe(computed.fn);
      expect(ev.fieldScores.precision).toBeCloseTo(computed.precision, 3);
      expect(ev.fieldScores.recall).toBeCloseTo(computed.recall, 3);
      expect(ev.fieldScores.f1Score).toBeCloseTo(computed.f1, 3);

      // 2. Document validation rules must all pass
      const valResult = validator.validateDocument(ev);
      expect(valResult.isValid).toBe(true);
      expect(valResult.errors).toHaveLength(0);
    }
  });

  it('should contain a valid, passing Benchmark Certificate', () => {
    const content = fs.readFileSync(CERTIFICATE_PATH, 'utf-8');
    const cert = JSON.parse(content);

    expect(cert.certificateVersion).toBe('1.0');
    expect(cert.validationStatus).toBe('PASS');
    expect(cert.validationErrorCount).toBe(0);
    expect(cert.validationRulesExecuted.length).toBeGreaterThan(0);
  });
});
