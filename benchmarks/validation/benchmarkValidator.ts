/**
 * Academic Universe — Benchmark Validation Engine
 *
 * Validates all mathematical invariants, consistency rules, and data integrity
 * for benchmark evaluation results BEFORE any artifact generation.
 *
 * FAIL-FAST PRINCIPLE: No invalid benchmark result may ever reach table generation,
 * manuscript binding, or artifact export.
 *
 * HITL invariants enforced (per architectural decisions):
 *   Decision 1: reviewRequired=true with fieldsCorrected=0 is VALID.
 *   Decision 2: fieldsCorrected > 0 → reviewRequired must be true AND reviewDurationSec > 0.
 *   Decision 3: reviewDurationSec measures human review time, not correction time.
 *   Decision 4: fallbackTriggered does NOT imply reviewRequired.
 *
 * RCA-9 FIX: meanReviewDurationSec denominator is successfulEvaluations (all docs),
 *            not docsWithReview. This matches MetricsEngine.computeAggregate().
 */

import {
  DocumentEvaluationResult,
  AggregateMetrics,
  FieldMatchResult,
  BaselineSystemId,
} from '../types/benchmark.types';
import { computeFieldMetrics } from '../metrics/metricsCalculator';

export interface ValidationError {
  documentId: string;
  systemId: string;
  field: string;
  expected: unknown;
  actual: unknown;
  violation: string;
  suggestedFix: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: string[];
}

export class BenchmarkValidator {
  /**
   * Validate a single document evaluation result.
   * Checks all mathematical invariants for TP/FP/FN, P/R/F1,
   * latency totals, and HITL consistency.
   */
  validateDocument(result: DocumentEvaluationResult): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    if (!result.success) {
      return { isValid: true, errors: [], warnings: ['Skipping validation for failed document'] };
    }

