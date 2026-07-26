import { spawn } from 'child_process';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

interface BenchmarkResult {
  suite: string;
  passed: number;
  failed: number;
  durationMs: number;
  slaMet: boolean;
}

interface StagingBenchmarkConfig {
  environment: 'staging';
  hardwareProfile: {
    cpu: string;
    memory: string;
    mongodb: string;
    network: string;
    coldStart: string;
  };
  slas: {
    timeToAcknowledgeMs: number;
    pipelineCompletionMs: number;
    maxPdfPages: number;
  };
  outputDir: string;
}

const DEFAULT_CONFIG: StagingBenchmarkConfig = {
  environment: 'staging',
  hardwareProfile: {
    cpu: '2 vCPU',
    memory: '4 GB RAM',
    mongodb: 'single-node replica set on localhost',
    network: 'loopback',
    coldStart: 'excluded',
  },
  slas: {
    timeToAcknowledgeMs: 500,
    pipelineCompletionMs: 5000,
    maxPdfPages: 10,
  },
  outputDir: join(process.cwd(), 'build', 'benchmarks'),
};

async function runCommand(command: string, args: string[]): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve) => {
    const child = spawn(command, args, { stdio: 'pipe' });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      resolve({ stdout, stderr, code: code || 0 });
    });
  });
}

function parseJestOutput(stdout: string): { passed: number; failed: number } {
  const passMatch = stdout.match(/Tests:\s+(\d+)\s+passed/);
  const failMatch = stdout.match(/(\d+)\s+failed/);

  return {
    passed: passMatch ? parseInt(passMatch[1], 10) : 0,
    failed: failMatch ? parseInt(failMatch[1], 10) : 0,
  };
}

async function runBenchmarkSuite(testPattern: string): Promise<BenchmarkResult> {
  const startTime = performance.now();

  const { stdout, stderr, code } = await runCommand('npx', [
    'jest',
    '--runInBand',
    '--testPathPattern',
    testPattern,
    '--verbose',
  ]);

  const durationMs = performance.now() - startTime;
  const { passed, failed } = parseJestOutput(stdout);

  return {
    suite: testPattern,
    passed,
    failed,
    durationMs,
    slaMet: failed === 0,
  };
}

async function main() {
  const config: StagingBenchmarkConfig = { ...DEFAULT_CONFIG };

  console.log('=== Sprint 9 M4 — Staging Benchmark Execution ===\n');
  console.log('Hardware Profile:');
  console.log(`  CPU:            ${config.hardwareProfile.cpu}`);
  console.log(`  Memory:         ${config.hardwareProfile.memory}`);
  console.log(`  MongoDB:        ${config.hardwareProfile.mongodb}`);
  console.log(`  Network:        ${config.hardwareProfile.network}`);
  console.log(`  Cold Start:     ${config.hardwareProfile.coldStart}`);
  console.log('');
  console.log('SLA Thresholds:');
  console.log(`  Time-to-acknowledge:     < ${config.slas.timeToAcknowledgeMs}ms`);
  console.log(`  Pipeline completion:     < ${config.slas.pipelineCompletionMs}ms`);
  console.log(`  Max PDF pages:           ${config.slas.maxPdfPages}`);
  console.log('');

  if (!existsSync(config.outputDir)) {
    mkdirSync(config.outputDir, { recursive: true });
  }

  const suites = [
    { name: 'Pipeline Benchmark', pattern: 'resumePipeline.benchmark.test.ts' },
    { name: 'SLA Benchmark', pattern: 'sla.benchmark.test.ts' },
    { name: 'Skill Projection Benchmark', pattern: 'skillProjection.benchmark.test.ts' },
  ];

  const results: BenchmarkResult[] = [];

  for (const suite of suites) {
    console.log(`Running ${suite.name}...`);
    const result = await runBenchmarkSuite(suite.pattern);
    results.push(result);
    console.log(`  Passed: ${result.passed}, Failed: ${result.failed}, Duration: ${result.durationMs.toFixed(2)}ms, SLA Met: ${result.slaMet ? 'YES' : 'NO'}`);
  }

  const allSlaMet = results.every((r) => r.slaMet);
  const totalDuration = results.reduce((sum, r) => sum + r.durationMs, 0);

  const outputPath = join(config.outputDir, 'SPRINT-9-M4-BENCHMARK-RESULTS.txt');
  const lines = [
    '=== Sprint 9 Milestone 4 — Production Benchmark Execution ===',
    '',
    `Environment: ${config.environment}`,
    '',
    'Hardware Profile:',
    `  CPU:            ${config.hardwareProfile.cpu}`,
    `  Memory:         ${config.hardwareProfile.memory}`,
    `  MongoDB:        ${config.hardwareProfile.mongodb}`,
    `  Network:        ${config.hardwareProfile.network}`,
    `  Cold Start:     ${config.hardwareProfile.coldStart}`,
    '',
    'SLA Thresholds:',
    `  Time-to-acknowledge:     < ${config.slas.timeToAcknowledgeMs}ms`,
    `  Pipeline completion:     < ${config.slas.pipelineCompletionMs}ms`,
    `  Max PDF pages:           ${config.slas.maxPdfPages}`,
    '',
    'Suite Results:',
    ...results.map((r) => `  ${r.suite}: passed=${r.passed}, failed=${r.failed}, duration=${r.durationMs.toFixed(2)}ms, slaMet=${r.slaMet ? 'YES' : 'NO'}`),
    '',
    `Total Duration: ${totalDuration.toFixed(2)}ms`,
    `Overall SLA Met: ${allSlaMet ? 'YES' : 'NO'}`,
    '',
    'Note: Benchmark results must be reported with this profile referenced.',
    'CI runners must meet or exceed this profile.',
  ];

  writeFileSync(outputPath, lines.join('\n'));
  console.log('\n' + lines.join('\n') + '\n');
  console.log(`Results written to: ${outputPath}`);

  process.exit(allSlaMet ? 0 : 1);
}

main().catch((err) => {
  console.error('Benchmark execution failed:', err);
  process.exit(1);
});
