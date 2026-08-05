/**
 * run_dryrun_benchmark.ts
 *
 * Full end-to-end dry-run benchmark using mock predictions.
 * Validates the complete pipeline: GT loading → prediction → evaluation → metrics → report.
 * No live API calls are made. Uses deterministic mock predictions seeded from GT data.
 *
 * Run: npx ts-node --project tsconfig.json src/benchmark/runner/run_dryrun_benchmark.ts
 */

import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

import { BenchmarkRunner } from './BenchmarkRunner';

const datasetDir    = path.resolve(__dirname, '../../../../ADBG/AU_DIC_Benchmark_v1.0');
const reportsOutDir = path.resolve(__dirname, '../../../benchmark_reports');

async function main() {
  console.log('============================================================');
  console.log(' AU DIC BENCHMARK — DRY-RUN (MOCK) VALIDATION');
  console.log('============================================================');
  console.log(`Dataset:  ${datasetDir}`);
  console.log(`Reports:  ${reportsOutDir}\n`);

  const runner = new BenchmarkRunner({
    datasetDir,
    reportsOutputDir: reportsOutDir,
    predictionOptions: {
      dryRunMockResponse: true,
      allowMockFallback: true,
    },
    resumeCheckpoint: false,
  });

  const { report, reportDir } = await runner.run();

  console.log('\n============================================================');
  console.log('DRY-RUN RESULTS');
  console.log('============================================================');
  console.log(`Total Samples:        ${report.totalSamples}`);
  console.log(`Successful:           ${report.successfulEvaluations}`);
  console.log(`Failed:               ${report.failedEvaluations}`);
  console.log(`Category Accuracy:    ${(report.overallCategoryAccuracy * 100).toFixed(2)}%`);
  console.log(`Mean Field F1:        ${(report.overallMeanF1 * 100).toFixed(2)}%`);
  console.log(`Mean CER:             ${(report.overallMeanCer * 100).toFixed(2)}%`);
  console.log(`Mean WER:             ${(report.overallMeanWer * 100).toFixed(2)}%`);
  console.log(`Exact Match Rate:     ${(report.overallExactMatchRate * 100).toFixed(2)}%`);
  console.log(`Report Dir:           ${reportDir}`);

  // Write summary
  const summaryPath = path.join(reportDir, 'dryrun_summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify({
    runType: 'dry_run_mock',
    totalSamples: report.totalSamples,
    successfulEvaluations: report.successfulEvaluations,
    failedEvaluations: report.failedEvaluations,
    overallCategoryAccuracy: report.overallCategoryAccuracy,
    overallMeanF1: report.overallMeanF1,
    overallMeanCer: report.overallMeanCer,
    overallMeanWer: report.overallMeanWer,
    overallExactMatchRate: report.overallExactMatchRate,
    overallMeanPrecision: report.overallMeanPrecision,
    overallMeanRecall: report.overallMeanRecall,
    performance: report.performance,
  }, null, 2));
  console.log(`\nSummary saved: ${summaryPath}`);
  console.log('\n✅ DRY-RUN COMPLETE — Pipeline verified end-to-end.');
}

main().catch(err => {
  console.error('Dry-run failed:', err);
  process.exit(1);
});
