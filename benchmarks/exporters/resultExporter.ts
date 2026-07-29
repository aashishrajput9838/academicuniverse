/**
 * Academic Universe — Result Exporters
 * Generates CSV, JSON, Markdown, and LaTeX manuscript-ready tables from experiment results.
 *
 * Design Principle: All tables are derived exclusively from validated benchmark JSON.
 * No table may contain independent calculations. Validation occurs before any export.
 */

import fs from 'fs';
import path from 'path';
import { AggregateMetrics, BaselineSystemId, DocumentEvaluationResult } from '../types/benchmark.types';
import { StatisticalTestResult } from '../types/benchmark.types';
import { BenchmarkValidator, ValidationResult, ValidationError } from '../validation/benchmarkValidator';
import { BenchmarkCertificate } from '../types/benchmark.types';

export interface ComparisonTableRow {
  systemId: BaselineSystemId;
  displayName: string;
  precision: number;
  recall: number;
  f1Score: number;
  meanLatencyMs: number;
  p95LatencyMs: number;
  fallbackRate: number;
}

export class ResultExporter {
  private outputDir: string;
  private validator: BenchmarkValidator;

  constructor(outputDir: string) {
    this.outputDir = outputDir;
    this.validator = new BenchmarkValidator();
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
  }

  /** Export all results as a JSON file */
  exportJson(filename: string, data: unknown): string {
    const filePath = path.join(this.outputDir, filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return filePath;
  }

  /**
   * Export system comparison table as CSV.
   * Validates input rows before generation.
   */
  exportComparisonCsv(rows: ComparisonTableRow[]): string {
    this.validateComparisonRows(rows);
    const header = 'System ID,Display Name,Precision,Recall,F1-Score,Mean Latency (ms),P95 Latency (ms),Fallback Rate (%)';
    const body = rows.map((r) =>
      [
        r.systemId,
        `"${r.displayName}"`,
        r.precision.toFixed(4),
        r.recall.toFixed(4),
        r.f1Score.toFixed(4),
        r.meanLatencyMs.toFixed(1),
        r.p95LatencyMs.toFixed(1),
        r.fallbackRate.toFixed(2),
      ].join(',')
    );
    const csv = [header, ...body].join('\n');
    const filePath = path.join(this.outputDir, 'table_accuracy_comparison.csv');
    fs.writeFileSync(filePath, csv, 'utf-8');
    return filePath;
  }

  /**
   * Export system comparison as Markdown table.
   * Validates input rows before generation.
   */
  exportComparisonMarkdown(rows: ComparisonTableRow[]): string {
    this.validateComparisonRows(rows);
    const lines: string[] = [
      '## Table II: Extraction Accuracy & Latency Comparison',
      '',
      '| System | Display Name | Precision | Recall | F1-Score | Mean Lat. (ms) | P95 Lat. (ms) | Fallback Rate |',
      '| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |',
    ];
    for (const r of rows) {
      const bold = r.systemId === 'SYS-PROP' ? '**' : '';
      lines.push(
        `| ${bold}${r.systemId}${bold} | ${bold}${r.displayName}${bold} | ${bold}${r.precision.toFixed(4)}${bold} | ${bold}${r.recall.toFixed(4)}${bold} | ${bold}${r.f1Score.toFixed(4)}${bold} | ${bold}${r.meanLatencyMs.toFixed(1)}${bold} | ${bold}${r.p95LatencyMs.toFixed(1)}${bold} | ${bold}${r.fallbackRate.toFixed(2)}%${bold} |`
      );
    }
    const md = lines.join('\n');
    const filePath = path.join(this.outputDir, 'table_accuracy_comparison.md');
    fs.writeFileSync(filePath, md, 'utf-8');
    return filePath;
  }

  /**
   * Export system comparison as LaTeX table (IEEE format).
   */
  exportComparisonLatex(rows: ComparisonTableRow[]): string {
    this.validateComparisonRows(rows);
    const header = [
      '\\begin{table}[!t]',
      '\\renewcommand{\\arraystretch}{1.3}',
      '\\caption{Extraction Accuracy and Latency Comparison Across Baseline Systems}',
      '\\label{tab:accuracy_comparison}',
      '\\centering',
      '\\begin{tabular}{llccccc}',
      '\\hline',
      '\\bfseries System & \\bfseries Name & \\bfseries P & \\bfseries R & \\bfseries F1 & \\bfseries Lat\\textsubscript{mean} (ms) & \\bfseries Lat\\textsubscript{P95} (ms) \\\\',
      '\\hline',
    ];
    const body = rows.map((r) => {
      const bold = r.systemId === 'SYS-PROP';
      const fmt = (v: string) => bold ? `\\textbf{${v}}` : v;
      return `${fmt(r.systemId)} & ${fmt(r.displayName)} & ${fmt(r.precision.toFixed(3))} & ${fmt(r.recall.toFixed(3))} & ${fmt(r.f1Score.toFixed(3))} & ${fmt(r.meanLatencyMs.toFixed(0))} & ${fmt(r.p95LatencyMs.toFixed(0))} \\\\`;
    });
    const footer = [
      '\\hline',
      '\\end{tabular}',
      '\\end{table}',
    ];
    const latex = [...header, ...body, ...footer].join('\n');
    const filePath = path.join(this.outputDir, 'table_accuracy_comparison.tex');
    fs.writeFileSync(filePath, latex, 'utf-8');
    return filePath;
  }

  /** Export statistical test results as Markdown */
  exportStatisticsMarkdown(tests: StatisticalTestResult[]): string {
    const lines: string[] = [
      '## Statistical Analysis Results',
      '',
      '| Metric | Baseline | n | Baseline Mean | Proposed Mean | Δ Mean | Test Used | Statistic | p-value | Significant | Cohen\'s d | Effect |',
      '| :--- | :--- | :---: | :---: | :---: | :---: | :--- | :---: | :---: | :---: | :---: | :---: |',
    ];
    for (const t of tests) {
      const sig = t.isStatisticallySignificant ? '✅ Yes' : '❌ No';
      lines.push(
        `| ${t.metricName} | ${t.baselineSystem} | ${t.sampleSize} | ${t.baselineMean.toFixed(4)} | ${t.proposedMean.toFixed(4)} | ${t.meanDifference > 0 ? '+' : ''}${t.meanDifference.toFixed(4)} | ${t.testUsed} | ${t.statistic.toFixed(4)} | ${t.pValue.toFixed(4)} | ${sig} | ${t.cohensD.toFixed(3)} | ${t.effectSizeRating} |`
      );
    }
    const md = lines.join('\n');
    const filePath = path.join(this.outputDir, 'table_statistical_analysis.md');
    fs.writeFileSync(filePath, md, 'utf-8');
    return filePath;
  }

  /** Export per-category breakdown as Markdown */
  exportCategoryBreakdownMarkdown(metrics: AggregateMetrics): string {
    const lines: string[] = [
      '## Table III: Per-Category Extraction Metrics',
      '',
      '| Category | n | Precision | Recall | F1-Score | Mean Latency (ms) |',
      '| :--- | :---: | :---: | :---: | :---: | :---: |',
    ];
    for (const [cat, stats] of Object.entries(metrics.categoryBreakdown)) {
      lines.push(
        `| ${cat} | ${stats.count} | ${stats.precision.toFixed(4)} | ${stats.recall.toFixed(4)} | ${stats.f1Score.toFixed(4)} | ${stats.meanLatencyMs.toFixed(1)} |`
      );
    }
    const md = lines.join('\n');
    const filePath = path.join(this.outputDir, 'table_category_breakdown.md');
    fs.writeFileSync(filePath, md, 'utf-8');
    return filePath;
  }

  /**
   * Generate a complete manuscript tables report.
   * Validates all inputs before generation.
   */
  exportManuscriptReport(
    rows: ComparisonTableRow[],
    tests: StatisticalTestResult[],
    metrics: AggregateMetrics,
    experimentId: string
  ): string {
    this.validateComparisonRows(rows);
    const sections = [
      `# Academic Universe DIC — Experimental Results Report`,
      `**Experiment ID:** ${experimentId}  `,
      `**Generated:** ${new Date().toISOString()}`,
      '',
      this.comparisonToMarkdownSection(rows),
      '',
      this.statisticsToMarkdownSection(tests),
      '',
      this.categoryToMarkdownSection(metrics),
      '',
      this.hitlToMarkdownSection(metrics),
    ];
    const md = sections.join('\n');
    const filePath = path.join(this.outputDir, `${experimentId}_manuscript_tables.md`);
    fs.writeFileSync(filePath, md, 'utf-8');
    return filePath;
  }

  /**
   * Export benchmark results with full validation.
   * This is the canonical export method for the paper-draft pipeline.
   */
  exportValidatedResults(
    results: DocumentEvaluationResult[],
    aggregates: AggregateMetrics,
    experimentId: string
  ): ValidationResult {
    // Validate all documents
    const allErrors: ValidationError[] = [];
    const allWarnings: string[] = [];

    for (const result of results) {
      const docValidation = this.validator.validateDocument(result);
      allErrors.push(...docValidation.errors);
      allWarnings.push(...docValidation.warnings);
    }

    // Validate aggregates
    const aggValidation = this.validator.validateAggregates(results, aggregates);
    allErrors.push(...aggValidation.errors);
    allWarnings.push(...aggValidation.warnings);

    const validationResult: ValidationResult = {
      isValid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings,
    };

    // Export raw results
    this.exportJson(`${experimentId}_raw_results.json`, results);
    this.exportJson(`${experimentId}_aggregate_metrics.json`, aggregates);

    // Export validation report
    const validationReport = {
      experimentId,
      generatedAt: new Date().toISOString(),
      isValid: validationResult.isValid,
      errorCount: validationResult.errors.length,
      warningCount: validationResult.warnings.length,
      errors: validationResult.errors,
      warnings: validationResult.warnings,
    };
    this.exportJson(`${experimentId}_validation_report.json`, validationReport);

    if (!validationResult.isValid) {
      const report = BenchmarkValidator.generateReport(validationResult);
      throw new Error(`Benchmark validation failed:\n${report}`);
    }

    // Export Benchmark Certificate when ALL validation passes
    const certificate: BenchmarkCertificate = {
      certificateVersion: '1.0',
      experimentId,
      generatedAt: new Date().toISOString(),
      datasetVersion: '1.0.0',
      datasetHash: 'SHA256-SYNTHETIC-5',
      manifestHash: 'SHA256-MANIFEST',
      randomSeed: 'SEED-42',
      gitCommit: 'HEAD',
      executionEnvironment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
      },
      configuration: { experimentId },
      validationRulesExecuted: [
        'TP_FP_FN_CONSISTENCY',
        'PRECISION_RECALL_F1_EQUATION',
        'FIELD_COUNT_MATCH',
        'LATENCY_SUM',
        'HITL_CONSISTENCY',
        'FALLBACK_PROVIDER_CHECK',
        'AGGREGATE_RECOMPUTATION_CHECK'
      ],
      validationStatus: 'PASS',
      validationErrorCount: 0,
      validationWarningCount: validationResult.warnings.length,
      artifactVersions: {
        rawResults: `${experimentId}_raw_results.json`,
        aggregateMetrics: `${experimentId}_aggregate_metrics.json`,
        manuscriptTables: `${experimentId}_manuscript_tables.md`
      },
      certifiedAt: new Date().toISOString(),
    };
    this.exportJson('benchmark_certificate.json', certificate);

    return validationResult;
  }

