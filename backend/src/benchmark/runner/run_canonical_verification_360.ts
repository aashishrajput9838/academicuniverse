/**
 * run_canonical_verification_360.ts
 *
 * Full 360-sample Canonical Benchmark Verification Run
 * Strict Live Inference — zero mock predictions allowed.
 */

import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { execSync } from 'child_process';

const workspaceRoot = path.resolve(__dirname, '../../../../');
dotenv.config({ path: path.join(workspaceRoot, '.env.local') });
dotenv.config({ path: path.join(workspaceRoot, '.env') });
dotenv.config({ path: path.join(workspaceRoot, 'backend', '.env.development') });

import { BenchmarkRunner } from './BenchmarkRunner';

const datasetDir = path.join(workspaceRoot, 'ADBG', 'AU_DIC_Benchmark_v1.0');
const reportsOutDir = path.join(workspaceRoot, 'backend', 'benchmark_reports');

async function main() {
  console.log('============================================================');
  console.log(' AU DIC BENCHMARK — CANONICAL 360-SAMPLE RUN');
  console.log('============================================================');
  console.log(`Workspace: ${workspaceRoot}`);
  console.log(`Dataset:   ${datasetDir}`);
  console.log(`Reports:   ${reportsOutDir}`);

  const targetRunDir = path.join(reportsOutDir, 'run_canonical_v4_verify');
  if (fs.existsSync(targetRunDir)) {
    fs.rmSync(targetRunDir, { recursive: true, force: true });
  }
  fs.mkdirSync(targetRunDir, { recursive: true });

  const runner = new BenchmarkRunner({
    datasetDir,
    reportsOutputDir: reportsOutDir,
    sampleLimit: 360,
    concurrency: 4,
    predictionOptions: {
      dryRunMockResponse: false,
      allowMockFallback: false, // HARD FAIL on any inference error
      useAiProvider: true,
    },
    resumeCheckpoint: false,
  });

  console.log(`\n[START] Beginning canonical 360-sample evaluation run...`);
  const { report, reportDir } = await runner.run();

  console.log(`\n[COMPLETE] Report saved to: ${reportDir}`);

  // If reportDir is different from targetRunDir, copy files into targetRunDir
  if (path.resolve(reportDir) !== path.resolve(targetRunDir)) {
    const files = fs.readdirSync(reportDir);
    for (const f of files) {
      fs.copyFileSync(path.join(reportDir, f), path.join(targetRunDir, f));
    }
  }

  // Generate paired_field_observations.csv strictly for this run
  const csvOutputPath = path.join(targetRunDir, 'paired_field_observations.csv');
  const genScriptPath = path.join(workspaceRoot, 'research', 'statistics', 'generate_field_dataset.py');
  
  console.log(`\nGenerating paired field observation dataset...`);
  const relCsvPath = path.relative(workspaceRoot, csvOutputPath).replace(/\\/g, '/');
  const relRunDir = path.relative(workspaceRoot, targetRunDir).replace(/\\/g, '/');
  
  const genCmd = `python "${genScriptPath}" --run-dir "${relRunDir}" --output "${relCsvPath}"`;
  console.log(`$ ${genCmd}`);
  execSync(genCmd, { cwd: workspaceRoot, stdio: 'inherit' });

  // Run statistical analysis strictly targeting this run directory
  const statScriptPath = path.join(workspaceRoot, 'research', 'statistics', 'run_statistical_tests.py');
  console.log(`\nRunning statistical analysis strictly targeting ${targetRunDir}...`);
  const statCmd = `python "${statScriptPath}" --csv "${csvOutputPath.replace(/\\/g, '/')}" --out-dir "${targetRunDir.replace(/\\/g, '/')}"`;
  console.log(`$ ${statCmd}`);
  execSync(statCmd, { cwd: workspaceRoot, stdio: 'inherit' });

  console.log(`\n============================================================`);
  console.log(` ✅ CANONICAL 360-SAMPLE BENCHMARK RUN COMPLETE`);
  console.log(` Run Directory: ${targetRunDir}`);
  console.log(`============================================================`);
}

main().catch(err => {
  console.error('\n[FATAL CANONICAL BENCHMARK ERROR]', err.message || err);
  process.exit(1);
});
