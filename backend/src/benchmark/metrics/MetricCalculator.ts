/**
 * MetricCalculator.ts
 *
 * Metric Aggregation Engine for computing overall benchmark statistics,
 * category accuracy, mean CER/WER/F1, and quality profile decay metrics.
 */

import { ConfusionMatrixEvaluator } from '../evaluators/ConfusionMatrixEvaluator';
import { ProfileRobustnessEvaluator } from '../evaluators/ProfileRobustnessEvaluator';
import { ReproducibilityUtils } from '../utils/reproducibility';
import type {
  SampleComparisonResult,
  BenchmarkRunReport,
  QualityProfile,
  DocumentCategory,
  ProfileMetricsSummary,
  CategoryMetricsSummary,
  ConfidenceMetrics,
  ErrorCategory,
} from '../types/benchmark.types';

export class MetricCalculator {
  /**
   * Aggregate list of sample comparison results into a full BenchmarkRunReport.
   */
  public static calculateRunReport(
    runId: string,
    datasetPath: string,
    durationSeconds: number,
    results: SampleComparisonResult[]
  ): BenchmarkRunReport {
    const totalSamples = results.length;
    if (totalSamples === 0) {
      return this.emptyReport(runId, datasetPath, durationSeconds);
    }

    let categoryMatchesCount = 0;
    let exactMatchesCount = 0;
    let sumPrecision = 0;
    let sumRecall = 0;
    let sumF1 = 0;
    let sumCer = 0;
    let sumWer = 0;

    const errorTaxonomySummary: Record<ErrorCategory, number> = {
      OCR_ERROR: 0,
      NORMALIZATION_ERROR: 0,
      FORMAT_ERROR: 0,
      HALLUCINATION: 0,
      FIELD_MISSING: 0,
      FIELD_EXTRA: 0,
      PARTIAL_MATCH: 0,
      LOW_CONFIDENCE: 0,
      CATEGORY_ERROR: 0,
    };

    const profileGroups: Record<string, SampleComparisonResult[]> = {
      clean: [],
      scanner_copy: [],
      mobile_camera: [],
      rotated_90: [],
    };

    const categoryGroups: Record<string, SampleComparisonResult[]> = {
      certificate: [],
      marksheet: [],
      student_id: [],
    };

    for (const res of results) {
      if (res.categoryMatch) categoryMatchesCount++;
      if (res.metrics.exactMatch) exactMatchesCount++;

      sumPrecision += res.metrics.precision;
      sumRecall += res.metrics.recall;
      sumF1 += res.metrics.f1Score;
      sumCer += res.metrics.cer;
      sumWer += res.metrics.wer;

      // Tabulate error taxonomy
      for (const disc of res.discrepancies) {
        if (disc.errorCategory && errorTaxonomySummary[disc.errorCategory] !== undefined) {
          errorTaxonomySummary[disc.errorCategory]++;
        }
      }

      if (profileGroups[res.qualityProfile]) {
        profileGroups[res.qualityProfile].push(res);
      }
      if (categoryGroups[res.documentType]) {
        categoryGroups[res.documentType].push(res);
      }
    }

    const confidenceMetrics = this.calculateConfidenceMetrics(results);

    const profileBreakdown = {
      clean: this.calculateGroupSummary(profileGroups.clean),
      scanner_copy: this.calculateGroupSummary(profileGroups.scanner_copy),
      mobile_camera: this.calculateGroupSummary(profileGroups.mobile_camera),
      rotated_90: this.calculateGroupSummary(profileGroups.rotated_90),
    };

    const categoryBreakdown = {
      certificate: this.calculateGroupSummary(categoryGroups.certificate),
      marksheet: this.calculateGroupSummary(categoryGroups.marksheet),
      student_id: this.calculateGroupSummary(categoryGroups.student_id),
    };

    const confusionMatrix = ConfusionMatrixEvaluator.computeConfusionMatrix(results);
    const robustnessAnalysis = ProfileRobustnessEvaluator.analyzeRobustness(results, errorTaxonomySummary);

    const metadata = {
      runId,
      timestamp: new Date().toISOString(),
      datasetHash: ReproducibilityUtils.computeDatasetHash(datasetPath),
      benchmarkVersion: '1.0.0',
      gitCommit: ReproducibilityUtils.getGitCommit(),
    };

    const performance = {
      durationSeconds,
      throughputSamplesPerSec: durationSeconds > 0 ? totalSamples / durationSeconds : totalSamples,
      meanLatencyMsPerSample: totalSamples > 0 ? (durationSeconds * 1000) / totalSamples : 0,
    };

    return {
      metadata,
      performance,
      runId,
      timestamp: metadata.timestamp,
      datasetPath,
      durationSeconds,
      totalSamples,
      successfulEvaluations: totalSamples,
      failedEvaluations: 0,
      overallCategoryAccuracy: categoryMatchesCount / totalSamples,
      overallMeanPrecision: sumPrecision / totalSamples,
      overallMeanRecall: sumRecall / totalSamples,
      overallMeanF1: sumF1 / totalSamples,
      overallMeanCer: sumCer / totalSamples,
      overallMeanWer: sumWer / totalSamples,
      overallExactMatchRate: exactMatchesCount / totalSamples,
      confidenceMetrics,
      errorTaxonomySummary,
      confusionMatrix,
      robustnessAnalysis,
      profileBreakdown,
      categoryBreakdown,
    };
  }

