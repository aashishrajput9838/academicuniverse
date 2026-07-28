/**
 * Academic Universe — Pipeline Executor (Orchestration Engine)
 * Loads documents → dispatches to runners → collects outputs → compares ground truth
 * → generates metrics → logs everything → supports retry & resume from checkpoint.
 */

import fs from 'fs';
import path from 'path';
import {
  BenchmarkDocument,
  DocumentEvaluationResult,
  GroundTruthSchema,
  ExtractionPrediction,
  ExperimentRunCheckpoint,
  BaselineSystemId,
} from '../types/benchmark.types';
import { BenchmarkConfig } from '../config/benchmark.config';
import { DatasetLoader } from '../dataset/datasetLoader';
import { GroundTruthEngine } from '../ground-truth/groundTruthEngine';
import { FieldComparisonEngine } from '../evaluators/fieldComparisonEngine';
import { MetricsEngine } from '../metrics/metricsEngine';
import { BenchmarkLogger } from '../logging/benchmarkLogger';
import { IBaselineRunner } from '../baselines/baselineRunner.interface';

const SCALAR_FIELDS = ['studentName', 'rollNumber', 'semester', 'sgpa', 'cgpa', 'issueDate'];

const MIME_MAP: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
};

export interface PipelineExecutorOptions {
  runner: IBaselineRunner;
  config: BenchmarkConfig;
  documents: BenchmarkDocument[];
  logger: BenchmarkLogger;
}

export class PipelineExecutor {
  private runner: IBaselineRunner;
  private config: BenchmarkConfig;
  private documents: BenchmarkDocument[];
  private logger: BenchmarkLogger;
  private groundTruthEngine: GroundTruthEngine;
  private fieldComparer: FieldComparisonEngine;
  private checkpointPath: string;

  constructor(opts: PipelineExecutorOptions) {
    this.runner = opts.runner;
    this.config = opts.config;
    this.documents = opts.documents;
    this.logger = opts.logger;
    this.groundTruthEngine = new GroundTruthEngine();
    this.fieldComparer = new FieldComparisonEngine({
      numericTolerancePct: opts.config.numericTolerancePct,
    });
    this.checkpointPath = path.join(
      opts.config.logsDir,
      `${opts.config.experimentId}_${opts.runner.systemId}_checkpoint.json`
    );
  }

  /** Execute the full pipeline for all documents with retry + checkpoint resume support */
  async execute(): Promise<DocumentEvaluationResult[]> {
    await this.runner.initialize();

    // Load checkpoint if it exists (for resume support)
    const checkpoint = this.loadCheckpoint();
    const completed = new Set(checkpoint.completedDocumentIds);
    const results: DocumentEvaluationResult[] = [...checkpoint.results];

    const pending = this.documents.filter((d) => !completed.has(d.documentId));
    console.log(
      `[${this.runner.systemId}] ${pending.length} documents pending (${completed.size} already completed)`
    );

    for (let i = 0; i < pending.length; i++) {
      const doc = pending[i];
      console.log(`  [${i + 1}/${pending.length}] Processing: ${doc.documentId}`);

      const result = await this.processWithRetry(doc);
      results.push(result);
      this.logger.logResult(result);

      // Save checkpoint after every document
      checkpoint.completedDocumentIds.push(doc.documentId);
      checkpoint.results.push(result);
      checkpoint.pendingDocumentIds = pending.slice(i + 1).map((d) => d.documentId);
      checkpoint.lastUpdated = new Date().toISOString();
      this.saveCheckpoint(checkpoint);
    }

    await this.runner.shutdown();
    return results;
  }

