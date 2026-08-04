/**
 * ReportGenerator.ts
 *
 * Generates a self-contained output directory for each benchmark run containing:
 * - predictions.json
 * - comparisons.json
 * - metrics.json
 * - execution.log
 * - summary.md
 */

import * as fs from 'fs';
import * as path from 'path';
import type {
  BenchmarkRunReport,
  SampleComparisonResult,
  BenchmarkPrediction,
} from '../types/benchmark.types';

export class ReportGenerator {
  /**
   * Writes all self-contained report files for a benchmark run into outDir/runId/
   */
  public static saveRunReport(
    outBaseDir: string,
    report: BenchmarkRunReport,
    predictions: BenchmarkPrediction[],
    comparisons: SampleComparisonResult[],
    logs: string[]
  ): string {
    const runDir = path.resolve(outBaseDir, report.runId);
    fs.mkdirSync(runDir, { recursive: true });

    // 1. Write predictions.json
    fs.writeFileSync(
      path.join(runDir, 'predictions.json'),
      JSON.stringify(predictions, null, 2),
      'utf-8'
    );

    // 2. Write comparisons.json
    fs.writeFileSync(
      path.join(runDir, 'comparisons.json'),
      JSON.stringify(comparisons, null, 2),
      'utf-8'
    );

    // 3. Write metrics.json
    fs.writeFileSync(
      path.join(runDir, 'metrics.json'),
      JSON.stringify(report, null, 2),
      'utf-8'
    );

    // 4. Write execution.log
    fs.writeFileSync(
      path.join(runDir, 'execution.log'),
      logs.join('\n'),
      'utf-8'
    );

    // 5. Write summary.md
    const summaryMd = this.generateSummaryMarkdown(report);
    fs.writeFileSync(
      path.join(runDir, 'summary.md'),
      summaryMd,
      'utf-8'
    );

    return runDir;
  }

