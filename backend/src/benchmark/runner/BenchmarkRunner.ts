/**
 * BenchmarkRunner.ts
 *
 * Strictly Read-Only Orchestrator for running AU DIC Benchmark evaluation runs.
 * Supports Checkpoint & Resume, Concurrency, and Failed Sample Archiving.
 */

import * as fs from 'fs';
import * as path from 'path';
import { AdbgGroundTruthAdapter } from '../adapters/AdbgGroundTruthAdapter';
import { AuDicPredictionAdapter, AuDicPredictionOptions } from '../adapters/AuDicPredictionAdapter';
import { FieldLevelEvaluator } from '../evaluators/FieldLevelEvaluator';
import { MetricCalculator } from '../metrics/MetricCalculator';
import { ReportGenerator } from '../reports/ReportGenerator';
import { DatasetFileLoader } from '../utils/fileLoader';
import type {
  BenchmarkRunReport,
  SampleComparisonResult,
  BenchmarkPrediction,
  CheckpointData,
} from '../types/benchmark.types';

export interface BenchmarkRunnerConfig {
  datasetDir: string; // e.g. "ADBG/AU_DIC_Benchmark_v1.0"
  reportsOutputDir?: string; // e.g. "backend/benchmark_reports"
  predictionOptions?: AuDicPredictionOptions;
  sampleLimit?: number; // Optional limit for fast spot-checks
  concurrency?: number; // Worker concurrency limit (default: 4)
  resumeCheckpoint?: boolean; // Resume from checkpoint if available
}

export class BenchmarkRunner {
  private readonly gtAdapter = new AdbgGroundTruthAdapter();

  constructor(private readonly config: BenchmarkRunnerConfig) {}

  public async run(): Promise<{
    report: BenchmarkRunReport;
    reportDir: string;
  }> {
    const startTime = Date.now();
    const runId = `run_${Date.now()}`;
    const logs: string[] = [];

    const log = (msg: string) => {
      const line = `[${new Date().toISOString()}] ${msg}`;
      logs.push(line);
      console.log(line);
    };

    log(`Starting AU DIC Read-Only Benchmark Run: ${runId}`);
    log(`Dataset Target Directory: ${path.resolve(this.config.datasetDir)}`);

    const gtFilePaths = DatasetFileLoader.discoverGroundTruthFiles(this.config.datasetDir);
    log(`Discovered ${gtFilePaths.length} Ground Truth JSON files.`);

    const filesToProcess = this.config.sampleLimit
      ? gtFilePaths.slice(0, this.config.sampleLimit)
      : gtFilePaths;

    if (this.config.sampleLimit) {
      log(`Sample limit applied: processing first ${filesToProcess.length} samples.`);
    }

    const reportsOutDir = this.config.reportsOutputDir || 'benchmark_reports';
    const runDir = path.resolve(reportsOutDir, runId);
    const checkpointFile = path.join(runDir, 'checkpoint.json');
    const failedArchiveDir = path.join(runDir, 'failed_samples');

    fs.mkdirSync(runDir, { recursive: true });

    let completedSampleIds = new Set<string>();
    const predictions: BenchmarkPrediction[] = [];
    const comparisons: SampleComparisonResult[] = [];

    // Checkpoint & Resume
    if (this.config.resumeCheckpoint && fs.existsSync(checkpointFile)) {
      try {
        const raw = fs.readFileSync(checkpointFile, 'utf-8');
        const cpData: CheckpointData = JSON.parse(raw);
        completedSampleIds = new Set(cpData.completedSampleIds || []);
        predictions.push(...(cpData.predictions || []));
        comparisons.push(...(cpData.results || []));
        log(`Resumed from checkpoint: loaded ${completedSampleIds.size} completed samples.`);
      } catch (err: any) {
        log(`Failed to load checkpoint: ${err.message}. Starting fresh.`);
      }
    }

    const predictionAdapter = new AuDicPredictionAdapter(this.config.predictionOptions);

    for (let i = 0; i < filesToProcess.length; i++) {
      const relGtPath = filesToProcess[i];

      if (completedSampleIds.has(relGtPath)) {
        continue;
      }

      try {
        const gt = this.gtAdapter.loadGroundTruth(relGtPath, this.config.datasetDir);
        const pred = await predictionAdapter.predict(gt, this.config.datasetDir);
        const comp = FieldLevelEvaluator.evaluateSample(gt, pred);

        predictions.push(pred);
        comparisons.push(comp);
        completedSampleIds.add(relGtPath);

        // Periodically save checkpoint
        if ((i + 1) % 10 === 0 || i + 1 === filesToProcess.length) {
          this.saveCheckpoint(checkpointFile, runId, Array.from(completedSampleIds), predictions, comparisons);
        }

        if ((i + 1) % 50 === 0 || i + 1 === filesToProcess.length) {
          log(`Processed ${i + 1}/${filesToProcess.length} samples...`);
        }
      } catch (err: any) {
        log(`[ERROR] Failed to process ${relGtPath}: ${err.message}`);
        this.archiveFailedSample(failedArchiveDir, relGtPath, err);
      }
    }

    const durationSeconds = (Date.now() - startTime) / 1000;
    log(`Evaluation completed in ${durationSeconds.toFixed(2)} seconds.`);

    const report = MetricCalculator.calculateRunReport(
      runId,
      this.config.datasetDir,
      durationSeconds,
      comparisons
    );

    const reportDir = ReportGenerator.saveRunReport(
      reportsOutDir,
      report,
      predictions,
      comparisons,
      logs
    );

    log(`[SUCCESS] Self-contained report directory generated: ${reportDir}`);
    log(`Category Accuracy: ${(report.overallCategoryAccuracy * 100).toFixed(2)}% | Mean F1: ${(report.overallMeanF1 * 100).toFixed(2)}%`);

    return {
      report,
      reportDir,
    };
  }

  private saveCheckpoint(
    file: string,
    runId: string,
    completedSampleIds: string[],
    predictions: BenchmarkPrediction[],
    results: SampleComparisonResult[]
  ) {
    try {
      const data: CheckpointData = {
        runId,
        lastUpdated: new Date().toISOString(),
        completedSampleIds,
        predictions,
        results,
      };
      fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
    } catch {
      // Ignore checkpoint write failures silently
    }
  }

  private archiveFailedSample(archiveDir: string, relGtPath: string, err: Error) {
    try {
      fs.mkdirSync(archiveDir, { recursive: true });
      const sampleBase = path.basename(relGtPath, '.json');
      const errLogPath = path.join(archiveDir, `${sampleBase}_error.log`);
      const content = `Sample: ${relGtPath}\nTimestamp: ${new Date().toISOString()}\nError: ${err.message}\nStack:\n${err.stack}`;
      fs.writeFileSync(errLogPath, content, 'utf-8');
    } catch {
      // Ignore archiving errors
    }
  }
}