  /** Process a single document with retry policy */
  private async processWithRetry(doc: BenchmarkDocument): Promise<DocumentEvaluationResult> {
    let lastError = '';
    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await this.processSingle(doc);
      } catch (err: any) {
        lastError = err.message || String(err);
        this.logger.warn(`[${doc.documentId}] Attempt ${attempt}/${this.config.maxRetries} failed: ${lastError}`);
        if (attempt < this.config.maxRetries) {
          await this.sleep(this.config.retryDelayMs * attempt);
        }
      }
    }
    // All retries exhausted — return failure result
    this.logger.error(`[${doc.documentId}] All ${this.config.maxRetries} retries exhausted: ${lastError}`);
    return this.buildFailureResult(doc, lastError);
  }

  /** Core single-document processing pipeline */
  private async processSingle(doc: BenchmarkDocument): Promise<DocumentEvaluationResult> {
    // 1. Load file buffer
    const buffer = fs.readFileSync(doc.filePath);
    const mimeType = MIME_MAP[doc.fileFormat] || 'application/octet-stream';

    // 2. Load & validate ground truth
    const groundTruth = this.groundTruthEngine.parseFile(doc.groundTruthPath);
    const validation = this.groundTruthEngine.validate(groundTruth);
    if (!validation.isValid) {
      throw new Error(`Ground truth invalid for ${doc.documentId}: ${validation.errors.join('; ')}`);
    }

    // 3. Dispatch to runner
    const runnerOutput = await this.runner.extract({
      documentId: doc.documentId,
      fileBuffer: buffer,
      fileFormat: doc.fileFormat,
      mimeType,
    });

    if (runnerOutput.errorMessage) {
      throw new Error(runnerOutput.errorMessage);
    }

    // 4. Compare prediction to ground truth
    const fieldMatches = this.fieldComparer.compareAll(
      groundTruth as unknown as Record<string, unknown>,
      runnerOutput.prediction as Record<string, unknown>,
      SCALAR_FIELDS
    );

    // 5. Compute field-level scores
    const tp = fieldMatches.filter((f) => f.isMatch).length;
    const fp = fieldMatches.filter((f) => !f.isMatch && f.actual !== null && f.actual !== undefined).length;
    const fn = fieldMatches.filter((f) => !f.isMatch && (f.actual === null || f.actual === undefined)).length;
    const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
    const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
    const f1Score = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

    // 6. Simulate HITL metrics (in real pipeline: measure actual review time)
    const hitlMetrics = {
      reviewDurationSec: 0, // Populated during actual human review sessions
      fieldsCorrected: 0,   // Populated by HITL review UI corrections log
      finalAction: 'APPROVED' as const,
    };

    return {
      experimentId: this.config.experimentId,
      documentId: doc.documentId,
      category: doc.category,
      systemId: this.runner.systemId,
      timestamp: new Date().toISOString(),
      primaryProvider: runnerOutput.primaryProvider,
      fallbackTriggered: runnerOutput.fallbackTriggered,
      fallbackProvider: runnerOutput.fallbackProvider || null,
      latencyMs: runnerOutput.latencyMs,
      fieldMatches,
      fieldScores: { truePositives: tp, falsePositives: fp, falseNegatives: fn, precision, recall, f1Score },
      hitlMetrics,
      success: true,
    };
  }

  private buildFailureResult(doc: BenchmarkDocument, errorMessage: string): DocumentEvaluationResult {
    return {
      experimentId: this.config.experimentId,
      documentId: doc.documentId,
      category: doc.category,
      systemId: this.runner.systemId,
      timestamp: new Date().toISOString(),
      primaryProvider: 'unknown',
      fallbackTriggered: false,
      fallbackProvider: null,
      latencyMs: { uploadMs: 0, aiInferenceMs: 0, dbStagingMs: 0, totalPipelineMs: 0 },
      fieldMatches: [],
      fieldScores: { truePositives: 0, falsePositives: 0, falseNegatives: 0, precision: 0, recall: 0, f1Score: 0 },
      hitlMetrics: { reviewDurationSec: 0, fieldsCorrected: 0, finalAction: 'REJECTED' },
      success: false,
      errorMessage,
    };
  }

  private loadCheckpoint(): ExperimentRunCheckpoint {
    if (fs.existsSync(this.checkpointPath)) {
      try {
        return JSON.parse(fs.readFileSync(this.checkpointPath, 'utf-8')) as ExperimentRunCheckpoint;
      } catch {}
    }
    return {
      experimentId: this.config.experimentId,
      startTime: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      completedDocumentIds: [],
      pendingDocumentIds: this.documents.map((d) => d.documentId),
      results: [],
    };
  }

  private saveCheckpoint(checkpoint: ExperimentRunCheckpoint): void {
    if (!fs.existsSync(this.config.logsDir)) {
      fs.mkdirSync(this.config.logsDir, { recursive: true });
    }
    fs.writeFileSync(this.checkpointPath, JSON.stringify(checkpoint, null, 2), 'utf-8');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((res) => setTimeout(res, ms));
  }
}