  private static calculateGroupSummary(samples: SampleComparisonResult[]): ProfileMetricsSummary {
    const total = samples.length;
    if (total === 0) {
      return {
        totalSamples: 0,
        categoryAccuracy: 0.0,
        meanCer: 0.0,
        meanWer: 0.0,
        meanF1: 0.0,
        exactMatchRate: 0.0,
        confidenceMetrics: {
          averageConfidence: 0,
          averageConfidenceCorrect: 0,
          averageConfidenceIncorrect: 0,
          overconfidenceGap: 0,
        },
      };
    }

    let catMatches = 0;
    let exactMatches = 0;
    let sumCer = 0;
    let sumWer = 0;
    let sumF1 = 0;

    for (const s of samples) {
      if (s.categoryMatch) catMatches++;
      if (s.metrics.exactMatch) exactMatches++;
      sumCer += s.metrics.cer;
      sumWer += s.metrics.wer;
      sumF1 += s.metrics.f1Score;
    }

    return {
      totalSamples: total,
      categoryAccuracy: catMatches / total,
      meanCer: sumCer / total,
      meanWer: sumWer / total,
      meanF1: sumF1 / total,
      exactMatchRate: exactMatches / total,
      confidenceMetrics: this.calculateConfidenceMetrics(samples),
    };
  }

  private static calculateConfidenceMetrics(samples: SampleComparisonResult[]): ConfidenceMetrics {
    if (samples.length === 0) {
      return {
        averageConfidence: 0,
        averageConfidenceCorrect: 0,
        averageConfidenceIncorrect: 0,
        overconfidenceGap: 0,
      };
    }

    let sumAllConf = 0;
    let sumCorrectConf = 0;
    let correctCount = 0;
    let sumIncorrectConf = 0;
    let incorrectCount = 0;

    for (const s of samples) {
      const conf = s.predictionConfidence ?? 0;
      sumAllConf += conf;

      if (s.categoryMatch && s.metrics.exactMatch) {
        sumCorrectConf += conf;
        correctCount++;
      } else {
        sumIncorrectConf += conf;
        incorrectCount++;
      }
    }

    const avgConf = sumAllConf / samples.length;
    const avgConfCorrect = correctCount > 0 ? sumCorrectConf / correctCount : 0;
    const avgConfIncorrect = incorrectCount > 0 ? sumIncorrectConf / incorrectCount : 0;
    const overconfidenceGap = avgConfIncorrect;

    return {
      averageConfidence: avgConf,
      averageConfidenceCorrect: avgConfCorrect,
      averageConfidenceIncorrect: avgConfIncorrect,
      overconfidenceGap,
    };
  }

  private static emptyReport(
    runId: string,
    datasetPath: string,
    durationSeconds: number
  ): BenchmarkRunReport {
    const emptyConf: ConfidenceMetrics = {
      averageConfidence: 0,
      averageConfidenceCorrect: 0,
      averageConfidenceIncorrect: 0,
      overconfidenceGap: 0,
    };

    const emptyGroup: ProfileMetricsSummary = {
      totalSamples: 0,
      categoryAccuracy: 0,
      meanCer: 0,
      meanWer: 0,
      meanF1: 0,
      exactMatchRate: 0,
      confidenceMetrics: { ...emptyConf },
    };

    const metadata = {
      runId,
      timestamp: new Date().toISOString(),
      datasetHash: ReproducibilityUtils.computeDatasetHash(datasetPath),
      benchmarkVersion: '1.0.0',
      gitCommit: ReproducibilityUtils.getGitCommit(),
    };

    const performance = {
      durationSeconds,
      throughputSamplesPerSec: 0,
      meanLatencyMsPerSample: 0,
    };

    return {
      metadata,
      performance,
      runId,
      timestamp: metadata.timestamp,
      datasetPath,
      durationSeconds,
      totalSamples: 0,
      successfulEvaluations: 0,
      failedEvaluations: 0,
      overallCategoryAccuracy: 0,
      overallMeanPrecision: 0,
      overallMeanRecall: 0,
      overallMeanF1: 0,
      overallMeanCer: 0,
      overallMeanWer: 0,
      overallExactMatchRate: 0,
      confidenceMetrics: { ...emptyConf },
      errorTaxonomySummary: {
        OCR_ERROR: 0,
        NORMALIZATION_ERROR: 0,
        FORMAT_ERROR: 0,
        HALLUCINATION: 0,
        FIELD_MISSING: 0,
        FIELD_EXTRA: 0,
        PARTIAL_MATCH: 0,
        LOW_CONFIDENCE: 0,
        CATEGORY_ERROR: 0,
      },
      confusionMatrix: [],
      robustnessAnalysis: {
        bestPerformingProfile: 'clean',
        worstPerformingProfile: 'rotated_90',
        mostDifficultField: 'candidateName',
        mostCommonErrorCategory: 'OCR_ERROR',
        fieldRobustnessMatrix: {},
        errorHeatmap: {},
      },
      profileBreakdown: {
        clean: { ...emptyGroup },
        scanner_copy: { ...emptyGroup },
        mobile_camera: { ...emptyGroup },
        rotated_90: { ...emptyGroup },
      },
      categoryBreakdown: {
        certificate: { ...emptyGroup },
        marksheet: { ...emptyGroup },
        student_id: { ...emptyGroup },
      },
    };
  }
}
