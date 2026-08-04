/**
 * CsvExporter.ts
 *
 * Exports per-sample evaluation metrics into a CSV file for statistical analysis.
 */

import type { SampleComparisonResult } from '../types/benchmark.types';

export class CsvExporter {
  public static generateCsv(results: SampleComparisonResult[]): string {
    const headers = [
      'sample_id',
      'document_type',
      'quality_profile',
      'category_match',
      'prediction_confidence',
      'precision',
      'recall',
      'f1_score',
      'cer',
      'wer',
      'exact_match',
      'matched_fields',
      'total_fields',
    ];

    const rows = results.map((r) => [
      r.sampleId,
      r.documentType,
      r.qualityProfile,
      r.categoryMatch ? 1 : 0,
      r.predictionConfidence.toFixed(4),
      r.metrics.precision.toFixed(4),
      r.metrics.recall.toFixed(4),
      r.metrics.f1Score.toFixed(4),
      r.metrics.cer.toFixed(4),
      r.metrics.wer.toFixed(4),
      r.metrics.exactMatch ? 1 : 0,
      r.metrics.matchedFieldsCount,
      r.metrics.totalFieldsCount,
    ]);

    return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
  }
}
