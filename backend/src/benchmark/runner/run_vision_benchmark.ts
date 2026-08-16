import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../../../.env.development') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../../.env.development') });
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

import { BenchmarkRunner } from './BenchmarkRunner';

const datasetDir    = path.resolve(__dirname, '../../../../ADBG/AU_DIC_Benchmark_v1.0');
const reportsOutDir = path.resolve(__dirname, '../../../benchmark_reports');

async function main() {
  console.log('============================================================');
  console.log(' AU DIC BENCHMARK — MULTIMODAL VISION INFERENCE RERUN');
  console.log('============================================================');
  console.log(`Dataset:        ${datasetDir}`);
  console.log(`Reports:        ${reportsOutDir}`);
  console.log(`Model:          Vision AI Engine (Multimodal Base64 Image Input)`);
  console.log(`Checkpoint:     ENABLED\n`);

  console.log('Verifying API Key Availability:');
  console.log('  OPENROUTER_API_KEY:', process.env.OPENROUTER_API_KEY ? `SET (${process.env.OPENROUTER_API_KEY.slice(0,8)}...)` : 'NOT SET');
  console.log('  GEMINI_API_KEY:    ', process.env.GEMINI_API_KEY ? `SET (${process.env.GEMINI_API_KEY.slice(0,8)}...)` : 'NOT SET');
  console.log('  GROQ_API_KEY:      ', process.env.GROQ_API_KEY ? `SET (${process.env.GROQ_API_KEY.slice(0,8)}...)` : 'NOT SET');

  if (!process.env.OPENROUTER_API_KEY && !process.env.GEMINI_API_KEY && !process.env.GROQ_API_KEY) {
    console.error('FATAL: No API keys loaded! Check environment configuration.');
    process.exit(1);
  }

  const runner = new BenchmarkRunner({
    datasetDir,
    reportsOutputDir: reportsOutDir,
    predictionOptions: {
      dryRunMockResponse: false,
      allowMockFallback: false, // HARD FAIL on any error — NO SILENT MOCK FALLBACK
      useAiProvider: true,
    },
    resumeCheckpoint: true,
  });

  console.log('[START] Executing Vision-Based Benchmark Evaluation...\n');
  const startMs = Date.now();

  const { report, reportDir } = await runner.run();
  const durationMin = ((Date.now() - startMs) / 60000).toFixed(1);

  console.log('\n============================================================');
  console.log('VISION BENCHMARK RERUN RESULTS');
  console.log('============================================================');
  console.log(`Total Samples:        ${report.totalSamples}`);
  console.log(`Successful:           ${report.successfulEvaluations}`);
  console.log(`Failed:               ${report.failedEvaluations}`);
  console.log(`Category Accuracy:    ${(report.overallCategoryAccuracy * 100).toFixed(2)}%`);
  console.log(`Mean Field Precision: ${(report.overallMeanPrecision * 100).toFixed(2)}%`);
  console.log(`Mean Field Recall:    ${(report.overallMeanRecall * 100).toFixed(2)}%`);
  console.log(`Mean Field F1:        ${(report.overallMeanF1 * 100).toFixed(2)}%`);
  console.log(`Mean CER:             ${(report.overallMeanCer * 100).toFixed(2)}%`);
  console.log(`Mean WER:             ${(report.overallMeanWer * 100).toFixed(2)}%`);
  console.log(`Exact Match Rate:     ${(report.overallExactMatchRate * 100).toFixed(2)}%`);
  console.log(`Throughput:           ${report.performance.throughputSamplesPerSec.toFixed(4)} samples/sec`);
  console.log(`Duration:             ${durationMin} min`);
  console.log(`Report Dir:           ${reportDir}`);

  // 1. Generate paired_field_observations.csv
  const csvLines: string[] = ['sample_id,document_type,quality_profile,field_name,expected_value,predicted_value,matched,cer,wer,error_category'];
  const compFile = path.join(reportDir, 'comparisons.json');
  if (fs.existsSync(compFile)) {
    const rawCmp = JSON.parse(fs.readFileSync(compFile, 'utf-8'));
    const comparisonsList = Array.isArray(rawCmp) ? rawCmp : (rawCmp.comparisons || rawCmp.results || []);
    for (const c of comparisonsList) {
      for (const d of (c.discrepancies || [])) {
        const expStr = String(d.expected ?? '').replace(/"/g, '""');
        const actStr = String(d.actual ?? '').replace(/"/g, '""');
        csvLines.push(`"${c.sampleId}","${c.documentType}","${c.qualityProfile}","${d.field}","${expStr}","${actStr}",${d.matched ? 1 : 0},${d.cer ?? 0},${d.wer ?? 0},"${d.errorCategory || 'NONE'}"`);
      }
    }
  }
  const csvPath = path.join(reportDir, 'paired_field_observations.csv');
  fs.writeFileSync(csvPath, csvLines.join('\n'), 'utf-8');

  // 2. Generate statistical_results.json
  const statResults = {
    benchmarkRunId: report.runId,
    totalSamples: report.totalSamples,
    overallCategoryAccuracy: report.overallCategoryAccuracy,
    overallMeanPrecision: report.overallMeanPrecision,
    overallMeanRecall: report.overallMeanRecall,
    overallMeanF1: report.overallMeanF1,
    overallMeanCer: report.overallMeanCer,
    overallMeanWer: report.overallMeanWer,
    overallExactMatchRate: report.overallExactMatchRate,
    confidenceMetrics: report.confidenceMetrics,
    errorTaxonomySummary: report.errorTaxonomySummary,
    profileBreakdown: report.profileBreakdown,
    categoryBreakdown: report.categoryBreakdown,
    robustnessAnalysis: report.robustnessAnalysis,
    generatedAt: new Date().toISOString(),
  };
  const statPath = path.join(reportDir, 'statistical_results.json');
  fs.writeFileSync(statPath, JSON.stringify(statResults, null, 2), 'utf-8');

  console.log(`\nPaired observations saved: ${csvPath}`);
  console.log(`Statistical results saved: ${statPath}`);
  console.log('\n✅ VISION BENCHMARK RERUN COMPLETE.');
}

main().catch(err => {
  console.error('\n[FATAL] Vision benchmark failed:', err.message || err);
  process.exit(1);
});
