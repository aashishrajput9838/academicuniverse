#!/usr/bin/env node
/**
 * Academic Universe — AI Research Dataset Manager CLI
 * Usage: npx ts-node benchmarks/dataset-manager/cli/datasetManagerCli.ts <command>
 */

import { Command } from 'commander';
import path from 'path';
import { DatasetManagerService } from '../manager/datasetManagerService';
import { DocumentClassifier } from '../classifier/documentClassifier';

const program = new Command();
const BENCHMARK_ROOT = path.resolve(__dirname, '../../');
const service = new DatasetManagerService(BENCHMARK_ROOT);

program
  .name('dataset-manager')
  .description('AI Research Dataset Manager — Automated Ingestion, Classification & GT Pipeline')
  .version('1.0.0');

// ─── dataset-manager scan ───────────────────────────────────────────────────
program
  .command('scan')
  .alias('organize')
  .description('Scan RAW dataset directory, classify, assign canonical IDs, and organize automatically')
  .action(() => {
    console.log('\n🚀 Executing Automated RAW Dataset Ingestion...\n');
    const { processedCount, manifest, stats } = service.processRawDataset();

    console.log('\n' + '═'.repeat(65));
    console.log('  DATASET INGESTION & CLASSIFICATION SUMMARY');
    console.log('═'.repeat(65));
    console.log(`  Newly Processed:     ${processedCount}`);
    console.log(`  Total Organized:     ${manifest.totalOrganizedDocuments}`);
    console.log(`  Average Confidence:  ${(stats.averageConfidence * 100).toFixed(1)}%`);
    console.log(`  Pending Review:      ${stats.pendingReviewCount}`);
    console.log(`  Duplicates Detected: ${stats.duplicateCount}`);
    console.log('─'.repeat(65));
    console.log('  Category Breakdown:');
    for (const [cat, count] of Object.entries(stats.categoryDistribution)) {
      if (count > 0) {
        console.log(`    - ${cat.padEnd(24)}: ${count}`);
      }
    }
    console.log('═'.repeat(65) + '\n');
    console.log('📄 Detailed report exported to: dataset-pipeline/reports/dataset_manager_report.md');
  });

// ─── dataset-manager classify ───────────────────────────────────────────────
program
  .command('classify')
  .description('Dry-run preview of document classification for files in RAW directory')
  .action(() => {
    console.log('\n🔍 Previewing classification for RAW files...\n');
    const organizer = (service as any).organizer;
    const files = organizer.scanRawFolder();

    if (files.length === 0) {
      console.log('ℹ️ RAW directory is empty.');
      return;
    }

    const classifier = new DocumentClassifier();
    for (const f of files) {
      const result = classifier.classify(f.originalFilename);
      console.log(`  [${(result.confidence * 100).toFixed(0)}%] ${f.originalFilename}`);
      console.log(`         → Category: ${result.category} (Suggested Prefix: ${result.suggestedPrefix}_)`);
    }
  });

// ─── dataset-manager review ─────────────────────────────────────────────────
program
  .command('review')
  .description('List documents in the Review Queue (status: DRAFT)')
  .option('--approve <id>', 'Approve draft GT for a document ID')
  .option('--reject <id>', 'Reject draft GT for a document ID')
  .action((opts) => {
    if (opts.approve) {
      const doc = service.reviewDocument(opts.approve, 'APPROVE');
      console.log(`✅ Approved document ${doc.documentId} (status: VERIFIED)`);
      return;
    }
    if (opts.reject) {
      const doc = service.reviewDocument(opts.reject, 'REJECT');
      console.log(`❌ Rejected document ${doc.documentId} (status: REJECTED)`);
      return;
    }

    const manifest = service.getManifest();
    const drafts = manifest.documents.filter((d) => d.groundTruthStatus === 'DRAFT');

    console.log(`\n📋 Review Queue — Pending Human Verification (${drafts.length}):\n`);
    drafts.forEach((d) => {
      console.log(`  • ID: ${d.documentId.padEnd(10)} | Original: "${d.originalFilename}" | Category: ${d.category} [${(d.classificationConfidence * 100).toFixed(0)}%]`);
    });
    console.log('\nUse --approve <id> to verify a draft.\n');
  });

// ─── dataset-manager stats ──────────────────────────────────────────────────
program
  .command('stats')
  .description('Display aggregate dataset statistics and duplicate warnings')
  .action(() => {
    const stats = service.getStats();
    console.log('\n' + '═'.repeat(60));
    console.log('  DATASET MANAGER STATISTICS');
    console.log('═'.repeat(60));
    console.log(`  Total Ingested:    ${stats.totalImported}`);
    console.log(`  Classified:        ${stats.totalClassified}`);
    console.log(`  Avg Confidence:    ${(stats.averageConfidence * 100).toFixed(1)}%`);
    console.log(`  Verified Count:    ${stats.verifiedCount}`);
    console.log(`  Pending Review:    ${stats.pendingReviewCount}`);
    console.log(`  Duplicate Groups:  ${stats.duplicateCount}`);
    console.log('═'.repeat(60) + '\n');
  });

// ─── dataset-manager export ─────────────────────────────────────────────────
program
  .command('export')
  .description('Export manifest JSON and Markdown summary report')
  .action(() => {
    const manifest = service.getManifest();
    const stats = service.getStats();
    console.log(`✅ Exported manifest with ${manifest.totalOrganizedDocuments} organized documents.`);
    console.log(`📊 Statistics report saved to dataset-pipeline/reports/dataset_manager_report.md`);
  });

program.parse(process.argv);
