import { DatasetLoader } from '../dataset/datasetLoader';
import { loadBenchmarkConfig } from '../config/benchmark.config';
import fs from 'fs';

async function rebuild() {
  const config = loadBenchmarkConfig();
  const loader = new DatasetLoader(config);
  const m = await (loader as any).buildManifestFromDirectory();
  m.documents = m.documents.filter((d: any) => fs.existsSync(d.groundTruthPath));
  m.totalDocuments = m.documents.length;
  console.log('Scanned valid documents count:', m.totalDocuments);
  fs.writeFileSync(config.manifestPath, JSON.stringify(m, null, 2), 'utf-8');
  console.log('Successfully saved manifest to:', config.manifestPath);
}

rebuild();
