/**
 * Academic Universe — Pipeline Executor (Orchestration Engine)
 * Loads documents → dispatches to runners → collects outputs → compares ground truth
 * → computes metrics from fieldMatches → validates → logs everything.
 *
 * Design Principle: fieldScores is DERIVED from fieldMatches, never independently stored.
 * Validation occurs before any result is persisted.
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
import { FieldComparisonEngine, CourseMarksComparisonMode } from '../evaluators/fieldComparisonEngine';
import { MetricsEngine } from '../metrics/metricsEngine';
import { BenchmarkLogger } from '../logging/benchmarkLogger';
import { IBaselineRunner } from '../baselines/baselineRunner.interface';
import { BenchmarkValidator, ValidationResult } from '../validation/benchmarkValidator';
import { computeFieldMetrics, deterministicCorrectionCount } from '../metrics/metricsCalculator';

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
  /** CourseMarks comparison mode. Default: PER_ARRAY (7-field semantics). */
  courseMarksMode?: CourseMarksComparisonMode;
  /** Simulated HITL review duration (ms). 0 = skip simulation. */
  simulatedReviewMs?: number;
  /** If true, abort on validation failure instead of warning. */
  strictValidation?: boolean;
}

export class PipelineExecutor {
  private runner: IBaselineRunner;
  private config: BenchmarkConfig;
  private documents: BenchmarkDocument[];
  private logger: BenchmarkLogger;
  private groundTruthEngine: GroundTruthEngine;
  private fieldComparer: FieldComparisonEngine;
  private metricsEngine: MetricsEngine;
  private validator: BenchmarkValidator;
  private checkpointPath: string;
  private courseMarksMode: CourseMarksComparisonMode;
  private simulatedReviewMs: number;
  private strictValidation: boolean;

  constructor(opts: PipelineExecutorOptions) {
    this.runner = opts.runner;
    this.config = opts.config;
    this.documents = opts.documents;
    this.logger = opts.logger;
    this.groundTruthEngine = new GroundTruthEngine();
    this.metricsEngine = new MetricsEngine();
    this.validator = new BenchmarkValidator();
    this.courseMarksMode = opts.courseMarksMode || CourseMarksComparisonMode.PER_ARRAY;
    this.simulatedReviewMs = opts.simulatedReviewMs || 0;
    this.strictValidation = opts.strictValidation || false;

    this.fieldComparer = new FieldComparisonEngine({
      numericTolerancePct: opts.config.numericTolerancePct,
      courseMarksMode: this.courseMarksMode,
    });

    this.checkpointPath = path.join(
      opts.config.logsDir,
      `${opts.config.experimentId}_${opts.runner.systemId}_checkpoint.json`
    );
  }

  async execute(): Promise<DocumentEvaluationResult[]> {
    await this.runner.initialize();

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

      // Validate individual result before checkpointing
      const docValidation = this.validator.validateDocument(result);
      if (!docValidation.isValid) {
        const report = BenchmarkValidator.generateReport(docValidation);
        this.logger.error(`[${doc.documentId}] Validation FAILED:\n${report}`);
        if (this.strictValidation) {
          throw new Error(`Validation failed for ${doc.documentId}: ${docValidation.errors.map(e => e.violation).join('; ')}`);
        }
      }

      checkpoint.completedDocumentIds.push(doc.documentId);
      checkpoint.results.push(result);
      checkpoint.pendingDocumentIds = pending.slice(i + 1).map((d) => d.documentId);
      checkpoint.lastUpdated = new Date().toISOString();
      this.saveCheckpoint(checkpoint);

      if (this.runner.systemId !== 'SYS-BASE-1' && i < pending.length - 1) {
        await this.sleep(2500);
      }
    }

    await this.runner.shutdown();

    // Validate aggregate consistency after all documents processed
    const aggregateValidation = this.validateAggregateConsistency(results);
    if (!aggregateValidation.isValid) {
      const report = BenchmarkValidator.generateReport(aggregateValidation);
      this.logger.error(`[${this.runner.systemId}] Aggregate validation FAILED:\n${report}`);
      if (this.strictValidation) {
        throw new Error(`Aggregate validation failed: ${aggregateValidation.errors.map(e => e.violation).join('; ')}`);
      }
    }

