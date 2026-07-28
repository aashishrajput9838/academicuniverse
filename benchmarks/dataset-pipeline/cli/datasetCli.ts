#!/usr/bin/env node
/**
 * Academic Universe — Dataset CLI
 * Command-line interface for Dataset & Ground Truth management.
 * Commands: init, import, validate, annotate, qa, report, snapshot, export
 */

import { Command } from 'commander';
import path from 'path';
import fs from 'fs';
import { DatasetImporter } from '../importer/datasetImporter';
import { DatasetValidator } from '../validation/datasetValidator';
import { AnnotationManager } from '../annotations/annotationManager';
import { PIIManager } from '../privacy/piiManager';
import { DatasetSnapshotManager } from '../versioning/datasetSnapshotManager';
import { DatasetReporter } from '../reporting/datasetReporter';
import { DocumentCategory, QualityLevel, ConsentStatus } from '../types/dataset.types';

const program = new Command();
const BENCHMARK_ROOT = path.resolve(__dirname, '../../');
const MANIFEST_PATH = path.join(BENCHMARK_ROOT, 'dataset-pipeline', 'manifests', 'dataset_manifest.json');

program
  .name('dataset')
  .description('Academic Universe Dataset & Ground Truth Management CLI')
  .version('1.0.0');

// ─── dataset init ────────────────────────────────────────────────────────────
program
  .command('init')
  .description('Initialize dataset pipeline directory structure and default manifest')
  .action(() => {
    const dirs = [
      path.join(BENCHMARK_ROOT, 'dataset', 'Category_1_Marksheets'),
      path.join(BENCHMARK_ROOT, 'dataset', 'Category_2_Certificates'),
      path.join(BENCHMARK_ROOT, 'dataset', 'Category_3_Timetables'),
      path.join(BENCHMARK_ROOT, 'dataset', 'Category_4_EdgeCases'),
      path.join(BENCHMARK_ROOT, 'ground-truth'),
      path.join(BENCHMARK_ROOT, 'dataset-pipeline', 'manifests'),
      path.join(BENCHMARK_ROOT, 'dataset-pipeline', 'metadata'),
      path.join(BENCHMARK_ROOT, 'dataset-pipeline', 'validation'),
      path.join(BENCHMARK_ROOT, 'dataset-pipeline', 'annotations', 'second-pass'),
      path.join(BENCHMARK_ROOT, 'dataset-pipeline', 'versions', 'snapshots'),
      path.join(BENCHMARK_ROOT, 'dataset-pipeline', 'reports'),
    ];

    dirs.forEach((d) => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });

    if (!fs.existsSync(MANIFEST_PATH)) {
      const initialManifest = {
        manifestVersion: '1.0.0',
        datasetVersion: '1.0.0',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        totalDocuments: 0,
        entries: [],
      };
      fs.writeFileSync(MANIFEST_PATH, JSON.stringify(initialManifest, null, 2), 'utf-8');
      console.log('✅ Created initial dataset_manifest.json');
    }

    console.log('✅ Dataset pipeline directory structure initialized successfully.');
  });

// ─── dataset import ──────────────────────────────────────────────────────────
program
  .command('import')
  .description('Import a document or directory of documents into the pipeline')
  .requiredOption('--source <path>', 'File or directory path to import')
  .requiredOption('--category <type>', 'Document category: MARKSHEET | CERTIFICATE | TIMETABLE | EDGE_CASE')
  .option('--quality <level>', 'Quality level: HIGH | MEDIUM | LOW | SCANNED', 'HIGH')
  .option('--origin <name>', 'University / source origin name', 'Synthetic')
  .option('--consent <status>', 'Consent status: SYNTHETIC | CONSENTED | PUBLIC_DOMAIN | ANONYMIZED', 'SYNTHETIC')
  .option('--annotator <id>', 'Annotator ID', 'A1')
  .action(async (opts) => {
    const importer = new DatasetImporter(BENCHMARK_ROOT);
    const category = opts.category.toUpperCase() as DocumentCategory;
    const qualityLevel = opts.quality.toUpperCase() as QualityLevel;
    const consentStatus = opts.consent.toUpperCase() as ConsentStatus;

    if (fs.statSync(opts.source).isDirectory()) {
      console.log(`\n📂 Importing directory: ${opts.source}...`);
      const results = await importer.importDirectory(opts.source, category, {
        qualityLevel,
        universityOrigin: opts.origin,
        consentStatus,
        annotatorId: opts.annotator,
      });
      const successCount = results.filter((r) => r.success).length;
      console.log(`\n✅ Batch import completed: ${successCount}/${results.length} imported.`);
    } else {
      console.log(`\n📄 Importing file: ${opts.source}...`);
      const res = await importer.importDocument({
        sourcePath: opts.source,
        category,
        qualityLevel,
        universityOrigin: opts.origin,
        consentStatus,
        annotatorId: opts.annotator,
      });
      if (res.success) {
        console.log(`✅ Document imported successfully! ID: ${res.documentId}`);
        console.log(`   Destination: ${res.destinationPath}`);
        console.log(`   Ground Truth Template: ${res.groundTruthPath}`);
      } else {
        console.error(`❌ Import failed: ${res.errorMessage}`);
        process.exit(1);
      }
    }
  });

