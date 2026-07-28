import fs from 'fs';
import path from 'path';

const logsDir = path.join(__dirname, '..', 'results', 'logs');
const expId = 'EXP-20260728202017';

const b2 = JSON.parse(fs.readFileSync(path.join(logsDir, `${expId}_SYS-BASE-2_results.jsonl`), 'utf-8').split('\n')[0]);
const b3 = JSON.parse(fs.readFileSync(path.join(logsDir, `${expId}_SYS-BASE-3_results.jsonl`), 'utf-8').split('\n')[0]);
const prop = JSON.parse(fs.readFileSync(path.join(logsDir, `${expId}_SYS-PROP_results.jsonl`), 'utf-8').split('\n')[0]);

console.log('=== SYS-BASE-2 RECORD 0 ===');
console.log(JSON.stringify(b2, null, 2));

console.log('\n=== SYS-BASE-3 RECORD 0 ===');
console.log(JSON.stringify(b3, null, 2));

console.log('\n=== SYS-PROP RECORD 0 ===');
console.log(JSON.stringify(prop, null, 2));
