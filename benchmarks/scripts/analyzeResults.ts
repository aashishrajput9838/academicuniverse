import fs from 'fs';
import path from 'path';

const benchDir = path.join(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(benchDir, 'dataset', 'manifest.json'), 'utf-8'));
const results = fs.readFileSync(
  path.join(benchDir, 'results', 'logs', 'EXP-20260728194439_SYS-BASE-3_results.jsonl'),
  'utf-8'
).trim().split('\n').map(l => JSON.parse(l));

// Categorize each document
const docMap: Record<string, any> = {};
manifest.documents.forEach((d: any) => { docMap[d.documentId] = d; });

let realPdf = 0, realPng = 0, mockText = 0, synthPdf = 0;
const byType: Record<string, {success: number, fail: number}> = {
  'Real PDF': {success: 0, fail: 0},
  'Real PNG': {success: 0, fail: 0},
  'Synthetic PDF': {success: 0, fail: 0},
  'Mock text': {success: 0, fail: 0},
};

results.forEach((r: any) => {
  const doc = docMap[r.documentId];
  if (!doc || !fs.existsSync(doc.filePath)) return;
  const buf = fs.readFileSync(doc.filePath);
  const isPDF = buf.slice(0, 5).toString('utf-8') === '%PDF-';
  const isPNG = buf.slice(0, 4).toString('hex') === '89504e47';
  const isJPEG = buf.slice(0, 2).toString('hex') === 'ffd8';
  const isSynth = r.documentId.startsWith('SYNTH_');
  const isSuccess = !r.errorMessage;

  let type: string;
  if (isPDF && isSynth) { type = 'Synthetic PDF'; synthPdf++; }
  else if (isPDF) { type = 'Real PDF'; realPdf++; }
  else if (isPNG || isJPEG) { type = 'Real PNG'; realPng++; }
  else { type = 'Mock text'; mockText++; }

  if (isSuccess) byType[type].success++;
  else byType[type].fail++;
});

console.log('\n=== DATASET COMPOSITION ===');
console.log(`Real uploaded PDFs:     ${realPdf}`);
console.log(`Real uploaded PNGs:     ${realPng}`);
console.log(`Synthetic PDFs (pdf-lib): ${synthPdf}`);
console.log(`Mock text (fake .png):  ${mockText}`);

console.log('\n=== SUCCESS RATE BY FILE TYPE ===');
Object.entries(byType).forEach(([type, counts]) => {
  const total = counts.success + counts.fail;
  const pct = total > 0 ? ((counts.success / total) * 100).toFixed(1) : '0.0';
  console.log(`${type.padEnd(22)}: ${counts.success}/${total} (${pct}%)`);
});

console.log('\n=== SUCCESSFUL EXTRACTIONS ===');
results.filter((r: any) => !r.errorMessage).forEach((r: any) => {
  const doc = docMap[r.documentId];
  const buf = fs.readFileSync(doc.filePath);
  const type = buf.slice(0, 5).toString('utf-8') === '%PDF-' ? 'PDF' :
               buf.slice(0, 4).toString('hex') === '89504e47' ? 'PNG' : 'OTHER';
  console.log(`  ✅ ${r.documentId} | type: ${type} | size: ${(buf.length/1024).toFixed(1)}KB | F1: ${r.fieldScores?.f1Score?.toFixed(3)}`);
});

console.log('\n=== DIAGNOSIS ===');
console.log('Issue: OpenRouter gpt-4o-mini only accepts image/* MIME types in image_url.');
console.log('PDFs sent as data:application/pdf;base64 are rejected with HTTP 400.');
console.log('Synthetic PDFs (pdf-lib, ~2-3KB) also fail for same reason.');
console.log('Mock pilot text files (.png extension but plain text) fail image validation.');
console.log(`\nOnly ${realPng} real image files (PNG/JPEG) can succeed on OpenRouter.`);
