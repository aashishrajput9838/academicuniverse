/**
 * sprint004Exporters.test.ts
 *
 * Unit tests for Sprint 004 LaTeX Table Exporter, CSV Exporter,
 * Checkpointing, and Reproducibility Utils.
 */

import { LatexTableExporter } from '../reports/LatexTableExporter';
import { CsvExporter } from '../reports/CsvExporter';
import { ReproducibilityUtils } from '../utils/reproducibility';
import { MetricCalculator } from '../metrics/MetricCalculator';
import type { SampleComparisonResult } from '../types/benchmark.types';

describe('Sprint 004 Exporters & Reproducibility Unit Tests', () => {
  const dummyResult: SampleComparisonResult = {
    sampleId: 'DOC-100_clean',
    documentType: 'certificate',
    qualityProfile: 'clean',
    categoryMatch: true,
    predictionConfidence: 0.98,
    metrics: { cer: 0, wer: 0, exactMatch: true, precision: 1, recall: 1, f1Score: 1, matchedFieldsCount: 5, totalFieldsCount: 5 },
    discrepancies: [],
    groundTruthSummary: { category: 'certificate', fieldsCount: 5 },
    predictionSummary: { category: 'CERTIFICATE', confidence: 0.98, fieldsCount: 5 },
  };

  test('ReproducibilityUtils should generate valid dataset hash and git commit string', () => {
    const hash = ReproducibilityUtils.computeDatasetHash('c:\\github\\academicuniverse.com\\academicuniverse\\ADBG\\AU_DIC_Benchmark_v1.0');
    expect(hash).toBeDefined();
    expect(typeof hash).toBe('string');

    const commit = ReproducibilityUtils.getGitCommit();
    expect(commit).toBeDefined();
  });

  test('CsvExporter should generate non-empty CSV output with headers', () => {
    const csv = CsvExporter.generateCsv([dummyResult]);
    expect(csv).toContain('sample_id,document_type');
    expect(csv).toContain('DOC-100_clean,certificate');
  });

  test('LatexTableExporter should produce IEEE LaTeX table environment', () => {
    const report = MetricCalculator.calculateRunReport('run_1', 'dataset', 1.0, [dummyResult]);
    const latex = LatexTableExporter.generateQualityProfileLatex(report);

    expect(latex).toContain('\\begin{table}');
    expect(latex).toContain('Clean &');
    expect(latex).toContain('\\end{table}');
  });
});
