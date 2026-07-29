/**
 * Academic Universe — Legacy Benchmark Rectification Script
 *
 * Programmatically repairs `experiment_VAL-20260729.json` by:
 * 1. Reading all document evaluations.
 * 2. Treating `fieldMatches` as the SINGLE SOURCE OF TRUTH.
 * 3. Recomputing `fieldScores` using `computeFieldMetrics(fieldMatches)`.
 * 4. Recomputing all HITL fields to comply with locked decisions:
 *      - reviewRequired = reviewDurationSec > 0
 *      - fieldsCorrected derived deterministically per document/system if non-zero
 * 5. Recomputing `AggregateMetrics` from the recomputed document results.
 * 6. Validating ALL invariants via `BenchmarkValidator`.
 * 7. Writing the rectified JSON and creating a `.ORIG.json` backup.
 * 8. Issuing a certified `benchmark_certificate.json`.
 */

import fs from 'fs';
import path from 'path';
import { computeFieldMetrics, deterministicCorrectionCount } from '../metrics/metricsCalculator';
import { BenchmarkValidator } from '../validation/benchmarkValidator';
import { MetricsEngine } from '../metrics/metricsEngine';
import { ResultExporter } from '../exporters/resultExporter';
import { DocumentEvaluationResult, BaselineSystemId, AggregateMetrics } from '../types/benchmark.types';

const JSON_PATH = path.join(__dirname, '../../paper-draft-v1/benchmark-results/experiment_VAL-20260729.json');
const BACKUP_PATH = path.join(__dirname, '../../paper-draft-v1/benchmark-results/experiment_VAL-20260729.ORIG.json');
const OUTPUT_DIR = path.join(__dirname, '../../paper-draft-v1/benchmark-results');

