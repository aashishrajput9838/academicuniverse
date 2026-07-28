/**
 * Academic Universe — Benchmark Configuration Loader & Default Options
 */

import path from 'path';

export interface BenchmarkConfig {
  experimentId: string;
  datasetDir: string;
  manifestPath: string;
  groundTruthDir: string;
  outputDir: string;
  logsDir: string;
  resultsDir: string;
  chartsDir: string;
  concurrency: number;
  maxRetries: number;
  retryDelayMs: number;
  timeoutMs: number;
  numericTolerancePct: number;
  significanceAlpha: number;
  providers: {
    geminiModel: string;
    openRouterModel: string;
  };
}

const ROOT_DIR = path.resolve(__dirname, '../../');
const BENCHMARK_DIR = path.join(ROOT_DIR, 'benchmarks');

export const DEFAULT_BENCHMARK_CONFIG: BenchmarkConfig = {
  experimentId: `EXP-${new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14)}`,
  datasetDir: path.join(BENCHMARK_DIR, 'dataset'),
  manifestPath: path.join(BENCHMARK_DIR, 'dataset', 'manifest.json'),
  groundTruthDir: path.join(BENCHMARK_DIR, 'ground-truth'),
  outputDir: path.join(BENCHMARK_DIR, 'results'),
  logsDir: path.join(BENCHMARK_DIR, 'results', 'logs'),
  resultsDir: path.join(BENCHMARK_DIR, 'results', 'reports'),
  chartsDir: path.join(BENCHMARK_DIR, 'results', 'charts'),
  concurrency: 2,
  maxRetries: 3,
  retryDelayMs: 2000,
  timeoutMs: 30000,
  numericTolerancePct: 0.01, // 1% tolerance for SGPA/CGPA rounding
  significanceAlpha: 0.05,
  providers: {
    geminiModel: 'google/gemini-1.5-pro-latest',
    openRouterModel: 'openrouter/gpt-4o-mini-2024-07-18',
  },
};

export function loadBenchmarkConfig(overrides: Partial<BenchmarkConfig> = {}): BenchmarkConfig {
  return {
    ...DEFAULT_BENCHMARK_CONFIG,
    ...overrides,
    providers: {
      ...DEFAULT_BENCHMARK_CONFIG.providers,
      ...(overrides.providers || {}),
    },
  };
}
