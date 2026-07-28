/**
 * Academic Universe — Benchmark Logger
 * Writes structured JSONL logs per document evaluation and generates execution summaries.
 */

import fs from 'fs';
import path from 'path';
import { DocumentEvaluationResult } from '../types/benchmark.types';

export interface LogEntry extends DocumentEvaluationResult {
  experimentId: string;
}

export interface ExecutionSummary {
  experimentId: string;
  startTime: string;
  endTime: string;
  durationMs: number;
  totalDocuments: number;
  successCount: number;
  failureCount: number;
  fallbackCount: number;
  warnings: string[];
  errors: string[];
}

export class BenchmarkLogger {
  private logsDir: string;
  private experimentId: string;
  private jsonlPath: string;
  private csvPath: string;
  private summaryPath: string;
  private warnings: string[] = [];
  private errors: string[] = [];
  private startTime: Date;

  constructor(logsDir: string, experimentId: string) {
    this.logsDir = logsDir;
    this.experimentId = experimentId;
    this.jsonlPath = path.join(logsDir, `${experimentId}_results.jsonl`);
    this.csvPath = path.join(logsDir, `${experimentId}_results.csv`);
    this.summaryPath = path.join(logsDir, `${experimentId}_summary.json`);
    this.startTime = new Date();
    this.ensureDir();
    this.writeCsvHeader();
  }

  private ensureDir(): void {
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
  }

  /** Append one document evaluation result as a JSONL line */
  logResult(result: DocumentEvaluationResult): void {
    const entry: LogEntry = { ...result, experimentId: this.experimentId };
    fs.appendFileSync(this.jsonlPath, JSON.stringify(entry) + '\n', 'utf-8');
    this.appendCsvRow(result);

    if (!result.success && result.errorMessage) {
      this.errors.push(`[${result.documentId}] ${result.errorMessage}`);
    }
  }

  /** Log a warning message */
  warn(message: string): void {
    this.warnings.push(`[${new Date().toISOString()}] WARN: ${message}`);
    const warnPath = path.join(this.logsDir, `${this.experimentId}_warnings.log`);
    fs.appendFileSync(warnPath, message + '\n', 'utf-8');
  }

  /** Log an error message */
  error(message: string): void {
    this.errors.push(`[${new Date().toISOString()}] ERROR: ${message}`);
    const errPath = path.join(this.logsDir, `${this.experimentId}_errors.log`);
    fs.appendFileSync(errPath, message + '\n', 'utf-8');
  }

  /** Read all logged JSONL results from disk */
  readAllResults(): DocumentEvaluationResult[] {
    if (!fs.existsSync(this.jsonlPath)) return [];
    return fs.readFileSync(this.jsonlPath, 'utf-8')
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line) as DocumentEvaluationResult);
  }

  /** Write final execution summary JSON */
  writeSummary(totalDocuments: number): ExecutionSummary {
    const results = this.readAllResults();
    const endTime = new Date();
    const summary: ExecutionSummary = {
      experimentId: this.experimentId,
      startTime: this.startTime.toISOString(),
      endTime: endTime.toISOString(),
      durationMs: endTime.getTime() - this.startTime.getTime(),
      totalDocuments,
      successCount: results.filter((r) => r.success).length,
      failureCount: results.filter((r) => !r.success).length,
      fallbackCount: results.filter((r) => r.fallbackTriggered).length,
      warnings: this.warnings,
      errors: this.errors,
    };
    fs.writeFileSync(this.summaryPath, JSON.stringify(summary, null, 2), 'utf-8');
    return summary;
  }

  /** Returns path to the JSONL results file */
  get jsonlFilePath(): string { return this.jsonlPath; }

  private writeCsvHeader(): void {
    const header = [
      'experimentId', 'documentId', 'category', 'systemId', 'timestamp',
      'primaryProvider', 'fallbackTriggered', 'fallbackProvider',
      'uploadMs', 'aiInferenceMs', 'dbStagingMs', 'totalPipelineMs',
      'truePositives', 'falsePositives', 'falseNegatives',
      'precision', 'recall', 'f1Score',
      'reviewDurationSec', 'fieldsCorrected', 'finalAction',
      'success', 'errorMessage',
    ].join(',');
    fs.writeFileSync(this.csvPath, header + '\n', 'utf-8');
  }

  private appendCsvRow(r: DocumentEvaluationResult): void {
    const row = [
      this.experimentId,
      r.documentId,
      r.category,
      r.systemId,
      r.timestamp,
      r.primaryProvider,
      r.fallbackTriggered,
      r.fallbackProvider ?? '',
      r.latencyMs.uploadMs,
      r.latencyMs.aiInferenceMs,
      r.latencyMs.dbStagingMs,
      r.latencyMs.totalPipelineMs,
      r.fieldScores.truePositives,
      r.fieldScores.falsePositives,
      r.fieldScores.falseNegatives,
      r.fieldScores.precision.toFixed(4),
      r.fieldScores.recall.toFixed(4),
      r.fieldScores.f1Score.toFixed(4),
      r.hitlMetrics.reviewDurationSec,
      r.hitlMetrics.fieldsCorrected,
      r.hitlMetrics.finalAction,
      r.success,
      (r.errorMessage || '').replace(/,/g, ';'),
    ].join(',');
    fs.appendFileSync(this.csvPath, row + '\n', 'utf-8');
  }
}
