/**
 * Academic Universe — Benchmark Orchestrator
 * Top-level coordinator: runs ALL baseline systems against the same document set,
 * aggregates metrics, runs statistics, exports all tables and results.
 */

import path from 'path';
import { loadBenchmarkConfig, BenchmarkConfig } from '../config/benchmark.config';
import { DatasetLoader } from '../dataset/datasetLoader';
import { BenchmarkLogger } from '../logging/benchmarkLogger';
import { MetricsEngine } from '../metrics/metricsEngine';
import { StatisticsEngine } from '../statistics/statisticsEngine';
import { ResultExporter, ComparisonTableRow } from '../exporters/resultExporter';
import { PipelineExecutor } from './pipelineExecutor';
import { IBaselineRunner } from '../baselines/baselineRunner.interface';
import { TesseractRunner } from '../baselines/tesseractRunner';
import { GeminiSingleRunner } from '../baselines/geminiSingleRunner';
import { OpenRouterSingleRunner } from '../baselines/openRouterSingleRunner';
import { AcademicUniverseDICRunner } from '../baselines/academicUniverseDICRunner';
import { AggregateMetrics, BaselineSystemId, DocumentEvaluationResult } from '../types/benchmark.types';

export interface OrchestratorOptions {
  /** If set, only run a random sample of this size (for pilot runs) */
  sampleSize?: number;
  /** Which system IDs to run (default: all four) */
  systems?: BaselineSystemId[];
  /** Extra config overrides */
  configOverrides?: Partial<BenchmarkConfig>;
}

export class BenchmarkOrchestrator {
  private config: BenchmarkConfig;

  constructor(configOverrides: Partial<BenchmarkConfig> = {}) {
    this.config = loadBenchmarkConfig(configOverrides);
  }

  /** Execute pilot run (20-30 documents, all systems) */
  async runPilot(): Promise<void> {
    console.log('\n🧪 Starting PILOT BENCHMARK RUN (n=25)\n');
    await this.run({ sampleSize: 25 });
  }

  /** Execute full benchmark (all 500 documents, all systems) */
  async runFull(): Promise<void> {
    console.log('\n🚀 Starting FULL BENCHMARK RUN (n=500)\n');
    await this.run({});
  }