  private static generateSummaryMarkdown(report: BenchmarkRunReport): string {
    return `# AU DIC Benchmark Evaluation Summary

**Run ID**: \`${report.runId}\`  
**Timestamp**: \`${report.timestamp}\`  
**Dataset Path**: \`${report.datasetPath}\`  
**Duration**: ${report.durationSeconds.toFixed(2)}s  

---

## 1. Overall Performance Metrics

| Metric | Score | Target Standard | Status |
| :--- | :---: | :---: | :---: |
| **Category Accuracy** | **${(report.overallCategoryAccuracy * 100).toFixed(2)}%** | ≥ 90.00% | ${report.overallCategoryAccuracy >= 0.9 ? 'PASS' : 'WARNING'} |
| **Field F1 Score** | **${(report.overallMeanF1 * 100).toFixed(2)}%** | ≥ 85.00% | ${report.overallMeanF1 >= 0.85 ? 'PASS' : 'WARNING'} |
| **Mean CER** | **${(report.overallMeanCer * 100).toFixed(2)}%** | ≤ 5.00% | ${report.overallMeanCer <= 0.05 ? 'PASS' : 'WARNING'} |
| **Mean WER** | **${(report.overallMeanWer * 100).toFixed(2)}%** | ≤ 10.00% | ${report.overallMeanWer <= 0.10 ? 'PASS' : 'WARNING'} |
| **Exact Match Rate** | **${(report.overallExactMatchRate * 100).toFixed(2)}%** | ≥ 80.00% | ${report.overallExactMatchRate >= 0.8 ? 'PASS' : 'WARNING'} |

---

## 2. Quality Profile Degradation Breakdown

| Quality Profile | Evaluated Samples | Category Accuracy | Mean CER | Mean F1 Score | Exact Match Rate |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **clean** | ${report.profileBreakdown.clean.totalSamples} | ${(report.profileBreakdown.clean.categoryAccuracy * 100).toFixed(2)}% | ${(report.profileBreakdown.clean.meanCer * 100).toFixed(2)}% | ${(report.profileBreakdown.clean.meanF1 * 100).toFixed(2)}% | ${(report.profileBreakdown.clean.exactMatchRate * 100).toFixed(2)}% |
| **scanner_copy** | ${report.profileBreakdown.scanner_copy.totalSamples} | ${(report.profileBreakdown.scanner_copy.categoryAccuracy * 100).toFixed(2)}% | ${(report.profileBreakdown.scanner_copy.meanCer * 100).toFixed(2)}% | ${(report.profileBreakdown.scanner_copy.meanF1 * 100).toFixed(2)}% | ${(report.profileBreakdown.scanner_copy.exactMatchRate * 100).toFixed(2)}% |
| **mobile_camera** | ${report.profileBreakdown.mobile_camera.totalSamples} | ${(report.profileBreakdown.mobile_camera.categoryAccuracy * 100).toFixed(2)}% | ${(report.profileBreakdown.mobile_camera.meanCer * 100).toFixed(2)}% | ${(report.profileBreakdown.mobile_camera.meanF1 * 100).toFixed(2)}% | ${(report.profileBreakdown.mobile_camera.exactMatchRate * 100).toFixed(2)}% |
| **rotated_90** | ${report.profileBreakdown.rotated_90.totalSamples} | ${(report.profileBreakdown.rotated_90.categoryAccuracy * 100).toFixed(2)}% | ${(report.profileBreakdown.rotated_90.meanCer * 100).toFixed(2)}% | ${(report.profileBreakdown.rotated_90.meanF1 * 100).toFixed(2)}% | ${(report.profileBreakdown.rotated_90.exactMatchRate * 100).toFixed(2)}% |

---

## 3. Document Category Performance Breakdown

| Document Category | Evaluated Samples | Category Accuracy | Mean CER | Mean F1 Score | Exact Match Rate |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **certificates** | ${report.categoryBreakdown.certificate.totalSamples} | ${(report.categoryBreakdown.certificate.categoryAccuracy * 100).toFixed(2)}% | ${(report.categoryBreakdown.certificate.meanCer * 100).toFixed(2)}% | ${(report.categoryBreakdown.certificate.meanF1 * 100).toFixed(2)}% | ${(report.categoryBreakdown.certificate.exactMatchRate * 100).toFixed(2)}% |
| **marksheets** | ${report.categoryBreakdown.marksheet.totalSamples} | ${(report.categoryBreakdown.marksheet.categoryAccuracy * 100).toFixed(2)}% | ${(report.categoryBreakdown.marksheet.meanCer * 100).toFixed(2)}% | ${(report.categoryBreakdown.marksheet.meanF1 * 100).toFixed(2)}% | ${(report.categoryBreakdown.marksheet.exactMatchRate * 100).toFixed(2)}% |
| **student_ids** | ${report.categoryBreakdown.student_id.totalSamples} | ${(report.categoryBreakdown.student_id.categoryAccuracy * 100).toFixed(2)}% | ${(report.categoryBreakdown.student_id.meanCer * 100).toFixed(2)}% | ${(report.categoryBreakdown.student_id.meanF1 * 100).toFixed(2)}% | ${(report.categoryBreakdown.student_id.exactMatchRate * 100).toFixed(2)}% |
---

## 4. Confidence Calibration Metrics

| Confidence Metric | Score | Explanation |
| :--- | :---: | :--- |
| **Average Confidence (Overall)** | **${(report.confidenceMetrics.averageConfidence * 100).toFixed(2)}%** | Mean confidence across all evaluations |
| **Average Confidence (Correct)** | **${(report.confidenceMetrics.averageConfidenceCorrect * 100).toFixed(2)}%** | Mean confidence for accurate predictions |
| **Average Confidence (Incorrect)**| **${(report.confidenceMetrics.averageConfidenceIncorrect * 100).toFixed(2)}%** | Mean confidence for inaccurate predictions |
| **Overconfidence Gap** | **${(report.confidenceMetrics.overconfidenceGap * 100).toFixed(2)}%** | Calibration discrepancy penalty |

---

## 5. Structured Error Taxonomy Frequency Breakdown

| Error Category | Frequency Count | Description |
| :--- | :---: | :--- |
| **OCR_ERROR** | ${report.errorTaxonomySummary.OCR_ERROR} | Misread characters/digits from raw scan/photo |
| **FIELD_MISSING** | ${report.errorTaxonomySummary.FIELD_MISSING} | Ground truth expected value omitted by model |
| **HALLUCINATION** | ${report.errorTaxonomySummary.HALLUCINATION} | Model predicted value not present in ground truth |
| **FORMAT_ERROR** | ${report.errorTaxonomySummary.FORMAT_ERROR} | Unparseable or invalid date/number string format |
| **NORMALIZATION_ERROR** | ${report.errorTaxonomySummary.NORMALIZATION_ERROR} | Post-canonical string representation mismatch |
| **PARTIAL_MATCH** | ${report.errorTaxonomySummary.PARTIAL_MATCH} | Partial character similarity (0.01 < CER <= 0.50) |
| **LOW_CONFIDENCE** | ${report.errorTaxonomySummary.LOW_CONFIDENCE} | Prediction confidence score < 0.70 |
| **CATEGORY_ERROR** | ${report.errorTaxonomySummary.CATEGORY_ERROR} | Misclassified document type category |

---

## 6. Performance Diagnostics & Quality Profile Leaderboard

| Diagnostic Parameter | Identified Finding | Key Insight |
| :--- | :---: | :--- |
| **Best Performing Profile** | **${report.robustnessAnalysis.bestPerformingProfile}** | Highest field F1 and category classification accuracy |
| **Worst Performing Profile** | **${report.robustnessAnalysis.worstPerformingProfile}** | Profile exhibiting highest decay and error rate |
| **Most Difficult Field** | **${report.robustnessAnalysis.mostDifficultField}** | Field with highest total extraction discrepancies |
| **Most Common Error Class** | **${report.robustnessAnalysis.mostCommonErrorCategory}** | Top error taxonomy category across benchmark dataset |
`;
  }
}