// ─── dataset validate ────────────────────────────────────────────────────────
program
  .command('validate')
  .description('Run full validation checks against manifest, file hashes, and ground truth')
  .action(async () => {
    if (!fs.existsSync(MANIFEST_PATH)) {
      console.error('❌ Manifest not found. Run "dataset init" first.');
      process.exit(1);
    }
    const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
    const validator = new DatasetValidator(BENCHMARK_ROOT);
    const report = await validator.validate(manifest);
    validator.printSummary(report);
    process.exit(report.errorCount > 0 ? 1 : 0);
  });

// ─── dataset annotate ────────────────────────────────────────────────────────
program
  .command('annotate')
  .description('View or verify ground truth annotations')
  .option('--id <documentId>', 'Document ID to inspect or verify')
  .option('--verify', 'Mark document annotation as VERIFIED')
  .option('--verifier <id>', 'Verifier ID', 'V1')
  .action((opts) => {
    const annotMgr = new AnnotationManager(BENCHMARK_ROOT);
    if (!opts.id) {
      if (!fs.existsSync(MANIFEST_PATH)) return;
      const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
      const pending = annotMgr.getPendingDocuments(manifest);
      const conflicts = annotMgr.getConflictDocuments(manifest);
      console.log(`\n📋 Pending annotations (${pending.length}):`, pending.slice(0, 10));
      console.log(`⚠️  Conflict documents (${conflicts.length}):`, conflicts);
      return;
    }

    if (opts.verify) {
      const res = annotMgr.verifyAnnotation(opts.id, opts.verifier);
      if (res.success) {
        console.log(`✅ Document ${opts.id} verified by ${opts.verifier}`);
      } else {
        console.error(`❌ Verification failed: ${res.error}`);
      }
      return;
    }

    const gt = annotMgr.loadAnnotation(opts.id);
    if (gt) {
      console.log(`\n📄 Ground Truth for ${opts.id}:`);
      console.log(JSON.stringify(gt, null, 2));
    } else {
      console.error(`❌ Ground truth not found for ID: ${opts.id}`);
    }
  });

// ─── dataset qa ──────────────────────────────────────────────────────────────
program
  .command('qa')
  .description('Run quality assurance checks, PII scanning, and annotation progress reporting')
  .action(async () => {
    if (!fs.existsSync(MANIFEST_PATH)) return;
    const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
    const reporter = new DatasetReporter(BENCHMARK_ROOT);
    const qaReport = await reporter.generateQAReport(manifest);

    console.log('\n' + '═'.repeat(60));
    console.log('  DATASET QA & PROGRESS SUMMARY');
    console.log('═'.repeat(60));
    console.log(`  Dataset Version:     ${qaReport.datasetVersion}`);
    console.log(`  Total Documents:     ${qaReport.totalDocuments}`);
    console.log(`  Completion Progress: ${qaReport.annotationProgress.completionPct.toFixed(1)}%`);
    console.log(`    - Verified:        ${qaReport.annotationProgress.verified}`);
    console.log(`    - Annotated:       ${qaReport.annotationProgress.annotated}`);
    console.log(`    - Pending/In-Prog: ${qaReport.annotationProgress.pending + qaReport.annotationProgress.inProgress}`);
    console.log(`    - Conflicts:       ${qaReport.annotationProgress.conflict}`);
    console.log('─'.repeat(60));
    console.log('  Category Breakdown:');
    for (const [cat, count] of Object.entries(qaReport.categoryDistribution)) {
      console.log(`    - ${cat.padEnd(12)}: ${count}`);
    }
    console.log('═'.repeat(60) + '\n');
  });

// ─── dataset report ──────────────────────────────────────────────────────────
program
  .command('report')
  .description('Export publication-ready dataset statistics Markdown table')
  .action(() => {
    if (!fs.existsSync(MANIFEST_PATH)) return;
    const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
    const reporter = new DatasetReporter(BENCHMARK_ROOT);
    const md = reporter.exportPublicationMarkdown(manifest);
    console.log(md);
  });

// ─── dataset snapshot ────────────────────────────────────────────────────────
program
  .command('snapshot')
  .description('Create an immutable version snapshot of the dataset manifest')
  .requiredOption('--version-tag <version>', 'Version tag e.g. 1.0.0 or pilot-v1')
  .option('--by <name>', 'Created by', 'research-team')
  .option('--notes <text>', 'Snapshot notes', 'Routine milestone snapshot')
  .action((opts) => {
    const snapMgr = new DatasetSnapshotManager(BENCHMARK_ROOT);
    const snap = snapMgr.createSnapshot(opts.versionTag, opts.by, opts.notes);
    console.log(`\n📸 Snapshot created successfully!`);
    console.log(`   Snapshot ID: ${snap.snapshotId}`);
    console.log(`   Version:     ${snap.datasetVersion}`);
    console.log(`   Checksum:    ${snap.manifestChecksum}`);
  });

program.parse(process.argv);
