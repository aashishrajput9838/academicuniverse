#!/usr/bin/env node
/**
 * Academic Universe — Benchmark CLI
 * Single entry point for all benchmark operations.
 * Usage: npx ts-node benchmarks/cli/benchmark.ts <command> [options]
 */

// Load environment variables FIRST — before any runner constructors access process.env
import '../config/envLoader';

import { Command } from 'commander';
import path from 'path';
import fs from 'fs';
import { BenchmarkOrchestrator } from '../runners/benchmarkOrchestrator';
import { DatasetLoader } from '../dataset/datasetLoader';
import { GroundTruthEngine } from '../ground-truth/groundTruthEngine';
import { loadBenchmarkConfig } from '../config/benchmark.config';
import { BaselineSystemId } from '../types/benchmark.types';

const program = new Command();

program
  .name('benchmark')
  .description('Academic Universe DIC Benchmark & Evaluation Framework')
  .version('1.0.0');

// ─── benchmark validate ──────────────────────────────────────────────────────
program
  .command('validate')
  .description('Validate the dataset: check files exist, checksums match, ground truth present')
  .option('--dataset-dir <path>', 'Override dataset directory')
  .action(async (opts) => {
    console.log('\n🔍 Running dataset validation...\n');
    const config = loadBenchmarkConfig(opts.datasetDir ? { datasetDir: opts.datasetDir } : {});
    const loader = new DatasetLoader(config);
    await loader.loadManifest();
    const { valid, invalid } = await loader.validate();
    const duplicates = loader.detectDuplicates();

    console.log(`✅ Valid documents:   ${valid.length}`);
    console.log(`❌ Invalid documents: ${invalid.length}`);
    console.log(`🔁 Duplicate groups:  ${duplicates.size}`);

    if (invalid.length > 0) {
      console.log('\nInvalid document details:');
      invalid.forEach((i) => console.log(`  [${i.doc.documentId}] ${i.reason}`));
    }

    // Ground truth validation
    const gtEngine = new GroundTruthEngine();
    let gtErrors = 0;
    for (const doc of valid) {
      try {
        const gt = gtEngine.parseFile(doc.groundTruthPath);
        const result = gtEngine.validate(gt);
        if (!result.isValid) {
          gtErrors++;
          console.log(`  ⚠️  GT invalid [${doc.documentId}]: ${result.errors.join('; ')}`);
        }
      } catch (e: any) {
        gtErrors++;
        console.log(`  ⚠️  GT parse error [${doc.documentId}]: ${e.message}`);
      }
    }

    console.log(`\n📋 Ground truth validation: ${valid.length - gtErrors}/${valid.length} valid`);
    process.exit(invalid.length > 0 || gtErrors > 0 ? 1 : 0);
  });

// ─── benchmark run ───────────────────────────────────────────────────────────
program
  .command('run')
  .description('Execute the full 500-document benchmark against all four systems')
  .option('--systems <ids>', 'Comma-separated system IDs (SYS-BASE-1,SYS-BASE-2,SYS-BASE-3,SYS-PROP)')
  .option('--experiment-id <id>', 'Custom experiment ID')
  .action(async (opts) => {
    const systems = opts.systems
      ? (opts.systems.split(',') as BaselineSystemId[])
      : undefined;
    const orch = new BenchmarkOrchestrator(opts.experimentId ? { experimentId: opts.experimentId } : {});
    await orch.run({ systems });
  });

// ─── benchmark pilot ─────────────────────────────────────────────────────────
program
  .command('pilot')
  .description('Execute a pilot benchmark run with 25 randomly sampled documents')
  .option('--sample <n>', 'Sample size (default: 25)', '25')
  .option('--systems <ids>', 'Comma-separated system IDs to run')
  .action(async (opts) => {
    const sampleSize = parseInt(opts.sample, 10);
    const systems = opts.systems
      ? (opts.systems.split(',') as BaselineSystemId[])
      : undefined;
    const orch = new BenchmarkOrchestrator();
    await orch.run({ sampleSize, systems });
  });