  /** Execute benchmark with custom options */
  async run(opts: OrchestratorOptions = {}): Promise<void> {
    const { sampleSize, systems } = opts;

    // 1. Load and validate dataset
    console.log('📂 Loading dataset manifest...');
    const datasetLoader = new DatasetLoader(this.config);
    const manifest = await datasetLoader.loadManifest();
    const { valid, invalid } = await datasetLoader.validate();

    if (invalid.length > 0) {
      console.warn(`⚠️  ${invalid.length} documents failed validation:`);
      invalid.forEach((i) => console.warn(`   - ${i.doc.documentId}: ${i.reason}`));
    }

    const duplicates = datasetLoader.detectDuplicates();
    if (duplicates.size > 0) {
      console.warn(`⚠️  ${duplicates.size} duplicate checksum groups detected. Review before proceeding.`);
    }

    // Apply sampling if requested
    const documents = sampleSize
      ? datasetLoader.sample(sampleSize, 42)
      : valid;

    console.log(`✅ ${documents.length} documents ready for benchmarking\n`);

    // 2. Build runner registry
    const allRunners: IBaselineRunner[] = [
      new TesseractRunner(),
      new GeminiSingleRunner(),
      new OpenRouterSingleRunner(),
      new AcademicUniverseDICRunner(),
    ];
    const activeRunners = systems
      ? allRunners.filter((r) => systems.includes(r.systemId))
      : allRunners;

    // 3. Execute each system
    const allSystemResults = new Map<BaselineSystemId, DocumentEvaluationResult[]>();

    for (const runner of activeRunners) {
      console.log(`\n▶ Running: ${runner.displayName} (${runner.systemId})`);
      const logger = new BenchmarkLogger(this.config.logsDir, `${this.config.experimentId}_${runner.systemId}`);
      const executor = new PipelineExecutor({ runner, config: this.config, documents, logger });

      const results = await executor.execute();
      allSystemResults.set(runner.systemId, results);

      const summary = logger.writeSummary(documents.length);
      console.log(`   ✓ Complete: ${summary.successCount}/${summary.totalDocuments} success, ${summary.failureCount} failed`);
    }

    // 4. Compute aggregate metrics per system
    const metricsEngine = new MetricsEngine();
    const aggregateBySystem = new Map<BaselineSystemId, AggregateMetrics>();
    for (const [sysId, results] of allSystemResults) {
      aggregateBySystem.set(sysId, metricsEngine.computeAggregate(results));
    }

    // 5. Statistical comparison (proposed system vs each baseline)
    const statsEngine = new StatisticsEngine();
    const propResults = allSystemResults.get('SYS-PROP') || [];
    const propF1Scores = propResults.map((r) => r.fieldScores.f1Score);
    const statTests = [];

    for (const [sysId, results] of allSystemResults) {
      if (sysId === 'SYS-PROP') continue;
      const baselineF1 = results.map((r) => r.fieldScores.f1Score);
      if (baselineF1.length > 0 && propF1Scores.length > 0) {
        const minLen = Math.min(baselineF1.length, propF1Scores.length);
        statTests.push(
          statsEngine.runComparison(
            'F1-Score',
            baselineF1.slice(0, minLen),
            propF1Scores.slice(0, minLen),
            sysId,
            'SYS-PROP',
            this.config.significanceAlpha
          )
        );
      }
    }

    // 6. Export all results
    const exporter = new ResultExporter(this.config.resultsDir);

    // Build comparison rows for tables
    const displayNames: Record<BaselineSystemId, string> = {
      'SYS-BASE-1': 'Tesseract OCR v5.0',
      'SYS-BASE-2': 'Gemini 1.5 Pro (Single)',
      'SYS-BASE-3': 'OpenRouter gpt-4o-mini',
      'SYS-PROP': 'AU DIC Hybrid (Proposed)',
    };

    const comparisonRows: ComparisonTableRow[] = [];
    for (const [sysId, agg] of aggregateBySystem) {
      comparisonRows.push({
        systemId: sysId,
        displayName: displayNames[sysId],
        precision: agg.overallPrecision,
        recall: agg.overallRecall,
        f1Score: agg.overallF1Score,
        meanLatencyMs: agg.latencyStats.meanMs,
        p95LatencyMs: agg.latencyStats.p95Ms,
        fallbackRate: agg.fallbackMetrics.fallbackRecoveryRate,
      });
    }

    // Sort: baselines ordered alphabetically, proposed last
    const order: Record<string, number> = { 'SYS-BASE-1': 0, 'SYS-BASE-2': 1, 'SYS-BASE-3': 2, 'SYS-PROP': 3 };
    comparisonRows.sort((a, b) => (order[a.systemId] ?? 99) - (order[b.systemId] ?? 99));

    const propAgg = aggregateBySystem.get('SYS-PROP');

    exporter.exportJson(`${this.config.experimentId}_raw_metrics.json`, Object.fromEntries(aggregateBySystem));
    exporter.exportJson(`${this.config.experimentId}_statistical_tests.json`, statTests);
    exporter.exportComparisonCsv(comparisonRows);
    exporter.exportComparisonMarkdown(comparisonRows);
    exporter.exportComparisonLatex(comparisonRows);
    exporter.exportStatisticsMarkdown(statTests);
    if (propAgg) {
      exporter.exportCategoryBreakdownMarkdown(propAgg);
      exporter.exportManuscriptReport(comparisonRows, statTests, propAgg, this.config.experimentId);
    }

    // 7. Print summary to console
    this.printConsoleSummary(aggregateBySystem, statTests);

    console.log(`\n📁 All results saved to: ${this.config.resultsDir}`);
    console.log(`📋 Manuscript tables: ${this.config.resultsDir}/${this.config.experimentId}_manuscript_tables.md\n`);
  }

  private printConsoleSummary(
    aggregates: Map<BaselineSystemId, AggregateMetrics>,
    statTests: any[]
  ): void {
    console.log('\n' + '═'.repeat(70));
    console.log('  BENCHMARK RESULTS SUMMARY');
    console.log('═'.repeat(70));
    console.log(
      `${'System'.padEnd(20)} ${'P'.padStart(8)} ${'R'.padStart(8)} ${'F1'.padStart(8)} ${'Lat(ms)'.padStart(10)}`
    );
    console.log('─'.repeat(70));

    for (const [sysId, agg] of aggregates) {
      const label = sysId === 'SYS-PROP' ? `★ ${sysId}` : `  ${sysId}`;
      console.log(
        `${label.padEnd(20)} ${agg.overallPrecision.toFixed(3).padStart(8)} ${agg.overallRecall.toFixed(3).padStart(8)} ${agg.overallF1Score.toFixed(3).padStart(8)} ${agg.latencyStats.meanMs.toFixed(0).padStart(10)}`
      );
    }

    console.log('─'.repeat(70));
    console.log('\n  STATISTICAL TESTS (α = 0.05):');
    for (const t of statTests) {
      const sig = t.isStatisticallySignificant ? '✅ Significant' : '❌ Not significant';
      console.log(`  ${t.baselineSystem} → SYS-PROP: p=${t.pValue.toFixed(4)}, d=${t.cohensD.toFixed(3)} (${t.effectSizeRating}) — ${sig}`);
    }
    console.log('═'.repeat(70) + '\n');
  }
}
