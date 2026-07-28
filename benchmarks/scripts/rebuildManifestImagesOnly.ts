import '../config/envLoader';
import fs from 'fs';
import path from 'path';

const benchDir = path.join(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(benchDir, 'dataset', 'manifest.json'), 'utf-8'));

// Rebuild manifest keeping only real image files (PNG/JPEG) that OpenRouter can process
const validDocs = manifest.documents.filter((d: any) => {
  if (!fs.existsSync(d.filePath)) return false;
  const buf = fs.readFileSync(d.filePath);
  const isPNG = buf.slice(0, 4).toString('hex') === '89504e47';
  const isJPEG = buf.slice(0, 2).toString('hex') === 'ffd8';
  return isPNG || isJPEG;
});

console.log(`Found ${validDocs.length} real image documents (PNG/JPEG) out of ${manifest.documents.length} total`);
validDocs.forEach((d: any) => {
  const buf = fs.readFileSync(d.filePath);
  const type = buf.slice(0, 4).toString('hex') === '89504e47' ? 'PNG' : 'JPEG';
  console.log(`  ${d.documentId} | ${type} | ${(buf.length/1024).toFixed(1)}KB | GT: ${fs.existsSync(d.groundTruthPath) ? '✅' : '❌'}`);
});

const imageOnlyManifest = {
  ...manifest,
  documents: validDocs,
  totalDocuments: validDocs.length,
  createdAt: new Date().toISOString(),
};

const outPath = path.join(benchDir, 'dataset', 'manifest.json');
fs.writeFileSync(outPath, JSON.stringify(imageOnlyManifest, null, 2), 'utf-8');
console.log(`\nManifest updated with ${validDocs.length} image-only documents`);
console.log('These are all real uploaded user documents that OpenRouter can process via vision API.');
