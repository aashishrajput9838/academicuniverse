import { spawn } from 'child_process';
import path from 'path';

const outPath = path.join(process.cwd(), 'rc-verification', 'rc-001-console.log');
const child = spawn('npx', ['ts-node', 'scripts/rc-001-validation.ts'], {
  cwd: 'C:/github/academicuniverse.com/academicuniverse/backend',
  shell: true,
  stdio: ['inherit', 'pipe', 'pipe']
});

const chunks: string[] = [];
child.stdout.on('data', (d) => {
  try { process.stdout.write(d); } catch {}
  chunks.push(d.toString());
});
child.stderr.on('data', (d) => {
  try { process.stderr.write(d); } catch {}
  chunks.push(d.toString());
});

const fs = require('fs');
child.on('close', (code) => {
  try {
    if (!fs.existsSync('rc-verification')) fs.mkdirSync('rc-verification', { recursive: true });
    fs.writeFileSync(outPath, chunks.join(''));
  } catch {}
  console.log('EXIT CODE:', code);
});

setTimeout(() => {
  console.log('TIMEOUT');
  child.kill();
}, 150000);
