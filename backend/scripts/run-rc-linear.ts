import { spawn } from 'child_process';

const child = spawn('npx', ['ts-node', 'scripts/rc-001-validation.ts'], {
  cwd: 'C:/github/academicuniverse.com/academicuniverse/backend',
  shell: true,
  stdio: 'pipe'
});

let stdout = '';
let stderr = '';

child.stdout.on('data', (data) => {
  stdout += data.toString();
});

child.stderr.on('data', (data) => {
  stderr += data.toString();
});

child.on('close', (code) => {
  console.log('EXIT CODE:', code);
  console.log('--- STDOUT ---');
  console.log(stdout.slice(-3000));
  console.log('--- STDERR ---');
  console.log(stderr.slice(-3000));
});

setTimeout(() => {
  console.log('TIMEOUT - killing process');
  child.kill();
}, 120000);
