import fs from 'fs';
import path from 'path';

const benchDir = path.join(__dirname, '..');
const manifestPath = path.join(benchDir, 'dataset', 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

const formatCounts: Record<string, number> = {};
manifest.documents.forEach((d: any) => {
  formatCounts[d.fileFormat] = (formatCounts[d.fileFormat] || 0) + 1;
});
console.log('File format distribution:', JSON.stringify(formatCounts));

const checkDocs = ['CERT_001', 'CERT_002', 'CERT_006', 'UNK_001', 'SYNTH_CERT_001', 'SYNTH_MS_019', 'MS_PILOT_001'];
checkDocs.forEach(id => {
  const doc = manifest.documents.find((d: any) => d.documentId === id);
  if (!doc) { console.log(id, '- NOT FOUND in manifest'); return; }
  const buf = fs.readFileSync(doc.filePath);
  const hexHeader = buf.slice(0, 4).toString('hex');
  const txtHeader = buf.slice(0, 8).toString('utf-8').replace(/\n/g, '\\n');
  const isPNG = hexHeader === '89504e47';
  const isPDF = buf.slice(0, 5).toString('utf-8') === '%PDF-';
  const isJPEG = hexHeader.startsWith('ffd8');
  const realType = isPDF ? 'PDF' : isPNG ? 'PNG' : isJPEG ? 'JPEG' : 'OTHER';
  console.log(`${id} | declared: ${doc.fileFormat} | actual: ${realType} | size: ${buf.length}B | header: "${txtHeader}"`);
});
