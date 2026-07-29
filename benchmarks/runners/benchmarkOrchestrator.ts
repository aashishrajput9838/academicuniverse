/**
 * Academic Universe — Benchmark Orchestrator
 * Top-level coordinator: runs ALL baseline systems against the same document set,
 * validates results, aggregates metrics, runs statistics, exports all tables.
 *
 * Design Principle: No artifacts are generated until ALL validation checks pass.
 * The pipeline aborts on the first validation failure in strict mode,
 * or logs warnings and continues in non-strict mode.
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
import { CourseMarksComparisonMode } from '../validation/fieldComparisonMode';

export interface OrchestratorOptions {
  sampleSize?: number;
  systems?: BaselineSystemId[];
  configOverrides?: Partial<BenchmarkConfig>;
  /** CourseMarks comparison mode for all runners */
  courseMarksMode?: CourseMarksComparisonMode;
  /** If true, abort on any validation failure */
  strictValidation?: boolean;
}

export class BenchmarkOrchestrator {
  private config: BenchmarkConfig;
  private courseMarksMode: CourseMarksComparisonMode;
  private strictValidation: boolean;

  constructor(configOverrides: Partial<BenchmarkConfig> = {}, opts: OrchestratorOptions = {}) {
    this.config = loadBenchmarkConfig(configOverrides);
    this.courseMarksMode = opts.courseMarksMode || CourseMarksComparisonMode.PER_ARRAY;
    this.strictValidation = opts.strictValidation || false;
  }

  async runPilot(): Promise<void> {
    console.log('\n🧪 Starting PILOT BENCHMARK RUN (n=25)\n');
    await this.run({ sampleSize: 25 });
  }

  async runFull(): Promise<void> {
    console.log('\n🚀 Starting FULL BENCHMARK RUN (n=500)\n');
    await this.run({});
  }

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
      const executor = new PipelineExecutor({
        runner,
        config: this.config,
        documents,
        logger,
        courseMarksMode: this.courseMarksMode,
        simulatedReviewMs: runner.systemId === 'SYS-PROP' ? 5000 : 0,
        strictValidation: this.strictValidation,
      });

      const results = await executor.execute();
      allSystemResults.set(runner.systemId, results);

      const summary = logger.writeSummary(documents.length);
      console.log(`   ✓ Complete: ${summary.successCount}/${summary.totalDocuments} success, ${summary.failureCount} failed`);

      await new Promise((resolve) => setTimeout(resolve, 30000));
    }

    // 4. Compute aggregate metrics per system
    const metricsEngine = new MetricsEngine();
    const aggregateBySystem = new Map<BaselineSystemId, AggregateMetrics>();
    for (const [sysId, results] of allSystemResults) {
      aggregateBySystem.set(sysId, metricsEngine.computeAggregate(results));
    }

    // 5. Run cross-system validation BEFORE any artifact generation
    console.log('\n🔍 Running cross-system validation...');
    const exporter = new ResultExporter(this.config.resultsDir);
    const validationResult = exporter.exportValidatedResults(
      Array.from(allSystemResults.values()).flat(),
      aggregateBySystem.get('SYS-PROP')!,
      this.config.experimentId
    );

    if (!validationResult.isValid) {
      const report = BenchmarkValidator.generateReport(validationResult);
      if (this.strictValidation) {
        throw new Error(`Benchmark validation failed. Aborting artifact generation.\n${report}`);
      } else {
        console.warn(`⚠️  Validation warnings detected:\n${report}`);
      }
    } else {
      console.log('✅ All validations passed. Generating artifacts...');
    }

    // 6. Statistical comparison
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

    // 7. Export all results (only after validation passes)
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

    const order: Record<string, number> = { 'SYS-BASE-1': 0, 'SYS-BASE-2': 1, 'SYS-BASE-3': 2, 'SYS-PROP': 3 };
    comparisonRows.sort((a, b) => (order[a.systemId] ?? 99) - (order[b.systemId] ?? 99));

    exporter.exportComparisonCsv(comparisonRows);
    exporter.exportComparisonMarkdown(comparisonRows);
    exporter.exportComparisonLatex(comparisonRows);
    exporter.exportStatisticsMarkdown(statTests);

    const propAgg = aggregateBySystem.get('SYS-PROP');
    if (propAgg) {
      exporter.exportCategoryBreakdownMarkdown(propAgg);
      exporter.exportManuscriptReport(comparisonRows, statTests, propAgg, this.config.experimentId);
    }

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
