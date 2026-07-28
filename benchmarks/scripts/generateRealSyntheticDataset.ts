import { SyntheticPipeline } from '../synthetic-generator/pipeline/syntheticPipeline';
import path from 'path';

async function main() {
  const root = path.join(__dirname, '..');
  const pipeline = new SyntheticPipeline(root);
  const out = path.join(root, 'synthetic-dataset');
  console.log('Generating 25 synthetic PDF documents...');
  await pipeline.generateDataset({ seed: 42, count: 25, outputDir: out });
  console.log('Importing into Dataset Manager...');
  const res = pipeline.importToDatasetManager(out);
  console.log('Import result:', res);
}

main();
