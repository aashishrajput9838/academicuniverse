import fs from 'fs';
import path from 'path';

const logsDir = path.join(__dirname, '..', 'results', 'logs');
const expId = 'EXP-20260728202017';

const systems = ['SYS-BASE-2', 'SYS-BASE-3', 'SYS-PROP'];
const fileData: Record<string, any[]> = {};

systems.forEach((sys) => {
  const file = path.join(logsDir, `${expId}_${sys}_results.jsonl`);
  const lines = fs.readFileSync(file, 'utf-8').trim().split('\n').filter(Boolean);
  fileData[sys] = lines.map((l) => JSON.parse(l));
});

const docIds = ['CERT_002', 'CERT_006', 'UNK_001'];

docIds.forEach((docId) => {
  console.log(`\n========================================`);
  console.log(`DOCUMENT: ${docId}`);
  console.log(`========================================`);

  systems.forEach((sys) => {
    const r = fileData[sys].find((x) => x.documentId === docId);
    console.log(`\n--- System: ${sys} (${r.primaryProvider}) ---`);
    console.log(`  Timestamp: ${r.timestamp}`);
    console.log(`  AI Latency: ${r.latencyMs.aiInferenceMs} ms | DB Staging: ${r.latencyMs.dbStagingMs} ms`);
    console.log(`  Field Matches:`);
    r.fieldMatches.forEach((m: any) => {
      console.log(`    - ${m.fieldName.padEnd(12)}: expected=${JSON.stringify(m.expected)} | actual=${JSON.stringify(m.actual)} | match=${m.isMatch}`);
    });
  });
});
