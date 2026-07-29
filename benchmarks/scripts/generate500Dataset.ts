import { SyntheticPipeline } from '../synthetic-generator/pipeline/syntheticPipeline';
import { DatasetLoader } from '../dataset/datasetLoader';
import { loadBenchmarkConfig } from '../config/benchmark.config';
import fs from 'fs';
import path from 'path';

async function main() {
  const root = path.join(__dirname, '..');
  const pipeline = new SyntheticPipeline(root);
  const outDir = path.join(root, 'synthetic-dataset-500');

  console.log('🚀 Phase 7 — Generating 500 synthetic PDF documents (Seed: 42)...');
  const genResult = await pipeline.generateDataset({
    seed: 42,
    count: 500,
    outputDir: outDir,
  });

  console.log(`✅ Generated ${genResult.totalDocuments} documents in ${outDir}`);

  console.log('📦 Importing 500 synthetic documents into Dataset Manager...');
  const importRes = pipeline.importToDatasetManager(outDir);
  console.log(`✅ Imported ${importRes.importedCount} files into dataset/RAW`);

  console.log('🔄 Rebuilding benchmark dataset manifest.json for 500-doc run...');
  const config = loadBenchmarkConfig();
  const loader = new DatasetLoader(config);
  const m = await (loader as any).buildManifestFromDirectory();

  // Filter to valid GT files only
  const validDocs = m.documents.filter((d: any) => fs.existsSync(d.groundTruthPath));
  const synthetic500 = validDocs.filter((d: any) => d.documentId.startsWith('SYNTH_'));
  const docsToUse = synthetic500.length >= 500 ? synthetic500.slice(0, 500) : validDocs.slice(0, 500);

  const manifest500 = {
    ...m,
    totalDocuments: docsToUse.length,
    documents: docsToUse,
  };

  fs.writeFileSync(config.manifestPath, JSON.stringify(manifest500, null, 2), 'utf-8');
  console.log(`✅ Manifest rebuilt with ${docsToUse.length} documents for 500-doc official benchmark`);
}

main().catch((err) => {
  console.error('❌ Phase 7 Generation Error:', err);
  process.exit(1);
});
