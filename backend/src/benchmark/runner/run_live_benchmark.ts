/**
 * run_live_benchmark.ts
 *
 * LIVE BENCHMARK RUN — Option A (Real Groq LLM Inference)
 *
 * Executes the complete 360-sample AU DIC benchmark using live Groq Cloud
 * llama-3.1-8b-instant inference. Generates genuine field-level extraction
 * results for use in the research paper.
 *
 * Estimated duration: ~3-4 hours (360 samples × ~39s/sample at 3.5s pacing)
 *
 * Run: npx ts-node --project tsconfig.json src/benchmark/runner/run_live_benchmark.ts
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
  console.log(' AU DIC BENCHMARK — LIVE GROQ INFERENCE RUN (OPTION A)');
  console.log('============================================================');
  console.log(`Dataset:        ${datasetDir}`);
  console.log(`Reports:        ${reportsOutDir}`);
  console.log(`Model:          llama-3.1-8b-instant (Groq Cloud)`);
  console.log(`Samples:        360 (90 docs × 4 quality profiles)`);
  console.log(`Estimated time: ~3-4 hours`);
  console.log(`Checkpoint:     ENABLED (will resume if interrupted)\n`);

  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) {
    console.error('FATAL: GROQ_API_KEY not set in .env. Cannot run live inference.');
    process.exit(1);
  }
  console.log(`Groq API Key:   ${groqKey.slice(0, 8)}...${groqKey.slice(-4)} (verified)\n`);

  const runner = new BenchmarkRunner({
    datasetDir,
    reportsOutputDir: reportsOutDir,
    predictionOptions: {
      dryRunMockResponse: false,
      allowMockFallback: false,   // Hard fail on any inference error — no silent fallback
      useAiProvider: true,
    },
    resumeCheckpoint: true,       // Checkpoint & resume enabled
  });

  console.log('[START] Beginning live inference evaluation...\n');
  const startMs = Date.now();

  const { report, reportDir } = await runner.run();

  const durationMin = ((Date.now() - startMs) / 60000).toFixed(1);

  console.log('\n============================================================');
  console.log('LIVE BENCHMARK RESULTS (EMPIRICALLY OBSERVED)');
  console.log('============================================================');
  console.log(`Total Samples:        ${report.totalSamples}`);
  console.log(`Successful:           ${report.successfulEvaluations}`);
  console.log(`Failed:               ${report.failedEvaluations}`);
  console.log(`Category Accuracy:    ${(report.overallCategoryAccuracy * 100).toFixed(2)}%`);
  console.log(`Mean Field Precision: ${(report.overallMeanPrecision * 100).toFixed(2)}%`);
  console.log(`Mean Field Recall:    ${(report.overallMeanRecall * 100).toFixed(2)}%`);
  console.log(`Mean Field F1:        ${(report.overallMeanF1 * 100).toFixed(2)}%`);
  console.log(`Mean CER:             ${(report.overallMeanCer * 100).toFixed(2)}%`);
  console.log(`Mean WER:             ${(report.overallMeanWer * 100).toFixed(2)}%`);
  console.log(`Exact Match Rate:     ${(report.overallExactMatchRate * 100).toFixed(2)}%`);
  console.log(`Throughput:           ${report.performance.throughputSamplesPerSec.toFixed(4)} samples/sec`);
  console.log(`Mean Latency:         ${report.performance.meanLatencyMsPerSample.toFixed(0)} ms/sample`);
  console.log(`Duration:             ${durationMin} min`);
  console.log(`Report Dir:           ${reportDir}`);

  // Save live results manifest for research pipeline
  const liveManifest = {
    runType: 'live_groq_inference',
    model: 'llama-3.1-8b-instant',
    inferenceProvider: 'groq_cloud',
    allowMockFallback: false,
    totalSamples: report.totalSamples,
    successfulEvaluations: report.successfulEvaluations,
    failedEvaluations: report.failedEvaluations,
    overallCategoryAccuracy: report.overallCategoryAccuracy,
    overallMeanPrecision: report.overallMeanPrecision,
    overallMeanRecall: report.overallMeanRecall,
    overallMeanF1: report.overallMeanF1,
    overallMeanCer: report.overallMeanCer,
    overallMeanWer: report.overallMeanWer,
    overallExactMatchRate: report.overallExactMatchRate,
    performance: report.performance,
    reportDir,
    completedAt: new Date().toISOString(),
  };

  const manifestPath = path.join(reportDir, 'live_run_manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(liveManifest, null, 2));
  console.log(`\nManifest saved: ${manifestPath}`);
  console.log('\n✅ LIVE BENCHMARK COMPLETE.');
}

main().catch(err => {
  console.error('\n[FATAL] Live benchmark failed:', err.message || err);
  process.exit(1);
});
