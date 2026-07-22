const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const outFile = path.join(process.env.TEMP || '.', 'render-out.txt');
const errFile = path.join(process.env.TEMP || '.', 'render-err.txt');

try {
  const out = execSync('npx ts-node scripts/debug-render2.ts', {
    cwd: 'C:/github/academicuniverse.com/academicuniverse/backend',
    encoding: 'utf8',
    timeout: 120000,
    stdio: ['pipe', 'pipe', 'pipe']
  });
  fs.writeFileSync(outFile, out);
} catch (e) {
  if (e.stdout) fs.writeFileSync(outFile, e.stdout);
  if (e.stderr) fs.writeFileSync(errFile, e.stderr);
}

console.log('OUT:', fs.readFileSync(outFile, 'utf8').slice(-500));
console.log('ERR:', fs.readFileSync(errFile, 'utf8').slice(-500));
