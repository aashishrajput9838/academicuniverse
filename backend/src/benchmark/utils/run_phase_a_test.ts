import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../../../.env.development') });

import { AdbgGroundTruthAdapter } from '../adapters/AdbgGroundTruthAdapter';
import { AuDicPredictionAdapter } from '../adapters/AuDicPredictionAdapter';
import { FieldLevelEvaluator } from '../evaluators/FieldLevelEvaluator';

async function runPhaseA() {
  console.log('============================================================');
  console.log(' AU DIC BENCHMARK — PHASE A: 1-IMAGE SINGLE SAMPLE VALIDATION');
  console.log('============================================================');

  const datasetDir = path.resolve(__dirname, '../../../../ADBG/AU_DIC_Benchmark_v1.0');
  const gtAdapter = new AdbgGroundTruthAdapter();
  const sample = gtAdapter.loadGroundTruth('groundtruth/DOC-00DFAED9_clean.json', datasetDir);

  console.log(`Sample Loaded: ${sample.sampleId} (${sample.qualityProfile})`);
  console.log(`Ground Truth Document Type: ${sample.documentType}`);
  console.log(`Image File: ${sample.pngPath}`);

  const predictionAdapter = new AuDicPredictionAdapter({ allowMockFallback: false });

  console.log('\nExecuting Live Local Model Extraction via Ollama (MiniCPM-V)...');
  const startTime = Date.now();
  const prediction = await predictionAdapter.predict(sample, datasetDir);
  const latency = Date.now() - startTime;

  console.log('\n--- PREDICTION PROVENANCE METADATA ---');
  console.log(`isMock:               ${prediction.isMock}`);
  console.log(`provider:             ${(prediction as any).provider}`);
  console.log(`modelName:            ${prediction.modelName}`);
  console.log(`executionMode:        ${(prediction as any).executionMode}`);
  console.log(`inferenceLatencyMs:   ${latency} ms`);
  console.log(`requestId:            ${prediction.requestId}`);

  console.log('\n--- EXTRACTED ENTITIES PREVIEW ---');
  console.log(JSON.stringify(prediction.extractedEntities, null, 2));

  console.log('\n--- EVALUATION MATCHING RESULTS ---');
  const evaluation = FieldLevelEvaluator.evaluateSample(sample, prediction);
  console.log(`Category Match:       ${evaluation.categoryMatch}`);
  console.log(`Precision:            ${(evaluation.metrics.precision * 100).toFixed(2)}%`);
  console.log(`Recall:               ${(evaluation.metrics.recall * 100).toFixed(2)}%`);
  console.log(`F1 Score:             ${(evaluation.metrics.f1Score * 100).toFixed(2)}%`);
  console.log(`Matched Fields:       ${evaluation.metrics.matchedFieldsCount} / ${evaluation.metrics.totalFieldsCount}`);
  console.log(`CER:                  ${(evaluation.metrics.cer * 100).toFixed(2)}%`);
  console.log(`WER:                  ${(evaluation.metrics.wer * 100).toFixed(2)}%`);

  console.log('\n✅ PHASE A VALIDATION COMPLETE.');
}

runPhaseA().catch((err) => {
  console.error('\n❌ PHASE A VALIDATION FAILED:', err);
  process.exit(1);
});
