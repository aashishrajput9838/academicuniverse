import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../../../.env.development') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
import { AuDicPredictionAdapter } from '../adapters/AuDicPredictionAdapter';
import { AdbgGroundTruthAdapter } from '../adapters/AdbgGroundTruthAdapter';

async function testVision() {
  const datasetDir = path.resolve(__dirname, '../../../../ADBG/AU_DIC_Benchmark_v1.0');
  const gtAdapter = new AdbgGroundTruthAdapter();
  const sample = gtAdapter.loadGroundTruth('groundtruth/DOC-00DFAED9_clean.json', datasetDir);
  const adapter = new AuDicPredictionAdapter({ allowMockFallback: false });
  console.log('Testing live Vision AI prediction on image:', sample.pngPath);
  const pred = await adapter.predict(sample, datasetDir);
  console.log('Vision Prediction Output:');
  console.log('Category:', pred.documentCategory);
  console.log('Confidence:', pred.confidenceScore);
  console.log('Model Name:', pred.modelName);
  console.log('Extracted Entities:', JSON.stringify(pred.extractedEntities, null, 2));
}

testVision().catch(err => console.error('Vision Test Failed:', err));