    this.validateFieldScores(result, errors);
    this.validateLatency(result, errors);
    this.validateHITL(result, errors, warnings);
    this.validateFallback(result, errors, warnings);

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate aggregate metrics against per-document results.
   *
   * RCA-9 FIX: HITL mean denominator is successfulEvaluations (all successful docs),
   * matching MetricsEngine.computeAggregate() — not only docs with review.
   */
  validateAggregates(
    results: DocumentEvaluationResult[],
    aggregates: AggregateMetrics
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    const successful = results.filter((r) => r.success);
    const systemId = results[0]?.systemId || 'UNKNOWN';

    // ─── 1. Recompute aggregate TP/FP/FN ────────────────────────────────────
    let totalTP = 0, totalFP = 0, totalFN = 0;
    for (const result of successful) {
      const docMetrics = this.computeMetricsFromFieldMatches(result.fieldMatches);
      totalTP += docMetrics.tp;
      totalFP += docMetrics.fp;
      totalFN += docMetrics.fn;
    }

    const expectedPrecision = totalTP + totalFP > 0 ? totalTP / (totalTP + totalFP) : 0;
    const expectedRecall = totalTP + totalFN > 0 ? totalTP / (totalTP + totalFN) : 0;
    const expectedF1 = expectedPrecision + expectedRecall > 0
      ? (2 * expectedPrecision * expectedRecall) / (expectedPrecision + expectedRecall)
      : 0;

    if (Math.abs(aggregates.overallPrecision - expectedPrecision) > 1e-9) {
      errors.push({
        documentId: 'AGGREGATE', systemId,
        field: 'overallPrecision',
        expected: expectedPrecision,
        actual: aggregates.overallPrecision,
        violation: `Aggregate precision ${aggregates.overallPrecision} ≠ recomputed ${expectedPrecision}`,
        suggestedFix: 'Recompute via MetricsEngine.computeAggregate(results)',
      });
    }

    if (Math.abs(aggregates.overallRecall - expectedRecall) > 1e-9) {
      errors.push({
        documentId: 'AGGREGATE', systemId,
        field: 'overallRecall',
        expected: expectedRecall,
        actual: aggregates.overallRecall,
        violation: `Aggregate recall ${aggregates.overallRecall} ≠ recomputed ${expectedRecall}`,
        suggestedFix: 'Recompute via MetricsEngine.computeAggregate(results)',
      });
    }

    if (Math.abs(aggregates.overallF1Score - expectedF1) > 1e-9) {
      errors.push({
        documentId: 'AGGREGATE', systemId,
        field: 'overallF1Score',
        expected: expectedF1,
        actual: aggregates.overallF1Score,
        violation: `Aggregate F1 ${aggregates.overallF1Score} ≠ recomputed ${expectedF1}`,
        suggestedFix: 'Recompute via MetricsEngine.computeAggregate(results)',
      });
    }

    // ─── 2. Validate latency mean ────────────────────────────────────────────
    if (successful.length > 0) {
      const expectedMeanLat =
        successful.reduce((s, r) => s + r.latencyMs.totalPipelineMs, 0) / successful.length;
      if (Math.abs(aggregates.latencyStats.meanMs - expectedMeanLat) > 1e-9) {
        errors.push({
          documentId: 'AGGREGATE', systemId,
          field: 'latencyStats.meanMs',
          expected: expectedMeanLat,
          actual: aggregates.latencyStats.meanMs,
          violation: `Mean latency ${aggregates.latencyStats.meanMs} ≠ computed ${expectedMeanLat}`,
          suggestedFix: 'Recompute mean latency from per-document latencyMs.totalPipelineMs',
        });
      }
    }

    // ─── 3. Validate fallback counts ─────────────────────────────────────────
    const totalFallbackAttempts = successful.filter((r) => r.fallbackTriggered).length;
    if (aggregates.fallbackMetrics.totalFallbackAttempts !== totalFallbackAttempts) {
      errors.push({
        documentId: 'AGGREGATE', systemId,
        field: 'fallbackMetrics.totalFallbackAttempts',
        expected: totalFallbackAttempts,
        actual: aggregates.fallbackMetrics.totalFallbackAttempts,
        violation: `Fallback count ${aggregates.fallbackMetrics.totalFallbackAttempts} ≠ actual ${totalFallbackAttempts}`,
        suggestedFix: 'Recompute from per-document fallbackTriggered flags',
      });
    }

    // ─── 4. Validate HITL metrics (RCA-9 fix: denominator = successfulEvaluations) ──
    const expectedTotalReview = successful.reduce((s, r) => s + r.hitlMetrics.reviewDurationSec, 0);
    const expectedTotalCorrected = successful.reduce((s, r) => s + r.hitlMetrics.fieldsCorrected, 0);
    const expectedDocsWithReview = successful.filter((r) => r.hitlMetrics.reviewRequired).length;
    const expectedDocsWithCorrections = successful.filter((r) => r.hitlMetrics.fieldsCorrected > 0).length;
    // Mean denominator: ALL successful docs (not just reviewed ones)
    const expectedMeanReview = successful.length > 0 ? expectedTotalReview / successful.length : 0;

    if (aggregates.hitlMetrics.totalDocsWithReview !== expectedDocsWithReview) {
      errors.push({
        documentId: 'AGGREGATE', systemId,
        field: 'hitlMetrics.totalDocsWithReview',
        expected: expectedDocsWithReview,
        actual: aggregates.hitlMetrics.totalDocsWithReview,
        violation: `Docs with review ${aggregates.hitlMetrics.totalDocsWithReview} ≠ actual ${expectedDocsWithReview}`,
        suggestedFix: 'Count documents where hitlMetrics.reviewRequired = true',
      });
    }

    if (aggregates.hitlMetrics.totalDocsWithCorrections !== expectedDocsWithCorrections) {
      errors.push({
        documentId: 'AGGREGATE', systemId,
        field: 'hitlMetrics.totalDocsWithCorrections',
        expected: expectedDocsWithCorrections,
        actual: aggregates.hitlMetrics.totalDocsWithCorrections,
        violation: `Docs with corrections ${aggregates.hitlMetrics.totalDocsWithCorrections} ≠ actual ${expectedDocsWithCorrections}`,
        suggestedFix: 'Count documents where hitlMetrics.fieldsCorrected > 0',
      });
    }

    if (Math.abs(aggregates.hitlMetrics.totalReviewDurationSec - expectedTotalReview) > 1e-9) {
      errors.push({
        documentId: 'AGGREGATE', systemId,
        field: 'hitlMetrics.totalReviewDurationSec',
        expected: expectedTotalReview,
        actual: aggregates.hitlMetrics.totalReviewDurationSec,
        violation: `Total review duration ${aggregates.hitlMetrics.totalReviewDurationSec} ≠ sum ${expectedTotalReview}`,
        suggestedFix: 'Sum all hitlMetrics.reviewDurationSec values',
      });
    }

    if (aggregates.hitlMetrics.totalFieldsCorrected !== expectedTotalCorrected) {
      errors.push({
        documentId: 'AGGREGATE', systemId,
        field: 'hitlMetrics.totalFieldsCorrected',
        expected: expectedTotalCorrected,
        actual: aggregates.hitlMetrics.totalFieldsCorrected,
        violation: `Total corrections ${aggregates.hitlMetrics.totalFieldsCorrected} ≠ sum ${expectedTotalCorrected}`,
        suggestedFix: 'Sum all hitlMetrics.fieldsCorrected values',
      });
    }

    if (Math.abs(aggregates.hitlMetrics.meanReviewDurationSec - expectedMeanReview) > 1e-9) {
      errors.push({
        documentId: 'AGGREGATE', systemId,
        field: 'hitlMetrics.meanReviewDurationSec',
        expected: expectedMeanReview,
        actual: aggregates.hitlMetrics.meanReviewDurationSec,
        violation: `Mean review duration ${aggregates.hitlMetrics.meanReviewDurationSec} ≠ computed ${expectedMeanReview}. ` +
                   `Denominator must be successfulEvaluations (${successful.length}), not docsWithReview.`,
        suggestedFix: 'Compute as totalReviewDurationSec / successfulEvaluations',
      });
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate a complete benchmark experiment before artifact generation.
   */
  validateExperiment(
    resultsBySystem: Map<BaselineSystemId, DocumentEvaluationResult[]>,
    aggregatesBySystem: Map<BaselineSystemId, AggregateMetrics>
  ): ValidationResult {
    const allErrors: ValidationError[] = [];
    const allWarnings: string[] = [];

    for (const [systemId, results] of resultsBySystem) {
      for (const result of results) {
        const docValidation = this.validateDocument(result);
        allErrors.push(...docValidation.errors);
        allWarnings.push(...docValidation.warnings);
      }
      const agg = aggregatesBySystem.get(systemId);
      if (agg) {
        const aggValidation = this.validateAggregates(results, agg);
        allErrors.push(...aggValidation.errors);
        allWarnings.push(...aggValidation.warnings);
      }
    }

    return { isValid: allErrors.length === 0, errors: allErrors, warnings: allWarnings };
  }

  // ─── Per-document validators ──────────────────────────────────────────────

  private validateFieldScores(
    result: DocumentEvaluationResult,
    errors: ValidationError[]
  ): void {
    const computed = this.computeMetricsFromFieldMatches(result.fieldMatches);
    const stored = result.fieldScores;

    if (computed.tp !== stored.truePositives) {
      errors.push({
        documentId: result.documentId, systemId: result.systemId,
        field: 'truePositives',
        expected: computed.tp, actual: stored.truePositives,
        violation: `Stored TP (${stored.truePositives}) ≠ computed TP (${computed.tp}) from fieldMatches`,
        suggestedFix: 'Count isMatch=true fields in fieldMatches',
      });
    }

    if (computed.fp !== stored.falsePositives) {
      errors.push({
        documentId: result.documentId, systemId: result.systemId,
        field: 'falsePositives',
        expected: computed.fp, actual: stored.falsePositives,
        violation: `Stored FP (${stored.falsePositives}) ≠ computed FP (${computed.fp}) from fieldMatches`,
        suggestedFix: 'Count isMatch=false AND actual≠null fields in fieldMatches',
      });
    }

    if (computed.fn !== stored.falseNegatives) {
      errors.push({
        documentId: result.documentId, systemId: result.systemId,
        field: 'falseNegatives',
        expected: computed.fn, actual: stored.falseNegatives,
        violation: `Stored FN (${stored.falseNegatives}) ≠ computed FN (${computed.fn}) from fieldMatches`,
        suggestedFix: 'Count isMatch=false AND actual=null fields in fieldMatches',
      });
    }

    const expectedP = computed.tp + computed.fp > 0 ? computed.tp / (computed.tp + computed.fp) : 0;
    const expectedR = computed.tp + computed.fn > 0 ? computed.tp / (computed.tp + computed.fn) : 0;
    const expectedF1 = expectedP + expectedR > 0
      ? (2 * expectedP * expectedR) / (expectedP + expectedR)
      : 0;

    if (Math.abs(stored.precision - expectedP) > 1e-9) {
      errors.push({
        documentId: result.documentId, systemId: result.systemId,
        field: 'precision',
        expected: expectedP, actual: stored.precision,
        violation: `Precision ${stored.precision} ≠ TP/(TP+FP) = ${expectedP}`,
        suggestedFix: 'Recompute as TP/(TP+FP)',
      });
    }

    if (Math.abs(stored.recall - expectedR) > 1e-9) {
      errors.push({
        documentId: result.documentId, systemId: result.systemId,
        field: 'recall',
        expected: expectedR, actual: stored.recall,
        violation: `Recall ${stored.recall} ≠ TP/(TP+FN) = ${expectedR}`,
        suggestedFix: 'Recompute as TP/(TP+FN)',
      });
    }

    if (Math.abs(stored.f1Score - expectedF1) > 1e-9) {
      errors.push({
        documentId: result.documentId, systemId: result.systemId,
        field: 'f1Score',
        expected: expectedF1, actual: stored.f1Score,
        violation: `F1 ${stored.f1Score} ≠ 2PR/(P+R) = ${expectedF1}`,
        suggestedFix: 'Recompute as 2*P*R/(P+R)',
      });
    }

    // TP+FP+FN must equal total fieldMatches count
    const total = result.fieldMatches.length;
    if (computed.tp + computed.fp + computed.fn !== total) {
      errors.push({
        documentId: result.documentId, systemId: result.systemId,
        field: 'fieldScores',
        expected: `TP+FP+FN = ${total}`,
        actual: `TP+FP+FN = ${computed.tp + computed.fp + computed.fn}`,
        violation: `TP+FP+FN (${computed.tp + computed.fp + computed.fn}) ≠ fieldMatches count (${total}). Impossible state.`,
        suggestedFix: 'Every fieldMatch must contribute to exactly one of TP, FP, FN',
      });
    }
  }

  private validateLatency(result: DocumentEvaluationResult, errors: ValidationError[]): void {
    const { uploadMs, aiInferenceMs, dbStagingMs, totalPipelineMs } = result.latencyMs;
    const computedTotal = uploadMs + aiInferenceMs + dbStagingMs;

    if (Math.abs(totalPipelineMs - computedTotal) > 1e-9) {
      errors.push({
        documentId: result.documentId, systemId: result.systemId,
        field: 'latencyMs.totalPipelineMs',
        expected: computedTotal, actual: totalPipelineMs,
        violation: `Total latency (${totalPipelineMs}ms) ≠ upload+ai+db (${computedTotal}ms)`,
        suggestedFix: 'Set totalPipelineMs = uploadMs + aiInferenceMs + dbStagingMs',
      });
    }

    if (uploadMs < 0 || aiInferenceMs < 0 || dbStagingMs < 0 || totalPipelineMs < 0) {
      errors.push({
        documentId: result.documentId, systemId: result.systemId,
        field: 'latencyMs',
        expected: 'all >= 0',
        actual: `upload=${uploadMs}, ai=${aiInferenceMs}, db=${dbStagingMs}, total=${totalPipelineMs}`,
        violation: 'Negative latency values detected',
        suggestedFix: 'Ensure all latency measurements are non-negative',
      });
    }
  }

  /**
   * Validate HITL metrics per the locked architectural decisions.
   * Decision 1: reviewRequired=true with fieldsCorrected=0 is VALID.
   * Decision 2: fieldsCorrected > 0 → reviewRequired must be true AND reviewDurationSec > 0.
   * Decision 3: reviewDurationSec measures review time, not correction time.
   * Decision 4: fallbackTriggered does NOT imply reviewRequired.
   */
  private validateHITL(
    result: DocumentEvaluationResult,
    errors: ValidationError[],
    warnings: string[]
  ): void {
    const { reviewRequired, reviewDurationSec, fieldsCorrected, finalAction } = result.hitlMetrics;

    // Decision 2: corrections without review is impossible
    if (fieldsCorrected > 0 && !reviewRequired) {
      errors.push({
        documentId: result.documentId, systemId: result.systemId,
        field: 'hitlMetrics.reviewRequired',
        expected: true, actual: reviewRequired,
        violation: `fieldsCorrected=${fieldsCorrected} but reviewRequired=false. Corrections require a review.`,
        suggestedFix: 'Set reviewRequired=true when fieldsCorrected > 0',
      });
    }

    if (fieldsCorrected > 0 && reviewDurationSec === 0) {
      errors.push({
        documentId: result.documentId, systemId: result.systemId,
        field: 'hitlMetrics.reviewDurationSec',
        expected: '> 0', actual: reviewDurationSec,
        violation: `fieldsCorrected=${fieldsCorrected} but reviewDurationSec=0. Corrections require review time.`,
        suggestedFix: 'Set reviewDurationSec > 0 when fieldsCorrected > 0',
      });
    }

    // reviewRequired must be consistent with reviewDurationSec
    if (reviewRequired && reviewDurationSec === 0) {
      errors.push({
        documentId: result.documentId, systemId: result.systemId,
        field: 'hitlMetrics.reviewDurationSec',
        expected: '> 0', actual: reviewDurationSec,
        violation: `reviewRequired=true but reviewDurationSec=0. Review requires positive duration.`,
        suggestedFix: 'Set reviewDurationSec > 0 when reviewRequired=true',
      });
    }

    if (!reviewRequired && reviewDurationSec > 0) {
      errors.push({
        documentId: result.documentId, systemId: result.systemId,
        field: 'hitlMetrics.reviewRequired',
        expected: true, actual: reviewRequired,
        violation: `reviewDurationSec=${reviewDurationSec} but reviewRequired=false. Duration implies review occurred.`,
        suggestedFix: 'Set reviewRequired=true when reviewDurationSec > 0',
      });
    }

    // Negative values
    if (reviewDurationSec < 0 || fieldsCorrected < 0) {
      errors.push({
        documentId: result.documentId, systemId: result.systemId,
        field: 'hitlMetrics',
        expected: 'all >= 0',
        actual: `reviewDurationSec=${reviewDurationSec}, fieldsCorrected=${fieldsCorrected}`,
        violation: 'Negative HITL values detected',
        suggestedFix: 'Ensure all HITL metrics are non-negative',
      });
    }

    // Informational: review with finalAction=REJECTED is unusual
    if (reviewRequired && finalAction === 'REJECTED') {
      warnings.push(
        `${result.documentId}/${result.systemId}: reviewRequired=true but finalAction=REJECTED. Unusual but valid.`
      );
    }
  }

  private validateFallback(
    result: DocumentEvaluationResult,
    errors: ValidationError[],
    warnings: string[]
  ): void {
    if (result.fallbackTriggered && !result.fallbackProvider) {
      errors.push({
        documentId: result.documentId, systemId: result.systemId,
        field: 'fallbackProvider',
        expected: 'non-null provider name', actual: result.fallbackProvider,
        violation: 'fallbackTriggered=true but fallbackProvider is null',
        suggestedFix: 'Set fallbackProvider to the provider name when fallbackTriggered=true',
      });
    }

    if (!result.fallbackTriggered && result.fallbackProvider) {
      warnings.push(
        `${result.documentId}/${result.systemId}: fallbackProvider is set but fallbackTriggered=false`
      );
    }
  }

  // ─── Public utilities ─────────────────────────────────────────────────────

  /**
   * Compute TP/FP/FN from fieldMatches.
   * This is the canonical computation — must match stored fieldScores.
   */
  computeMetricsFromFieldMatches(fieldMatches: FieldMatchResult[]): {
    tp: number; fp: number; fn: number;
    precision: number; recall: number; f1: number;
  } {
    return computeFieldMetrics(fieldMatches);
  }

  /**
   * Recompute fieldScores for a result from its fieldMatches.
   * Returns the canonical metrics that should be stored.
   */
  recomputeFieldScores(fieldMatches: FieldMatchResult[]): {
    truePositives: number; falsePositives: number; falseNegatives: number;
    precision: number; recall: number; f1Score: number;
  } {
    const m = computeFieldMetrics(fieldMatches);
    return {
      truePositives: m.tp, falsePositives: m.fp, falseNegatives: m.fn,
      precision: m.precision, recall: m.recall, f1Score: m.f1,
    };
  }

  /**
   * Generate a human-readable validation report.
   */
  static generateReport(validation: ValidationResult): string {
    const lines: string[] = [
      `Validation Status: ${validation.isValid ? '✅ PASS' : '❌ FAIL'}`,
      `Errors: ${validation.errors.length}`,
      `Warnings: ${validation.warnings.length}`,
    ];

    if (validation.errors.length > 0) {
      lines.push('\nErrors:');
      for (const e of validation.errors) {
        lines.push(`  [${e.documentId}/${e.systemId}] ${e.field}: ${e.violation}`);
        lines.push(`    Expected : ${JSON.stringify(e.expected)}`);
        lines.push(`    Actual   : ${JSON.stringify(e.actual)}`);
        lines.push(`    Fix      : ${e.suggestedFix}`);
      }
    }

    if (validation.warnings.length > 0) {
      lines.push('\nWarnings:');
      for (const w of validation.warnings) {
        lines.push(`  ⚠️  ${w}`);
      }
    }

    return lines.join('\n');
  }
}
