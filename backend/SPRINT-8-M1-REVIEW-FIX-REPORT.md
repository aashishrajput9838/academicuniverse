# Sprint 8 Milestone 1 Review Fix Report

## Fixes Applied

### Finding 1 (MEDIUM) — Benchmark Methodology

**File:** `src/__tests__/benchmarks/resumePipeline.benchmark.test.ts`

**Changes:**
- Replaced two sequential loops (baseline then logging) with 10 alternating rounds
- Each round runs baseline pipeline once, then logging-simulated pipeline once
- Calculates per-round durations and takes the **median** for comparison
- This reduces JIT warm-up bias and CPU scheduling variance between separate loops
- Added explanatory note in output: "Alternating-round methodology reduces JIT warm-up and CPU scheduling bias"

**Before:**
```typescript
const baselineDuration = endTime - startTime;
const loggingDuration = endTime2 - startTime2;
const overheadPercent = ((loggingDuration - baselineDuration) / baselineDuration) * 100;
```

**After:**
```typescript
for (let i = 0; i < rounds; i++) {
  const memBeforeBase = process.memoryUsage();
  const startBase = performance.now();
  await runPipelineOnce(detector, extractor, enhancer, scorer, false);
  const endBase = performance.now();
  baselineDurations.push(endBase - startBase);

  const memBeforeLog = process.memoryUsage();
  const startLog = performance.now();
  await runPipelineOnce(detector, extractor, enhancer, scorer, true);
  const endLog = performance.now();
  loggingDurations.push(endLog - startLog);
}

const medianBaseline = baselineDurations.slice().sort((a, b) => a - b)[Math.floor(rounds / 2)];
const medianLogging = loggingDurations.slice().sort((a, b) => a - b)[Math.floor(rounds / 2)];
const overheadPercent = ((medianLogging - medianBaseline) / medianBaseline) * 100;
```

### Finding 2 (LOW) — Unused QUIET_LOGGER

**File:** `src/__tests__/benchmarks/resumePipeline.benchmark.test.ts`

**Changes:**
- Removed unused `QUIET_LOGGER` constant (lines 139-144)

### Finding 3 (LOW) — Benchmark Artifacts Location

**Files:** 
- `src/__tests__/benchmarks/resumePipeline.benchmark.test.ts`

**Changes:**
- Moved benchmark output directory from `src/__tests__/benchmarks/` to `build/benchmarks/`
- Directory is created automatically with `fs.mkdirSync(outputDir, { recursive: true })`
- `build/` is already outside version control

**Before:**
```typescript
const outputPath = path.join(__dirname, 'SPRINT-8-M1-BENCHMARK-RESULTS.txt');
const outputPath = path.join(__dirname, 'SPRINT-8-M1-LOGGING-OVERHEAD.txt');
```

**After:**
```typescript
const outputDir = path.resolve(__dirname, '../../../../build/benchmarks');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}
const outputPath = path.join(outputDir, 'SPRINT-8-M1-BENCHMARK-RESULTS.txt');
const outputPath = path.join(outputDir, 'SPRINT-8-M1-LOGGING-OVERHEAD.txt');
```

---

## Summary

| Finding | Severity | Status | File |
|---------|----------|--------|------|
| 1 | MEDIUM | FIXED | `resumePipeline.benchmark.test.ts` |
| 2 | LOW | FIXED | `resumePipeline.benchmark.test.ts` |
| 3 | LOW | FIXED | `resumePipeline.benchmark.test.ts` |

All three findings addressed. No scope changes, no architecture changes, no new features added.