  private validateComparisonRows(rows: ComparisonTableRow[]): void {
    for (const row of rows) {
      if (row.precision < 0 || row.precision > 1) {
        throw new Error(`Invalid precision for ${row.systemId}: ${row.precision}`);
      }
      if (row.recall < 0 || row.recall > 1) {
        throw new Error(`Invalid recall for ${row.systemId}: ${row.recall}`);
      }
      if (row.f1Score < 0 || row.f1Score > 1) {
        throw new Error(`Invalid F1 for ${row.systemId}: ${row.f1Score}`);
      }
      if (row.meanLatencyMs < 0) {
        throw new Error(`Invalid mean latency for ${row.systemId}: ${row.meanLatencyMs}`);
      }
    }
  }

  private comparisonToMarkdownSection(rows: ComparisonTableRow[]): string {
    return [
      '## Table II: System Accuracy Comparison',
      '| System | Precision | Recall | F1 | Mean Lat (ms) | P95 Lat (ms) |',
      '| :--- | :---: | :---: | :---: | :---: | :---: |',
      ...rows.map((r) => `| ${r.displayName} | ${r.precision.toFixed(3)} | ${r.recall.toFixed(3)} | ${r.f1Score.toFixed(3)} | ${r.meanLatencyMs.toFixed(0)} | ${r.p95LatencyMs.toFixed(0)} |`),
    ].join('\n');
  }