export function rectifyBenchmarkJson(): void {
  console.log('\n🛠️  Starting Benchmark JSON Rectification...\n');

  if (!fs.existsSync(JSON_PATH)) {
    throw new Error(`File not found: ${JSON_PATH}`);
  }

  // 1. Create backup if not already present
  if (!fs.existsSync(BACKUP_PATH)) {
    fs.copyFileSync(JSON_PATH, BACKUP_PATH);
    console.log(`✅ Archived original file to: ${path.basename(BACKUP_PATH)}`);
  }

  const fileContent = fs.readFileSync(JSON_PATH, 'utf-8');
  const data = JSON.parse(fileContent);

  const rawEvaluations: any[] = data.evaluations || [];
  console.log(` Found ${rawEvaluations.length} evaluation records.`);

  const validator = new BenchmarkValidator();
  const rectifiedEvaluations: DocumentEvaluationResult[] = [];

  let tpCorrectionsCount = 0;

  // 2. Rectify each evaluation record from fieldMatches
  for (const raw of rawEvaluations) {
    const fieldMatches = raw.fieldMatches || [];
    
    // Canonical computation from fieldMatches ONLY
    const computed = computeFieldMetrics(fieldMatches);

    // Enforce locked HITL decisions:
    // reviewDurationSec > 0 → reviewRequired = true
    const reviewDurationSec = typeof raw.hitlMetrics?.reviewDurationSec === 'number'
      ? raw.hitlMetrics.reviewDurationSec
      : 0;
    const reviewRequired = reviewDurationSec > 0;
    
    // Deterministic fieldsCorrected alignment if review was required
    const rawCorrected = raw.hitlMetrics?.fieldsCorrected || 0;
    const fieldsCorrected = reviewRequired ? rawCorrected : 0;

    const rectified: DocumentEvaluationResult = {
      experimentId: raw.experimentId,
      documentId: raw.documentId,
      category: raw.category,
      systemId: raw.systemId,
      timestamp: raw.timestamp,
      primaryProvider: raw.primaryProvider,
      fallbackTriggered: raw.fallbackTriggered,
      fallbackProvider: raw.fallbackProvider || null,
      latencyMs: {
        uploadMs: raw.latencyMs.uploadMs,
        aiInferenceMs: raw.latencyMs.aiInferenceMs,
        dbStagingMs: raw.latencyMs.dbStagingMs,
        totalPipelineMs: raw.latencyMs.uploadMs + raw.latencyMs.aiInferenceMs + raw.latencyMs.dbStagingMs,
      },
      fieldMatches,
      fieldScores: {
        truePositives: computed.tp,
        falsePositives: computed.fp,
        falseNegatives: computed.fn,
        precision: computed.precision,
        recall: computed.recall,
        f1Score: computed.f1,
      },
      hitlMetrics: {
        reviewRequired,
        reviewDurationSec,
        fieldsCorrected,
        finalAction: raw.hitlMetrics?.finalAction || 'APPROVED',
      },
      success: raw.success ?? true,
      errorMessage: raw.errorMessage || undefined,
    };

    // Check if stored TP/FP/FN differed from computed
    if (raw.fieldScores) {
      if (raw.fieldScores.truePositives !== computed.tp ||
          raw.fieldScores.falsePositives !== computed.fp ||
          raw.fieldScores.falseNegatives !== computed.fn) {
        tpCorrectionsCount++;
        console.log(`   [FIXED] ${rectified.documentId} / ${rectified.systemId}: ` +
          `Old TP=${raw.fieldScores.truePositives},FP=${raw.fieldScores.falsePositives},FN=${raw.fieldScores.falseNegatives} ` +
          `→ New TP=${computed.tp},FP=${computed.fp},FN=${computed.fn}`);
      }
    }

    // Validate individual record
    const docVal = validator.validateDocument(rectified);
    if (!docVal.isValid) {
      console.error(`❌ Record validation failed for ${rectified.documentId}/${rectified.systemId}:`);
      console.error(BenchmarkValidator.generateReport(docVal));
      throw new Error(`Rectification failed for document ${rectified.documentId}`);
    }

    rectifiedEvaluations.push(rectified);
  }

  console.log(`\n Total record discrepancies corrected: ${tpCorrectionsCount}`);

  // 3. Compute aggregate metrics using MetricsEngine (which recomputes from fieldMatches)
  const metricsEngine = new MetricsEngine();
  const aggregateMetrics = metricsEngine.computeAggregate(rectifiedEvaluations);

  // Group by system
  const resultsBySystem = new Map<BaselineSystemId, DocumentEvaluationResult[]>();
  for (const r of rectifiedEvaluations) {
    const list = resultsBySystem.get(r.systemId) || [];
    list.push(r);
    resultsBySystem.set(r.systemId, list);
  }

  const aggregatesBySystem = new Map<BaselineSystemId, AggregateMetrics>();
  for (const [sysId, list] of resultsBySystem) {
    aggregatesBySystem.set(sysId, metricsEngine.computeAggregate(list));
  }

  // 4. Run full cross-system experiment validation
  console.log('\n🔍 Running full experiment validation on rectified data...');
  const expVal = validator.validateExperiment(resultsBySystem, aggregatesBySystem);

  if (!expVal.isValid) {
    console.error('❌ Experiment validation FAILED:');
    console.error(BenchmarkValidator.generateReport(expVal));
    throw new Error('Experiment validation failed on rectified data');
  }

  console.log('✅ ALL validation invariants PASSED (100% mathematically consistent).\n');

  // 5. Write rectified JSON artifact
  const outputData = {
    experimentId: data.experimentId || "EXP-VAL-20260729",
    generatedAt: new Date().toISOString(),
    rectified: true,
    note: "This benchmark JSON has been programmatically rectified and validated against canonical fieldMatches.",
    evaluations: rectifiedEvaluations,
  };

  fs.writeFileSync(JSON_PATH, JSON.stringify(outputData, null, 2), 'utf-8');
  console.log(`💾 Saved rectified benchmark JSON to: ${JSON_PATH}`);

  // 6. Generate Certificate & Export Artifacts
  const exporter = new ResultExporter(OUTPUT_DIR);
  exporter.exportValidatedResults(rectifiedEvaluations, aggregateMetrics, data.experimentId || "EXP-VAL-20260729");
  console.log(`📜 Certified benchmark certificate issued: ${path.join(OUTPUT_DIR, 'benchmark_certificate.json')}\n`);
}

if (require.main === module) {
  rectifyBenchmarkJson();
}
