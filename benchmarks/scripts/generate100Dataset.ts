import { SyntheticPipeline } from '../synthetic-generator/pipeline/syntheticPipeline';
import { DatasetLoader } from '../dataset/datasetLoader';
import { loadBenchmarkConfig } from '../config/benchmark.config';
import fs from 'fs';
import path from 'path';

async function main() {
  const root = path.join(__dirname, '..');
  const pipeline = new SyntheticPipeline(root);
  const outDir = path.join(root, 'synthetic-dataset-100');

  console.log('🚀 Phase 2 — Generating 100 synthetic PDF documents (Seed: 42)...');
  const genResult = await pipeline.generateDataset({
    seed: 42,
    count: 100,
    outputDir: outDir,
  });

  console.log(`✅ Generated ${genResult.totalDocuments} documents in ${outDir}`);

  console.log('📦 Importing 100 synthetic documents into Dataset Manager...');
  const importRes = pipeline.importToDatasetManager(outDir);
  console.log(`✅ Imported ${importRes.importedCount} files into dataset/RAW`);

  console.log('🔄 Rebuilding benchmark dataset manifest.json...');
  const config = loadBenchmarkConfig();
  const loader = new DatasetLoader(config);
  const m = await (loader as any).buildManifestFromDirectory();
  m.documents = m.documents.filter((d: any) => fs.existsSync(d.groundTruthPath));
  m.totalDocuments = m.documents.length;

  fs.writeFileSync(config.manifestPath, JSON.stringify(m, null, 2), 'utf-8');
  console.log(`✅ Manifest rebuilt with ${m.totalDocuments} documents`);
}

main().catch((err) => {
  console.error('❌ Phase 2 Generation Error:', err);
  process.exit(1);
});