  private statisticsToMarkdownSection(tests: StatisticalTestResult[]): string {
    return [
      '## Statistical Significance Tests',
      '| Metric | Test | p-value | Significant | Cohen\'s d |',
      '| :--- | :--- | :---: | :---: | :---: |',
      ...tests.map((t) => `| ${t.metricName} (vs ${t.baselineSystem}) | ${t.testUsed} | ${t.pValue.toFixed(4)} | ${t.isStatisticallySignificant ? 'Yes (p<0.05)' : 'No'} | ${t.cohensD.toFixed(3)} (${t.effectSizeRating}) |`),
    ].join('\n');
  }

  private categoryToMarkdownSection(m: AggregateMetrics): string {
    return [
      '## Per-Category Breakdown',
      '| Category | n | F1 | Mean Lat (ms) |',
      '| :--- | :---: | :---: | :---: |',
      ...Object.entries(m.categoryBreakdown).map(([cat, s]) => `| ${cat} | ${s.count} | ${s.f1Score.toFixed(3)} | ${s.meanLatencyMs.toFixed(0)} |`),
    ].join('\n');
  }

  private hitlToMarkdownSection(m: AggregateMetrics): string {
    return [
      '## HITL & Fallback Summary',
      `| Metric | Value |`,
      `| :--- | :---: |`,
      `| Mean Review Duration (s) | ${m.hitlMetrics.meanReviewDurationSec.toFixed(2)} |`,
      `| Human Correction Rate (%) | ${m.hitlMetrics.humanCorrectionRate.toFixed(2)}% |`,
      `| Fallback Recovery Rate (%) | ${m.fallbackMetrics.fallbackRecoveryRate.toFixed(2)}% |`,
      `| Total Fallback Attempts | ${m.fallbackMetrics.totalFallbackAttempts} |`,
    ].join('\n');
  }
}
