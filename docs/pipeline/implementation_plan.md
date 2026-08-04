# AU DIC Benchmark Evaluation Framework — Implementation Plan (Sprint 005)

## Overview
With **Sprint 001** (Framework Foundation), **Sprint 002** (Field Evaluators & Normalizers), **Sprint 003** (Quality Profile Leaderboard & Heatmaps), and **Sprint 004** (Checkpoint/Resume, Concurrency, Failed Sample Archiving, and Exporters) 100% complete and verified, we enter **Sprint 005: Full Benchmark Execution & Scientific Manuscript Generation**.

---

## User Review Required

> [!IMPORTANT]
> **Full Dataset Execution Policy**:
> - Executes read-only evaluation run across all **360 samples** in `AU_DIC_Benchmark_v1.0`.
> - Produces final publication-ready reports in `benchmark_reports/run_<timestamp>/` containing `predictions.json`, `comparisons.json`, `metrics.json`, `results.csv`, `execution.log`, `summary.md`, and LaTeX tables.

---

## Proposed Changes — Sprint 005 Components

### [Component 1] Full 360-Sample Benchmark Execution CLI Script
#### [NEW] [runFullBenchmark.ts](file:///c:/github/academicuniverse.com/academicuniverse/backend/src/benchmark/runner/runFullBenchmark.ts)
- Executive CLI runner script to trigger full dataset evaluation across all 360 images with checkpointing and error logging.

---

### [Component 2] Final Verification & Report Validation
- Verify all 360 samples are evaluated.
- Confirm zero database writes or side effects.
- Verify summary table outputs and IEEE LaTeX table syntax.

---

## Verification Plan

### Automated Tests
- Run `npx jest --runInBand src/benchmark/__tests__` (7/7 test suites passing).
- Run `python -m pytest ADBG/tests/` (86/86 test suite passing).

### Manual Verification
- Verify self-contained run directory artifacts in `benchmark_reports/run_<timestamp>/`.
