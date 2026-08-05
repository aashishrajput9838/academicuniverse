/**
 * run_calibration_benchmark.ts
 *
 * 30-sample calibration run to verify pacing, token usage, and field extraction
 * BEFORE launching the full 360-sample live benchmark.
 *
 * Selects 10 samples per document type (certificate, marksheet, student_id),
 * using the clean quality profile only.
 *
 * Run: npx ts-node --project tsconfig.json src/benchmark/runner/run_calibration_benchmark.ts
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
  console.log(' AU DIC BENCHMARK — 30-SAMPLE CALIBRATION RUN');
  console.log('============================================================');
  console.log(`Dataset:        ${datasetDir}`);
  console.log(`Samples:        30 (10 cert + 10 marksheet + 10 student_id, clean profile only)`);
  console.log(`Pacing:         8,000ms per sample`);
  console.log(`Est. duration:  ~5 minutes\n`);

  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) {
    console.error('FATAL: GROQ_API_KEY not set. Cannot run live inference.');
    process.exit(1);
  }
  console.log(`Groq API Key:   ${groqKey.slice(0, 8)}...${groqKey.slice(-4)}\n`);

  const runner = new BenchmarkRunner({
    datasetDir,
    reportsOutputDir: reportsOutDir,
    predictionOptions: {
      dryRunMockResponse: false,
      allowMockFallback: false,
      useAiProvider: true,
    },
    sampleLimit: 30,            // Only 30 samples for calibration
    resumeCheckpoint: false,    // Always fresh
  });

  const startMs = Date.now();
  const { report, reportDir } = await runner.run();
  const durationMin = ((Date.now() - startMs) / 60000).toFixed(1);

  console.log('\n============================================================');
  console.log('CALIBRATION RESULTS');
  console.log('============================================================');
  console.log(`Total Samples:        ${report.totalSamples}`);
  console.log(`Successful:           ${report.successfulEvaluations}`);
  console.log(`Failed:               ${report.failedEvaluations}`);
  console.log(`Category Accuracy:    ${(report.overallCategoryAccuracy * 100).toFixed(2)}%`);
  console.log(`Mean Field F1:        ${(report.overallMeanF1 * 100).toFixed(2)}%`);
  console.log(`Mean CER:             ${(report.overallMeanCer * 100).toFixed(2)}%`);
  console.log(`Mean WER:             ${(report.overallMeanWer * 100).toFixed(2)}%`);
  console.log(`Exact Match Rate:     ${(report.overallExactMatchRate * 100).toFixed(2)}%`);
  console.log(`Throughput:           ${report.performance.throughputSamplesPerSec.toFixed(4)} samples/sec`);
  console.log(`Mean Latency:         ${report.performance.meanLatencyMsPerSample.toFixed(0)} ms/sample`);
  console.log(`Duration:             ${durationMin} min`);
  console.log(`Report Dir:           ${reportDir}`);

  // Load comparisons to inspect field extraction
  const compPath = path.join(reportDir, 'comparisons.json');
  const predPath = path.join(reportDir, 'predictions.json');

  if (fs.existsSync(compPath) && fs.existsSync(predPath)) {
    const comparisons = JSON.parse(fs.readFileSync(compPath, 'utf-8'));
    const predictions = JSON.parse(fs.readFileSync(predPath, 'utf-8'));

    let withEntities = 0;
    let withoutEntities = 0;
    let totalFieldsExtracted = 0;

    for (const p of predictions) {
      const ee = p.extractedEntities || {};
      const cf = p.candidateFields || {};
      const fieldCount = Object.keys(ee).length + Object.keys(cf).length;
      if (fieldCount > 0) {
        withEntities++;
        totalFieldsExtracted += fieldCount;
      } else {
        withoutEntities++;
      }
    }

    console.log('\n--- Field Extraction Analysis ---');
    console.log(`Predictions with extractedEntities: ${withEntities}/${predictions.length}`);
    console.log(`Predictions with ZERO entities:     ${withoutEntities}/${predictions.length}`);
    console.log(`Total field entities extracted:     ${totalFieldsExtracted}`);
    console.log(`Avg fields per sample:              ${(totalFieldsExtracted / predictions.length).toFixed(1)}`);

    // Show 3 sample predictions
    console.log('\n--- Sample Predictions (first 3) ---');
    for (let i = 0; i < Math.min(3, predictions.length); i++) {
      const p = predictions[i];
      console.log(`[${i+1}] ${p.sampleId}: category=${p.documentCategory}, conf=${p.confidenceScore}`);
      console.log(`     entities=${JSON.stringify(p.extractedEntities)}`);
    }

    if (withoutEntities === 0) {
      console.log('\n✅ CALIBRATION PASSED: All samples produced field entities.');
      console.log('   Run run_live_benchmark.ts for the full 360-sample evaluation.');
    } else if (withEntities > 0) {
      console.log(`\n⚠️  PARTIAL: ${withEntities} samples extracted fields, ${withoutEntities} did not.`);
      console.log('   Review model output before launching full benchmark.');
    } else {
      console.log('\n❌ FAIL: Zero field extraction. Do not launch full benchmark.');
    }
  }
}

main().catch(err => {
  console.error('\n[FATAL] Calibration failed:', err.message || err);
  process.exit(1);
});