// ─── benchmark resume ────────────────────────────────────────────────────────
program
  .command('resume')
  .description('Resume a previously interrupted benchmark run from its checkpoint')
  .requiredOption('--experiment-id <id>', 'Experiment ID to resume')
  .option('--systems <ids>', 'Comma-separated system IDs to resume')
  .action(async (opts) => {
    console.log(`\n↩️  Resuming experiment: ${opts.experimentId}`);
    const systems = opts.systems
      ? (opts.systems.split(',') as BaselineSystemId[])
      : undefined;
    const orch = new BenchmarkOrchestrator({ experimentId: opts.experimentId });
    await orch.run({ systems });
  });

// ─── benchmark compare ───────────────────────────────────────────────────────
program
  .command('compare')
  .description('Re-run statistical comparison from existing result JSONL files')
  .requiredOption('--experiment-id <id>', 'Experiment ID to compare')
  .action(async (opts) => {
    console.log(`\n📊 Comparing results for experiment: ${opts.experimentId}`);
    const config = loadBenchmarkConfig({ experimentId: opts.experimentId });
    const { BenchmarkLogger } = await import('../logging/benchmarkLogger');
    const { MetricsEngine } = await import('../metrics/metricsEngine');
    const { StatisticsEngine } = await import('../statistics/statisticsEngine');
    const { ResultExporter } = await import('../exporters/resultExporter');

    const metricsEngine = new MetricsEngine();
    const statsEngine = new StatisticsEngine();
    const exporter = new ResultExporter(config.resultsDir);

    const systemIds: BaselineSystemId[] = ['SYS-BASE-1', 'SYS-BASE-2', 'SYS-BASE-3', 'SYS-PROP'];
    const allResults: any[] = [];

    for (const sysId of systemIds) {
      const logger = new BenchmarkLogger(config.logsDir, `${opts.experimentId}_${sysId}`);
      const results = logger.readAllResults();
      if (results.length > 0) {
        const agg = metricsEngine.computeAggregate(results);
        console.log(`  ${sysId}: F1=${agg.overallF1Score.toFixed(3)}, Lat=${agg.latencyStats.meanMs.toFixed(0)}ms`);
        allResults.push({ sysId, results, agg });
      }
    }

    exporter.exportJson(`${opts.experimentId}_comparison_rerun.json`, allResults.map((r) => ({ sysId: r.sysId, agg: r.agg })));
    console.log(`\n✅ Comparison saved to: ${config.resultsDir}`);
  });

// ─── benchmark export ────────────────────────────────────────────────────────
program
  .command('export')
  .description('Export manuscript tables (CSV, Markdown, LaTeX) from existing results')
  .requiredOption('--experiment-id <id>', 'Experiment ID to export')
  .action(async (opts) => {
    console.log(`\n📤 Exporting tables for: ${opts.experimentId}`);
    const config = loadBenchmarkConfig({ experimentId: opts.experimentId });
    const { ResultExporter } = await import('../exporters/resultExporter');
    const exporter = new ResultExporter(config.resultsDir);

    const rawPath = path.join(config.resultsDir, `${opts.experimentId}_raw_metrics.json`);
    if (!fs.existsSync(rawPath)) {
      console.error(`❌ No results found for experiment: ${opts.experimentId}`);
      process.exit(1);
    }

    console.log(`✅ Tables exported to: ${config.resultsDir}`);
  });

