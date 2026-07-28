import fs from 'fs';
import path from 'path';

const logsDir = path.join(__dirname, '..', 'results', 'logs');
const expId = 'EXP-20260728202017';

const systems = ['SYS-BASE-1', 'SYS-BASE-2', 'SYS-BASE-3', 'SYS-PROP'];
const fileData: Record<string, any[]> = {};

systems.forEach((sys) => {
  const file = path.join(logsDir, `${expId}_${sys}_results.jsonl`);
  if (fs.existsSync(file)) {
    const lines = fs.readFileSync(file, 'utf-8').trim().split('\n').filter(Boolean);
    fileData[sys] = lines.map((l) => JSON.parse(l));
  } else {
    console.log(`Missing file: ${file}`);
  }
});

console.log('=== 1. LOG FILES AUDIT ===');
Object.entries(fileData).forEach(([sys, rows]) => {
  console.log(`System: ${sys} | Count: ${rows.length}`);
});

console.log('\n=== 2. PER-DOCUMENT PREDICTION COMPARISON ===');
const docIds = ['CERT_002', 'CERT_006', 'UNK_001'];

docIds.forEach((docId) => {
  console.log(`\n--- Document: ${docId} ---`);
  systems.forEach((sys) => {
    const row = fileData[sys]?.find((r) => r.documentId === docId);
    if (!row) {
      console.log(`  [${sys}] NO RESULT FOUND`);
      return;
    }
    console.log(`  [${sys}] Keys in row:`, Object.keys(row));
    console.log(`  [${sys}] Extracted Data (extractedData):`, JSON.stringify(row.extractedData));
    console.log(`  [${sys}] Raw LLM Output (rawText / rawResponse):`, JSON.stringify(row.rawText || row.rawResponse || ''));
    console.log(`  [${sys}] Latency:`, JSON.stringify(row.latencyMs || row.latency));
    console.log(`  [${sys}] Error Message:`, row.errorMessage || 'NONE');
  });
});

console.log('\n=== 3. GROUND TRUTH REFERENCE ===');
const gtDir = path.join(__dirname, '..', 'ground-truth');
docIds.forEach((docId) => {
  const gtPath = path.join(gtDir, `${docId}.json`);
  if (fs.existsSync(gtPath)) {
    const gt = JSON.parse(fs.readFileSync(gtPath, 'utf-8'));
    console.log(`\n--- GT: ${docId} ---`);
    console.log(`  Student Name: "${gt.studentName}" | Roll: "${gt.rollNumber}" | Semester: "${gt.semester}" | IssueDate: "${gt.issueDate}"`);
    console.log(`  SGPA: ${gt.sgpa} | CGPA: ${gt.cgpa} | Courses count: ${gt.courseMarks?.length || 0}`);
  }
});
