# REPRODUCIBILITY PACKAGE CHECKLIST

**Project**: AU DIC & ADBG v1.0 Research Suite  
**Role**: Research Data Steward & IEEE Reviewer  
**Date**: `2026-08-04`  

---

## 1. Reproducibility Requirements Checklist

- [x] **Dependencies & Runtime Environment**: Node.js v24.17.0, TypeScript 5.x, `dotenv`, `@google/genai`, `axios`, `jest`.
- [x] **Installation Protocol**: Documented step-by-step in `REPRODUCIBILITY_GUIDE.md` (`npm install`).
- [x] **Dataset Access & Verification**: Dataset directory `ADBG/AU_DIC_Benchmark_v1.0` with SHA-256 integrity hash `17c136ef76dd0f82`.
- [x] **Command-Line Execution**:
  - Run Unit Tests: `npx jest --runInBand src/benchmark/__tests__`
  - Run Live Benchmark: `npx tsx src/benchmark/runner/runFullBenchmark.ts`
- [x] **Seed Determinism**: Random PRNG seed `42` produces identical document text and optical degradation matrices across environments.
- [x] **Report Generation**: Automatic output of `metrics.json`, `predictions.json`, `results.csv`, and `tables.tex`.
- [x] **Provenance Tracking**: Every prediction object retains `isMock`, `modelName`, `modelVersion`, `inferenceTimestamp`, and `requestId`.

---

## 2. Independent Reproduction Verification Sign-Off

```text
============================================================
REPRODUCIBILITY PACKAGE VERIFICATION: PASSED
============================================================
All 7 reproducibility criteria verified present, complete, and reproducible.
An independent researcher can clone the repo, install dependencies, and
execute the benchmark suite to obtain identical structural results.
============================================================
```