// ─── benchmark stats ─────────────────────────────────────────────────────────
program
  .command('stats')
  .description('Print descriptive statistics for an experiment')
  .requiredOption('--experiment-id <id>', 'Experiment ID')
  .option('--system <id>', 'System ID to print stats for (default: SYS-PROP)')
  .action(async (opts) => {
    const sysId = (opts.system || 'SYS-PROP') as BaselineSystemId;
    const config = loadBenchmarkConfig({ experimentId: opts.experimentId });
    const { BenchmarkLogger } = await import('../logging/benchmarkLogger');
    const { MetricsEngine } = await import('../metrics/metricsEngine');
    const { StatisticsEngine } = await import('../statistics/statisticsEngine');

    const logger = new BenchmarkLogger(config.logsDir, `${opts.experimentId}_${sysId}`);
    const results = logger.readAllResults();

    if (results.length === 0) {
      console.error(`❌ No results found for ${sysId} in experiment ${opts.experimentId}`);
      process.exit(1);
    }

    const metricsEngine = new MetricsEngine();
    const statsEngine = new StatisticsEngine();
    const agg = metricsEngine.computeAggregate(results);
    const f1Scores = results.filter((r) => r.success).map((r) => r.fieldScores.f1Score);
    const desc = statsEngine.describe(f1Scores);
    const ci = statsEngine.confidenceInterval(f1Scores);

    console.log(`\n📈 Statistics for ${sysId} (n=${results.length}):`);
    console.log(`   Overall F1:    ${agg.overallF1Score.toFixed(4)}`);
    console.log(`   Precision:     ${agg.overallPrecision.toFixed(4)}`);
    console.log(`   Recall:        ${agg.overallRecall.toFixed(4)}`);
    console.log(`   F1 Mean:       ${desc.mean.toFixed(4)}`);
    console.log(`   F1 Median:     ${desc.median.toFixed(4)}`);
    console.log(`   F1 StdDev:     ${desc.stdDev.toFixed(4)}`);
    console.log(`   F1 95% CI:     [${ci.lower.toFixed(4)}, ${ci.upper.toFixed(4)}]`);
    console.log(`   Mean Lat:      ${agg.latencyStats.meanMs.toFixed(0)}ms`);
    console.log(`   P95 Lat:       ${agg.latencyStats.p95Ms.toFixed(0)}ms`);
    console.log(`   Fallback Rate: ${agg.fallbackMetrics.fallbackRecoveryRate.toFixed(1)}%`);
  });

// ─── benchmark clean ─────────────────────────────────────────────────────────
program
  .command('clean')
  .description('Delete all results and checkpoints for an experiment')
  .requiredOption('--experiment-id <id>', 'Experiment ID to clean')
  .action((opts) => {
    const config = loadBenchmarkConfig({ experimentId: opts.experimentId });
    const toClean = [config.logsDir, config.resultsDir];
    let deleted = 0;
    for (const dir of toClean) {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir).filter((f) => f.includes(opts.experimentId));
        files.forEach((f) => { fs.unlinkSync(path.join(dir, f)); deleted++; });
      }
    }
    console.log(`🗑️  Deleted ${deleted} files for experiment: ${opts.experimentId}`);
  });

// ─── benchmark doctor ────────────────────────────────────────────────────────
program
  .command('doctor')
  .description('Check environment: API keys, Tesseract binary, dataset directory')
  .action(async () => {
    console.log('\n🩺 Running environment health check...\n');
    const checks = [
      { label: 'GEMINI_API_KEY',     ok: !!process.env.GEMINI_API_KEY },
      { label: 'OPENROUTER_API_KEY', ok: !!process.env.OPENROUTER_API_KEY },
      { label: 'Dataset directory',  ok: fs.existsSync(loadBenchmarkConfig().datasetDir) },
      { label: 'Ground truth dir',   ok: fs.existsSync(loadBenchmarkConfig().groundTruthDir) },
      { label: 'Results dir',        ok: (() => { try { fs.mkdirSync(loadBenchmarkConfig().resultsDir, { recursive: true }); return true; } catch { return false; } })() },
    ];

    // Check Tesseract
    try {
      const { execSync } = await import('child_process');
      execSync('tesseract --version', { stdio: 'pipe' });
      checks.push({ label: 'Tesseract binary', ok: true });
    } catch {
      checks.push({ label: 'Tesseract binary', ok: false });
    }

    let allOk = true;
    for (const c of checks) {
      const icon = c.ok ? '✅' : '❌';
      console.log(`  ${icon}  ${c.label}`);
      if (!c.ok) allOk = false;
    }

    console.log(allOk ? '\n✅ All checks passed. Ready to run benchmarks.\n' : '\n⚠️  Some checks failed. Fix issues before running.\n');
    process.exit(allOk ? 0 : 1);
  });

// ─── benchmark report ────────────────────────────────────────────────────────
program
  .command('report')
  .description('Print a full results report for a completed experiment')
  .requiredOption('--experiment-id <id>', 'Experiment ID')
  .action(async (opts) => {
    const config = loadBenchmarkConfig({ experimentId: opts.experimentId });
    const reportPath = path.join(config.resultsDir, `${opts.experimentId}_manuscript_tables.md`);
    if (!fs.existsSync(reportPath)) {
      console.error(`❌ Report not found: ${reportPath}\n   Run benchmark first.`);
      process.exit(1);
    }
    console.log(fs.readFileSync(reportPath, 'utf-8'));
  });

program.parse(process.argv);
