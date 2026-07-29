# Engineering Change Log — Benchmark Pipeline Repair

**Project**: Academic Universe Document Intelligence Core (AU DIC)  
**Component**: Benchmark Generation Pipeline  
**Change Log Date**: 2026-07-29  
**Engineer**: Principal Software Architect / Benchmark Validation Lead  
**Change Type**: MAJOR REFACTORING — Architectural redesign for mathematical correctness

---

## CHANGELOG

### [1.0.0] — 2026-07-29 — Pipeline Repair Release

#### Added

- **`validation/benchmarkValidator.ts`**: Comprehensive validation engine that checks:
  - TP/FP/FN consistency with fieldMatches
  - Precision/Recall/F1 equation validity
  - Latency component sums
  - HITL metric consistency (reviewDurationSec > 0 iff corrections made)
  - Fallback provider presence when fallback triggered
  - Aggregate metric recomputation from per-document results

- **`validation/fieldComparisonMode.ts`**: Enum defining courseMarks comparison semantics:
  - `PER_ARRAY`: Treats entire courseMarks as single atomic field (7-field semantics)
  - `PER_COURSE`: Legacy per-course comparison (7 + N courses semantics)

- **`metrics/metricsCalculator.ts`**: Pure functions for canonical metric computation:
  - `computeFieldMetrics(fieldMatches)`: Computes TP/FP/FN/P/R/F1 from field matches
  - `validateFieldMetrics()`: Validates stored metrics match computed metrics
  - `validateFieldCount()`: Validates TP+FP+FN = fieldMatches count
  - `validateMetricEquations()`: Validates F1 = 2PR/(P+R)

- **`tests/unit/metricsCalculator.test.ts`**: Unit tests for metrics calculator

- **`tests/unit/benchmarkValidator.test.ts`**: Unit tests for validation engine

- **`tests/unit/fieldComparisonEngine.test.ts`**: Unit tests for PER_ARRAY and PER_COURSE modes

- **`tests/integration/pipelineValidation.test.ts`**: End-to-end integration tests

- **`tests/property/pipelineProperties.test.ts`**: Property-based tests for mathematical invariants

#### Changed

- **`evaluators/fieldComparisonEngine.ts`**:
  - Added `courseMarksMode` parameter to constructor
  - Added `compareCourseMarksAsSingleField()` method for PER_ARRAY semantics
  - `compareCourseMarks()` now dispatches based on mode
  - Default mode changed from implicit PER_COURSE to explicit PER_ARRAY

- **`runners/pipelineExecutor.ts`**:
  - Metrics are now computed FROM fieldMatches using `computeFieldMetrics()` instead of inline calculation
  - Added validation checkpoint after each document processing
  - HITL metrics are now derived from `simulatedReviewMs` parameter
  - Added `strictValidation` option to abort on validation failure
  - Removed hardcoded HITL metrics
  - Added aggregate consistency validation at end of run

- **`metrics/metricsEngine.ts`**:
  - `computeAggregate()` now recomputes ALL metrics from fieldMatches using `computeFieldMetrics()`
  - Never trusts stored `fieldScores` from input results
  - Category breakdown also recomputed from fieldMatches

- **`exporters/resultExporter.ts`**:
  - Added `validateComparisonRows()` to validate row values before export
  - Added `exportValidatedResults()` method that runs full validation before exporting
  - Validation report exported as JSON alongside results
  - Throws error if validation fails in strict mode

- **`runners/benchmarkOrchestrator.ts`**:
  - Added validation checkpoint after all systems complete
  - No artifacts generated until validation passes
  - Added `courseMarksMode` and `strictValidation` options
  - Validation report generated for every run

#### Removed

- No files removed. All changes are additive or in-place modifications.

#### Fixed

- **Field counting semantics**: Pipeline now correctly treats courseMarks as single field in PER_ARRAY mode
- **Metric derivation**: fieldScores are always recomputed from fieldMatches
- **Aggregation trust**: Aggregate metrics recomputed from per-document fieldMatches
- **HITL consistency**: Review duration and corrections are now derived consistently
- **Latency validation**: Total latency must equal sum of components
- **Fallback consistency**: Fallback provider must be present when fallback triggered

---

## MIGRATION NOTES

### Breaking Changes

1. **FieldComparisonEngine default mode**: The default `courseMarksMode` is now `PER_ARRAY`. Code that relied on per-course results must explicitly pass `CourseMarksComparisonMode.PER_COURSE`.

