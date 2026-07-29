/**
 * Academic Universe — Synthetic Generator Command Line Interface (CLI)
 * CLI interface for deterministic synthetic dataset generation & validation.
 *
 * Commands:
 *   npx ts-node benchmarks/synthetic-generator/cli/syntheticCli.ts generate --count 50 --seed 42
 *   npx ts-node benchmarks/synthetic-generator/cli/syntheticCli.ts validate
 *   npx ts-node benchmarks/synthetic-generator/cli/syntheticCli.ts import
 */

import path from 'path';
import { Command } from 'commander';
import { SyntheticPipeline } from '../pipeline/syntheticPipeline';
import { QualityChecker } from '../pipeline/qualityChecker';

const program = new Command();
const benchmarkRoot = path.resolve(__dirname, '../..');

program
  .name('synthetic')
  .description('Academic Universe — Synthetic Academic Document Generator CLI')
  .version('1.1.0');

// Command 1: init
program
  .command('init')
  .description('Initialize default directories for synthetic document generation')
  .action(() => {
    const pipeline = new SyntheticPipeline(benchmarkRoot);
    console.log('✅ Synthetic Generator environment initialized.');
  });

// Command 2: generate
program
  .command('generate')
  .description('Generate synthetic academic documents and ground truth JSON')
  .option('-c, --count <number>', 'Number of documents to generate', '25')
  .option('-s, --seed <number>', 'Random seed for reproducible generation', '42')
  .option('-cat, --category <string>', 'Filter by specific document category')
  .option('-o, --output <dir>', 'Custom output directory path')
  .action(async (options) => {
    const count = parseInt(options.count, 10);
    const seed = parseInt(options.seed, 10);
    const category = options.category ? [options.category] : undefined;

    const pipeline = new SyntheticPipeline(benchmarkRoot);
    const result = await pipeline.generateDataset({
      count,
      seed,
      categories: category as any,
      outputDir: options.output,
    });

    console.log(`\n🎉 Success! Created ${result.totalDocuments} synthetic documents.`);
    console.log(`📁 Output Folder: ${result.outputDir}`);
    console.log(`📋 Manifest Hash: ${result.report.manifestHash}\n`);
  });

// Command 3: validate
program
  .command('validate')
  .description('Validate synthetic dataset integrity, GT consistency, and manifest')
  .option('-d, --dir <dir>', 'Dataset directory path')
  .action((options) => {
    const outputDir = options.dir || path.join(benchmarkRoot, 'synthetic-dataset');
    console.log(`🔍 Validating dataset at: ${outputDir}...`);

    const result = QualityChecker.validateDataset(outputDir);
    if (result.isValid) {
      console.log('✅ Dataset Validation PASSED! All documents, checksums, and GT records are valid.');
    } else {
      console.error('❌ Dataset Validation FAILED with errors:');
      result.errors.forEach((e) => console.error(`   - ${e}`));
    }
  });

// Command 4: import
program
  .command('import')
  .description('Explicitly import generated synthetic dataset into the Dataset Manager')
  .option('-d, --dir <dir>', 'Dataset directory path')
  .action((options) => {
    const outputDir = options.dir || path.join(benchmarkRoot, 'synthetic-dataset');
    const pipeline = new SyntheticPipeline(benchmarkRoot);

    console.log(`📦 Importing synthetic documents from ${outputDir} into Dataset Manager...`);
    const res = pipeline.importToDatasetManager(outputDir);
    console.log(`✅ Imported ${res.importedCount} documents into benchmarks/dataset/RAW/ and updated Dataset Manager.`);
  });

program.parse(process.argv);
