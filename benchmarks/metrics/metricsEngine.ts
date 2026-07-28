/**
 * Academic Universe — Metrics Engine
 * Aggregates per-document evaluation results into publication-ready metrics.
 */

import {
  DocumentEvaluationResult,
  AggregateMetrics,
  DocumentCategory,
} from '../types/benchmark.types';

export class MetricsEngine {
  /**
   * Compute aggregate metrics from a batch of document evaluation results.
   */
  computeAggregate(results: DocumentEvaluationResult[]): AggregateMetrics {
    const successful = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);

    // Overall extraction scores
    const totalTP = this.sum(successful.map((r) => r.fieldScores.truePositives));
    const totalFP = this.sum(successful.map((r) => r.fieldScores.falsePositives));
    const totalFN = this.sum(successful.map((r) => r.fieldScores.falseNegatives));
    const overallPrecision = totalTP + totalFP > 0 ? totalTP / (totalTP + totalFP) : 0;
    const overallRecall = totalTP + totalFN > 0 ? totalTP / (totalTP + totalFN) : 0;
    const overallF1 =
      overallPrecision + overallRecall > 0
        ? (2 * overallPrecision * overallRecall) / (overallPrecision + overallRecall)
        : 0;

    // Latency statistics
    const latencies = successful.map((r) => r.latencyMs.totalPipelineMs);
    const latencyStats = this.computeLatencyStats(latencies);

    // Fallback metrics
    const fallbackAttempts = successful.filter((r) => r.fallbackTriggered).length;
    const fallbackSuccesses = successful.filter(
      (r) => r.fallbackTriggered && r.success
    ).length;
    const fallbackRecoveryRate =
      fallbackAttempts > 0 ? (fallbackSuccesses / fallbackAttempts) * 100 : 0;

    // HITL metrics
    const reviewDurations = successful.map((r) => r.hitlMetrics.reviewDurationSec);
    const totalCorrected = this.sum(successful.map((r) => r.hitlMetrics.fieldsCorrected));
    const totalExtractedFields = this.sum(
      successful.map(
        (r) => r.fieldScores.truePositives + r.fieldScores.falsePositives + r.fieldScores.falseNegatives
      )
    );
    const humanCorrectionRate =
      totalExtractedFields > 0 ? (totalCorrected / totalExtractedFields) * 100 : 0;

    // Category breakdown — covers all categories the document classifier can produce
    const categories = [
      'MARKSHEET', 'TRANSCRIPT', 'CERTIFICATE',
      'WORKSHOP_CERTIFICATE', 'INTERNSHIP_CERTIFICATE', 'HACKATHON_CERTIFICATE',
      'TIMETABLE', 'EXAM_TIMETABLE', 'ADMIT_CARD',
      'FEE_RECEIPT', 'STUDENT_ID', 'UNKNOWN', 'EDGE_CASE',
    ] as const;
    const categoryBreakdown: AggregateMetrics['categoryBreakdown'] = {} as any;

    for (const cat of categories) {
      const catResults = successful.filter((r) => r.category === cat);
      if (catResults.length === 0) {
        categoryBreakdown[cat] = { count: 0, precision: 0, recall: 0, f1Score: 0, meanLatencyMs: 0 };
        continue;
      }
      const catTP = this.sum(catResults.map((r) => r.fieldScores.truePositives));
      const catFP = this.sum(catResults.map((r) => r.fieldScores.falsePositives));
      const catFN = this.sum(catResults.map((r) => r.fieldScores.falseNegatives));
      const p = catTP + catFP > 0 ? catTP / (catTP + catFP) : 0;
      const r = catTP + catFN > 0 ? catTP / (catTP + catFN) : 0;
      const f1 = p + r > 0 ? (2 * p * r) / (p + r) : 0;
      const meanLat = this.mean(catResults.map((res) => res.latencyMs.totalPipelineMs));

      categoryBreakdown[cat] = { count: catResults.length, precision: p, recall: r, f1Score: f1, meanLatencyMs: meanLat };
    }

    return {
      totalDocuments: results.length,
      successfulEvaluations: successful.length,
      failedEvaluations: failed.length,
      overallPrecision,
      overallRecall,
      overallF1Score: overallF1,
      latencyStats,
      fallbackMetrics: {
        totalFallbackAttempts: fallbackAttempts,
        successfulFallbacks: fallbackSuccesses,
        fallbackRecoveryRate,
      },
      hitlMetrics: {
        meanReviewDurationSec: this.mean(reviewDurations),
        humanCorrectionRate,
      },
      categoryBreakdown,
    };
  }

  /**
   * Compute per-field metrics across all documents for a given system.
   */
  computePerFieldMetrics(
    results: DocumentEvaluationResult[]
  ): Map<string, { tp: number; fp: number; fn: number; precision: number; recall: number; f1: number }> {
    const fieldMap = new Map<string, { tp: number; fp: number; fn: number }>();

    for (const res of results) {
      if (!res.success) continue;
      for (const fm of res.fieldMatches) {
        const existing = fieldMap.get(fm.fieldName) || { tp: 0, fp: 0, fn: 0 };
        if (fm.isMatch) {
          existing.tp++;
        } else if (fm.actual !== null && fm.actual !== undefined) {
          existing.fp++;
        } else {
          existing.fn++;
        }
        fieldMap.set(fm.fieldName, existing);
      }
    }

    const result = new Map<string, { tp: number; fp: number; fn: number; precision: number; recall: number; f1: number }>();
    for (const [field, counts] of fieldMap) {
      const p = counts.tp + counts.fp > 0 ? counts.tp / (counts.tp + counts.fp) : 0;
      const r = counts.tp + counts.fn > 0 ? counts.tp / (counts.tp + counts.fn) : 0;
      const f1 = p + r > 0 ? (2 * p * r) / (p + r) : 0;
      result.set(field, { ...counts, precision: p, recall: r, f1 });
    }

    return result;
  }

  // --- Helpers ---

  private computeLatencyStats(values: number[]): AggregateMetrics['latencyStats'] {
    if (values.length === 0) {
      return { meanMs: 0, medianMs: 0, p95Ms: 0, p99Ms: 0, minMs: 0, maxMs: 0 };
    }
    const sorted = [...values].sort((a, b) => a - b);
    return {
      meanMs: this.mean(sorted),
      medianMs: this.percentile(sorted, 50),
      p95Ms: this.percentile(sorted, 95),
      p99Ms: this.percentile(sorted, 99),
      minMs: sorted[0],
      maxMs: sorted[sorted.length - 1],
    };
  }

  private mean(arr: number[]): number {
    if (arr.length === 0) return 0;
    return arr.reduce((s, v) => s + v, 0) / arr.length;
  }

  private sum(arr: number[]): number {
    return arr.reduce((s, v) => s + v, 0);
  }

  private percentile(sorted: number[], pct: number): number {
    if (sorted.length === 0) return 0;
    const idx = Math.ceil((pct / 100) * sorted.length) - 1;
    return sorted[Math.max(0, Math.min(idx, sorted.length - 1))];
  }
}
