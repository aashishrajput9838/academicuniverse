/**
 * benchmarkRunner.test.ts
 *
 * Integration test for BenchmarkRunner against ADBG v1.0 dataset.
 */

import * as fs from 'fs';
import * as path from 'path';
import { BenchmarkRunner } from '../runner/BenchmarkRunner';

describe('BenchmarkRunner Integration Test', () => {
  const datasetDir = path.resolve(__dirname, '../../../../ADBG/AU_DIC_Benchmark_v1.0');
  const reportsDir = path.resolve(__dirname, 'tmp_benchmark_reports');

  afterAll(() => {
    fs.rmSync(reportsDir, { recursive: true, force: true });
  });

  test('should execute read-only benchmark run over 10 sample spot check without database mutations', async () => {
    const runner = new BenchmarkRunner({
      datasetDir,
      reportsOutputDir: reportsDir,
      predictionOptions: { dryRunMockResponse: true, allowMockFallback: true },
      sampleLimit: 10,
    });

    const { report, reportDir } = await runner.run();

    expect(report.totalSamples).toBe(10);
    expect(report.overallCategoryAccuracy).toBe(1.0);
    expect(report.overallMeanF1).toBe(1.0);
    expect(fs.existsSync(path.join(reportDir, 'summary.md'))).toBe(true);
    expect(fs.existsSync(path.join(reportDir, 'metrics.json'))).toBe(true);
    expect(fs.existsSync(path.join(reportDir, 'predictions.json'))).toBe(true);
    expect(fs.existsSync(path.join(reportDir, 'comparisons.json'))).toBe(true);
    expect(fs.existsSync(path.join(reportDir, 'execution.log'))).toBe(true);
  });
});