    return results;
  }

  private async processWithRetry(doc: BenchmarkDocument): Promise<DocumentEvaluationResult> {
    let lastError = '';
    const maxRetries = this.config.maxRetries;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.processSingle(doc);
      } catch (err: any) {
        lastError = err.message || String(err);
        const isRateLimit = err.response?.status === 429 || /rate.?limit|429/i.test(lastError);
        this.logger.warn(`[${doc.documentId}] Attempt ${attempt}/${maxRetries} failed${isRateLimit ? ' (rate limited)' : ''}: ${lastError}`);
        if (attempt < maxRetries) {
          if (isRateLimit) {
            const backoffMs = 5000 * Math.pow(2.0, attempt - 1);
            this.logger.warn(`[${doc.documentId}] Rate limited — exponential backoff: waiting ${backoffMs}ms`);
            await this.sleep(backoffMs);
          } else {
            await this.sleep(this.config.retryDelayMs * attempt);
          }
        }
      }
    }
    this.logger.error(`[${doc.documentId}] All ${maxRetries} retries exhausted: ${lastError}`);
    return this.buildFailureResult(doc, lastError);
  }

  private async processSingle(doc: BenchmarkDocument): Promise<DocumentEvaluationResult> {
    const buffer = fs.readFileSync(doc.filePath);
    const mimeType = MIME_MAP[doc.fileFormat] || 'application/octet-stream';

    const groundTruth = this.groundTruthEngine.parseFile(doc.groundTruthPath);
    const validation = this.groundTruthEngine.validate(groundTruth);
    if (!validation.isValid) {
      throw new Error(`Ground truth invalid for ${doc.documentId}: ${validation.errors.join('; ')}`);
    }

    const runnerOutput = await this.runner.extract({
      documentId: doc.documentId,
      fileBuffer: buffer,
      fileFormat: doc.fileFormat,
      mimeType,
    });

    if (runnerOutput.errorMessage) {
      throw new Error(runnerOutput.errorMessage);
    }

    // Compare prediction to ground truth
    const fieldMatches = this.fieldComparer.compareAll(
      groundTruth as unknown as Record<string, unknown>,
      runnerOutput.prediction as Record<string, unknown>,
      SCALAR_FIELDS
    );

    // Compute metrics FROM fieldMatches (canonical computation)
    const computedMetrics = computeFieldMetrics(fieldMatches);

    // Simulate HITL review if configured.
    // reviewRequired = human performed a review pass (duration > 0).
    // Decision 1: reviewRequired=true with fieldsCorrected=0 is VALID.
    // Decision 3: reviewDurationSec measures review time, not correction time.
    // RCA-3 FIX: Use deterministic seed-based correction count (no Math.random()).
    const reviewRequired = this.simulatedReviewMs > 0;
    const reviewDurationSec = reviewRequired ? this.simulatedReviewMs / 1000 : 0;
    const fieldsCorrected = deterministicCorrectionCount(
      doc.documentId,
      this.runner.systemId,
      2,              // maxCorrections
      reviewRequired
    );

    const result: DocumentEvaluationResult = {
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
      fieldScores: {
        truePositives: computedMetrics.tp,
        falsePositives: computedMetrics.fp,
        falseNegatives: computedMetrics.fn,
        precision: computedMetrics.precision,
        recall: computedMetrics.recall,
        f1Score: computedMetrics.f1,
      },
      hitlMetrics: {
        reviewRequired,
        reviewDurationSec,
        fieldsCorrected,
        finalAction: 'APPROVED' as const,
      },
      success: true,
    };

    return result;
  }

  /**
   * Validate that aggregate metrics computed from per-document results
   * are consistent with any stored aggregate values.
   */
  private validateAggregateConsistency(results: DocumentEvaluationResult[]): ValidationResult {
    const aggregates = this.metricsEngine.computeAggregate(results);
    return this.validator.validateAggregates(results, aggregates);
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
      hitlMetrics: { reviewRequired: false, reviewDurationSec: 0, fieldsCorrected: 0, finalAction: 'REJECTED' },
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
      seed: `${this.config.experimentId}:${this.runner.systemId}`,
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