2. **MetricsEngine.computeAggregate()**: Now recomputes metrics from fieldMatches. Input `fieldScores` are ignored. Any code that manually sets `fieldScores` on `DocumentEvaluationResult` objects will have those values overwritten.

3. **PipelineExecutor HITL metrics**: HITL metrics are no longer hardcoded to 0. They are derived from `simulatedReviewMs` parameter.

### Non-Breaking Changes

1. **BenchmarkValidator**: New optional validation layer. Existing code continues to work without calling the validator.

2. **metricsCalculator**: New pure functions. Existing code continues to work; new code should use these functions for metric computation.

3. **ResultExporter**: New `exportValidatedResults()` method added alongside existing methods.

### Migration Steps

1. Update any code that creates `FieldComparisonEngine` without specifying `courseMarksMode`:
   ```typescript
   // Before
   const engine = new FieldComparisonEngine();
   
   // After (explicit, but default is PER_ARRAY)
   const engine = new FieldComparisonEngine({
     courseMarksMode: CourseMarksComparisonMode.PER_ARRAY,
   });
   ```

2. Update any code that manually sets `fieldScores` on `DocumentEvaluationResult`:
   ```typescript
   // Before (manual metric calculation)
   const result = {
     ...,
     fieldScores: { truePositives: 5, falsePositives: 1, ... },
   };
   
   // After (metrics computed from fieldMatches)
   const computed = computeFieldMetrics(fieldMatches);
   const result = {
     ...,
     fieldMatches,
     fieldScores: {
       truePositives: computed.tp,
       falsePositives: computed.fp,
       falseNegatives: computed.fn,
       precision: computed.precision,
       recall: computed.recall,
       f1Score: computed.f1,
     },
   };
   ```

3. Enable validation in production benchmark runs:
   ```typescript
   const executor = new PipelineExecutor({
     ...,
     strictValidation: true, // Abort on validation failure
   });
   ```

---

## TESTING

### Running Tests

```bash
cd C:\github\academicuniverse.com\academicuniverse\benchmarks

# Run all tests
npx jest --config jest.config.js --runInBand

# Run specific test suites
npx jest --config jest.config.js tests/unit/metricsCalculator.test.ts
npx jest --config jest.config.js tests/unit/benchmarkValidator.test.ts
npx jest --config jest.config.js tests/unit/fieldComparisonEngine.test.ts
npx jest --config jest.config.js tests/integration/pipelineValidation.test.ts
npx jest --config jest.config.js tests/property/pipelineProperties.test.ts
```

### Test Coverage Requirements

| Component | Required Coverage | Current Target |
|---|---|---|
| MetricsCalculator | 100% | 100% |
| BenchmarkValidator | 100% | 100% |
| FieldComparisonEngine | 100% | 100% |
| PipelineExecutor | Integration tests | Pass |
| MetricsEngine | Integration tests | Pass |

---

## VALIDATION CHECKLIST

Before any benchmark run, verify:

- [ ] `FieldComparisonEngine` is configured with `courseMarksMode`
- [ ] `PipelineExecutor` computes metrics from `fieldMatches` only
- [ ] `BenchmarkValidator` is called after each document and after aggregation
- [ ] `ResultExporter.exportValidatedResults()` is used for paper-bound artifacts
- [ ] All tests pass: `npx jest --config jest.config.js --runInBand`
- [ ] No manual edits to benchmark JSON after generation
- [ ] No manual edits to table markdown after generation

---

## KNOWN LIMITATIONS

1. **Deterministic timestamps**: `new Date().toISOString()` is still used for timestamps. For fully deterministic runs, replace with document-index-based timestamps.

2. **Random HITL corrections**: `fieldsCorrected` uses `Math.random()` in simulation. Replace with seed-based deterministic value for reproducibility.

3. **Legacy PER_COURSE mode**: Still supported but will produce different field counts. Ensure paper tables are generated with `PER_ARRAY` mode.

4. **External API nondeterminism**: Runner outputs from live APIs may vary between runs even with identical inputs. Lock model versions and temperatures for reproducibility.

---

## SUPPORT

For questions about the benchmark pipeline repair:
1. Review `validation/ROOT_CAUSE_ANALYSIS.md`
2. Review `validation/benchmarkValidator.ts` documentation
3. Run `npx jest --config jest.config.js --runInBand` to verify all tests pass

---

*End of Engineering Change Log*
