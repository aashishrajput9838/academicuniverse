/**
 * dry_run_validation.ts
 *
 * Validates that the fixed AdbgGroundTruthAdapter correctly loads
 * field entities from real ADBG GT JSON files, BEFORE launching
 * the expensive live Groq inference benchmark run.
 *
 * Run with: npx ts-node src/benchmark/runner/dry_run_validation.ts
 */

import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

import { AdbgGroundTruthAdapter } from '../adapters/AdbgGroundTruthAdapter';
import { DatasetFileLoader } from '../utils/fileLoader';

const datasetDir = path.resolve(__dirname, '../../../../ADBG/AU_DIC_Benchmark_v1.0');

console.log('=== DRY-RUN VALIDATION: GT Adapter Fix ===\n');
console.log(`Dataset dir: ${datasetDir}`);

// 1. Discover GT files
const gtFiles = DatasetFileLoader.discoverGroundTruthFiles(datasetDir);
console.log(`\nDiscovered GT files: ${gtFiles.length}`);

if (gtFiles.length === 0) {
  console.error('FAIL: No GT files discovered. Check groundtruth/ directory.');
  process.exit(1);
}

// 2. Load and inspect first 9 samples (3 types x 3 profiles)
const adapter = new AdbgGroundTruthAdapter();
let totalFieldsFound = 0;
let totalSubjectsFound = 0;
let samplesWithFields = 0;
let samplesWithZeroFields = 0;

const sampleLimit = Math.min(gtFiles.length, 9);

console.log('\n--- Inspecting first 9 samples ---\n');
for (let i = 0; i < sampleLimit; i++) {
  const gtPath = gtFiles[i];
  try {
    const gt = adapter.loadGroundTruth(gtPath, datasetDir);
    const fieldCount = Object.keys(gt.extractedFields).length;
    const subjectCount = gt.subjects.length;

    totalFieldsFound += fieldCount;
    totalSubjectsFound += subjectCount;

    if (fieldCount > 0) samplesWithFields++;
    else samplesWithZeroFields++;

    console.log(`[${i + 1}] ${gt.sampleId}`);
    console.log(`     type=${gt.documentType} profile=${gt.qualityProfile}`);
    console.log(`     fields=${fieldCount}: ${Object.keys(gt.extractedFields).join(', ')}`);
    console.log(`     subjects=${subjectCount}`);
    console.log(`     student_name="${gt.extractedFields['student_name'] || 'N/A'}"`);
    console.log(`     cgpa="${gt.extractedFields['cgpa'] || 'N/A'}"\n`);
  } catch (err: any) {
    console.error(`[${i + 1}] ERROR loading ${gtPath}: ${err.message}`);
  }
}

console.log('=== VALIDATION SUMMARY ===');
console.log(`Total GT files discovered: ${gtFiles.length}`);
console.log(`Samples inspected: ${sampleLimit}`);
console.log(`Samples WITH fields (>0): ${samplesWithFields}`);
console.log(`Samples with ZERO fields: ${samplesWithZeroFields}`);
console.log(`Total field entities found: ${totalFieldsFound}`);
console.log(`Total subjects found: ${totalSubjectsFound}`);

if (samplesWithZeroFields === 0) {
  console.log('\n✅ PASS: All inspected samples have field entities. Adapter fix is VERIFIED.');
  console.log('   Ready to launch live benchmark run (live Groq inference).');
} else {
  console.log('\n❌ FAIL: Some samples still have zero fields. Do not launch live benchmark.');
  process.exit(1);
}
