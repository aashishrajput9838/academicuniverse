import { loadBenchmarkConfig } from '../config/benchmark.config';
import { DatasetLoader } from '../dataset/datasetLoader';
import fs from 'fs';

async function main() {
  const config = loadBenchmarkConfig();
  const loader = new DatasetLoader(config);
  const m = await (loader as any).buildManifestFromDirectory();

  // Filter to valid GT files only
  const validDocs = m.documents.filter((d: any) => fs.existsSync(d.groundTruthPath));

  // Filter specifically for synthetic 100 docs dataset or sample 100
  const synthetic100 = validDocs.filter((d: any) => d.documentId.startsWith('SYNTH_'));
  const docsToUse = synthetic100.length >= 100 ? synthetic100.slice(0, 100) : validDocs.slice(0, 100);

  const manifest100 = {
    ...m,
    totalDocuments: docsToUse.length,
    documents: docsToUse,
  };

  fs.writeFileSync(config.manifestPath, JSON.stringify(manifest100, null, 2), 'utf-8');
  console.log(`✅ manifest.json configured with exactly ${docsToUse.length} documents for 100-doc benchmark validation`);
}

main();
