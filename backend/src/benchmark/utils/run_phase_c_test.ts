import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../../../.env.development') });

import { AdbgGroundTruthAdapter } from '../adapters/AdbgGroundTruthAdapter';
import { AuDicPredictionAdapter } from '../adapters/AuDicPredictionAdapter';
import { FieldLevelEvaluator } from '../evaluators/FieldLevelEvaluator';
import { ReportGenerator } from '../reports/ReportGenerator';
import { MetricCalculator } from '../metrics/MetricCalculator';

async function runPhaseC() {
  console.log('============================================================');
  console.log(' AU DIC BENCHMARK — PHASE C: 50-IMAGE STABILITY RUN (LOCAL OLLAMA)');
  console.log('============================================================');

  const datasetDir = path.resolve(__dirname, '../../../../ADBG/AU_DIC_Benchmark_v1.0');
  const gtAdapter = new AdbgGroundTruthAdapter();
  const gtFolder = path.join(datasetDir, 'groundtruth');
  const allGtFiles = fs.readdirSync(gtFolder)
    .filter((f: string) => f.endsWith('.json'))
    .map((f: string) => path.join('groundtruth', f));

  // Pick 50 representative samples across document categories & quality profiles
  const selectedRelPaths = allGtFiles.slice(0, 50);
  console.log(`Selected ${selectedRelPaths.length} samples for Phase C evaluation.`);

  const predictionAdapter = new AuDicPredictionAdapter({ allowMockFallback: false });
  const predictions: any[] = [];
  const comparisons: any[] = [];
  const logs: string[] = [];

  const runId = `run_phase_c_${Date.now()}`;
  const startTime = Date.now();

  for (let i = 0; i < selectedRelPaths.length; i++) {
    const relPath = selectedRelPaths[i];
    console.log(`[${i + 1}/${selectedRelPaths.length}] Evaluating ${relPath}...`);
    try {
      const gt = gtAdapter.loadGroundTruth(relPath, datasetDir);
      const pred = await predictionAdapter.predict(gt, datasetDir);
      const comp = FieldLevelEvaluator.evaluateSample(gt, pred);

      predictions.push(pred);
      comparisons.push(comp);

      console.log(`  └─ Sample: ${pred.sampleId} | Model: ${pred.modelName} | Mode: ${pred.executionMode} | F1: ${(comp.metrics.f1Score * 100).toFixed(2)}% | CER: ${(comp.metrics.cer * 100).toFixed(2)}%`);
    } catch (err: any) {
      console.error(`  └─ [ERROR] ${relPath}: ${err.message}`);
    }
  }

  const durationSeconds = (Date.now() - startTime) / 1000;
  const report = MetricCalculator.calculateRunReport(runId, datasetDir, durationSeconds, comparisons);

  const reportDir = ReportGenerator.saveRunReport(
    path.resolve(__dirname, '../../../benchmark_reports'),
    report,
    predictions,
    comparisons,
    logs
  );

  console.log('\n============================================================');
  console.log(' PHASE C 50-SAMPLE STABILITY RUN SUMMARY');
  console.log('============================================================');
  console.log(`Run Directory:      ${reportDir}`);
  console.log(`Evaluated Samples:  ${comparisons.length} / ${selectedRelPaths.length}`);
  console.log(`Category Accuracy:  ${(report.overallCategoryAccuracy * 100).toFixed(2)}%`);
  console.log(`Mean Precision:     ${(report.overallMeanPrecision * 100).toFixed(2)}%`);
  console.log(`Mean Recall:        ${(report.overallMeanRecall * 100).toFixed(2)}%`);
  console.log(`Mean Field F1:      ${(report.overallMeanF1 * 100).toFixed(2)}%`);
  console.log(`Mean CER:           ${(report.overallMeanCer * 100).toFixed(2)}%`);
  console.log(`Mean WER:           ${(report.overallMeanWer * 100).toFixed(2)}%`);

  console.log('\n✅ PHASE C STABILITY RUN COMPLETE.');
}

runPhaseC().catch((err) => {
  console.error('\n❌ PHASE C STABILITY RUN FAILED:', err);
  process.exit(1);
});
