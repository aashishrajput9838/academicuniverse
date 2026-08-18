/**
 * run_staged_verification.ts
 *
 * Staged Verification Runner (Phases A, B, C, D)
 * Strict Live Inference — zero mock fallback.
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

async function runStage(stageName: string, limit: number): Promise<{ reportDir: string; totalSamples: number; mockCount: number; liveCount: number }> {
  console.log(`\n============================================================`);
  console.log(` STARTING ${stageName} (Limit: ${limit} samples)`);
  console.log(`============================================================`);

  const runner = new BenchmarkRunner({
    datasetDir,
    reportsOutputDir: reportsOutDir,
    sampleLimit: limit,
    predictionOptions: {
      dryRunMockResponse: false,
      allowMockFallback: false, // HARD FAIL on error — no silent fallback
      useAiProvider: true,
    },
    resumeCheckpoint: false,
  });

  const { report, reportDir } = await runner.run();

  // Load predictions to verify live provenance
  const predPath = path.join(reportDir, 'predictions.json');
  if (!fs.existsSync(predPath)) {
    throw new Error(`[${stageName} FATAL] predictions.json not generated in ${reportDir}`);
  }

  const predictions: any[] = JSON.parse(fs.readFileSync(predPath, 'utf-8'));
  let mockCount = 0;
  let liveCount = 0;

  for (const p of predictions) {
    if (p.isMock || p.provider === 'mock' || p.executionMode === 'mock') {
      mockCount++;
    } else {
      liveCount++;
    }
  }

  console.log(`\n[${stageName} PROVENANCE VERIFICATION]`);
  console.log(`  Total Predictions: ${predictions.length}`);
  console.log(`  Live Predictions:  ${liveCount}`);
  console.log(`  Mock Predictions:  ${mockCount}`);

  if (mockCount > 0) {
    throw new Error(`[${stageName} FATAL] Detected ${mockCount} mock predictions. Mock predictions are STRICTLY PROHIBITED.`);
  }

  if (report.failedEvaluations > 0) {
    throw new Error(`[${stageName} FATAL] ${report.failedEvaluations} evaluations failed during ${stageName}.`);
  }

  console.log(`\n✅ [${stageName} PASSED] All ${predictions.length} samples verified with zero mock predictions.`);
  return { reportDir, totalSamples: predictions.length, mockCount, liveCount };
}

async function main() {
  console.log('============================================================');
  console.log(' AU DIC BENCHMARK — STAGED VERIFICATION PIPELINE (PHASES A-D)');
  console.log('============================================================');
  console.log(`Workspace: ${workspaceRoot}`);
  console.log(`Dataset:   ${datasetDir}`);
  console.log(`Reports:   ${reportsOutDir}`);

  // Step 1: Phase A (1 sample)
  const resA = await runStage('PHASE A', 1);

  // Step 2: Phase B (10 samples)
  const resB = await runStage('PHASE B', 10);

  // Step 3: Phase C (50 samples)
  const resC = await runStage('PHASE C', 50);

  // Step 4: Phase D (Full 360 Canonical Run)
  const resD = await runStage('PHASE D (FULL CANONICAL RUN)', 360);

  const reportDir = resD.reportDir;
  console.log(`\n============================================================`);
  console.log(` PHASE D COMPLETE — EXECUTING POST-RUN DATASET & STATS`);
  console.log(`============================================================`);
  console.log(`Run Directory: ${reportDir}`);

  // Generate paired_field_observations.csv strictly for this run
  const csvOutputPath = path.join(reportDir, 'paired_field_observations.csv');
  const genScriptPath = path.join(workspaceRoot, 'research', 'statistics', 'generate_field_dataset.py');
  
  console.log(`\nGenerating paired field observation dataset...`);
  const genCmd = `python "${genScriptPath}" --run-dir "${reportDir}" --output "${path.relative(workspaceRoot, csvOutputPath)}"`;
  console.log(`$ ${genCmd}`);
  execSync(genCmd, { cwd: workspaceRoot, stdio: 'inherit' });

  // Count rows in CSV
  if (!fs.existsSync(csvOutputPath)) {
    throw new Error(`[PHASE D FATAL] CSV output not generated at ${csvOutputPath}`);
  }

  const csvContent = fs.readFileSync(csvOutputPath, 'utf-8');
  const csvLines = csvContent.trim().split(/\r?\n/);
  const observationCount = csvLines.length - 1; // Exclude header

  console.log(`\n[PHASE D OBSERVATION CARDINALITY CHECK]`);
  console.log(`  Target Observation Count: 24,480`);
  console.log(`  Actual Observation Count: ${observationCount}`);

  if (observationCount !== 24480) {
    throw new Error(`[PHASE D FATAL] Observation count mismatch: expected 24480, got ${observationCount}`);
  }

  // Run statistical analysis strictly targeting this run directory
  const statScriptPath = path.join(workspaceRoot, 'research', 'statistics', 'run_statistical_tests.py');
  console.log(`\nRunning statistical analysis strictly targeting ${reportDir}...`);
  const statCmd = `python "${statScriptPath}" --csv "${csvOutputPath}" --out-dir "${reportDir}"`;
  console.log(`$ ${statCmd}`);
  execSync(statCmd, { cwd: workspaceRoot, stdio: 'inherit' });

  console.log(`\n============================================================`);
  console.log(` ✅ ALL STAGES (A, B, C, D) PASSED WITH 100% INTEGRITY.`);
  console.log(` Benchmark Artifacts Saved To: ${reportDir}`);
  console.log(`============================================================`);
}

main().catch(err => {
  console.error('\n[FATAL STAGED VERIFICATION ERROR]', err.message || err);
  process.exit(1);
});
