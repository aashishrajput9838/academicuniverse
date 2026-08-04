# Sprint 001 Walkthrough — AU DIC Benchmark Subsystem Foundation & Normalization Layer

## Accomplishments

1. **Subsystem Isolation (`backend/src/benchmark/`)**:
   Constructed a dedicated, isolated benchmark evaluation subsystem completely separate from production API routes and database collections.

   ```text
   backend/src/benchmark/
   ├── types/
   │   └── benchmark.types.ts
   ├── normalizers/
   │   ├── StringNormalizer.ts
   │   ├── DateNormalizer.ts
   │   ├── RollNumberNormalizer.ts
   │   ├── NumericNormalizer.ts
   │   ├── DegreeNameNormalizer.ts
   │   ├── UniversityAliasNormalizer.ts
   │   └── CanonicalNormalizer.ts
   ├── adapters/
   │   ├── AdbgGroundTruthAdapter.ts
   │   └── AuDicPredictionAdapter.ts
   ├── comparators/
   │   ├── StringDistanceComparator.ts
   │   ├── ExactMatchComparator.ts
   │   └── SubjectArrayComparator.ts
   ├── evaluators/
   │   ├── CategoryEvaluator.ts
   │   └── FieldLevelEvaluator.ts
   ├── metrics/
   │   └── MetricCalculator.ts
   ├── reports/
   │   └── ReportGenerator.ts
   ├── runner/
   │   └── BenchmarkRunner.ts
   ├── utils/
   │   └── fileLoader.ts
   └── __tests__/
       ├── groundTruthAdapter.test.ts
       ├── stringComparator.test.ts
       ├── normalizers.test.ts
       └── benchmarkRunner.test.ts
   ```

2. **Dedicated Normalization Layer**:
   - `CanonicalNormalizer`: Master orchestrator transforming raw Ground Truths and Predictions into canonical representations prior to comparator evaluation.
   - `StringNormalizer`: Trims, collapses whitespace, and lowercases strings.
   - `DateNormalizer`: Normalizes date strings (`July 14, 2025`, `14/07/2025`) into canonical ISO 8601 `YYYY-MM-DD`.
   - `RollNumberNormalizer`: Normalizes roll numbers (`2021-IT-000150`) into uppercase alphanumeric string `2021IT000150`.
   - `NumericNormalizer`: Parses float numbers and handles numerical rounding.
   - `DegreeNameNormalizer`: Normalizes degree shorthand prefixes (`B.Tech` -> `Bachelor of Technology`).
   - `UniversityAliasNormalizer`: Maps acronyms (`VTU`) to canonical university names (`Vivekananda Technical University`).

3. **Strictly Read-Only Operations**:
   - `AdbgGroundTruthAdapter`: Loads ADBG v1.0 ground truth JSON files and maps them to domain models.
   - `AuDicPredictionAdapter`: Executes AU DIC document intelligence headlessly without mutating MongoDB `UaipUpload`, `KnowledgeRecord`, or canonical collections.

4. **Self-Contained Report Generation**:
   - `ReportGenerator` produces a dedicated output directory for each run (`benchmark_reports/run_<timestamp>/`) containing `predictions.json`, `comparisons.json`, `metrics.json`, `execution.log`, and `summary.md`.

5. **100% Verification & Test Suite Pass Rate**:
   - Executed Jest test suite: **4/4 test suites passed (16/16 tests passing)**.
   - Executed ADBG test suite: **86/86 tests passed (100% pass rate)**.
