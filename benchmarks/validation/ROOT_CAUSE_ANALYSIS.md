# Root Cause Analysis Report — Benchmark Pipeline Inconsistencies

**Project**: Academic Universe Document Intelligence Core (AU DIC)  
**Component**: Benchmark Generation Pipeline  
**Report Date**: 2026-07-29  
**Author**: Principal Software Architect / Benchmark Validation Lead  
**Status**: CRITICAL — Pipeline produces mathematically inconsistent artifacts

---

## 1. Executive Summary

The benchmark generation pipeline contains a **fundamental architectural flaw** in how field-level evaluation results are computed, stored, and aggregated. This flaw produces benchmark JSON, tables, and manuscript values that are mathematically inconsistent. The peer review correctly identified these inconsistencies as fatal to the paper's empirical narrative.

**Root Cause**: The pipeline conflates two different field-counting semantics:
1. **Paper semantics**: 7 core fields (`studentName`, `rollNumber`, `semester`, `sgpa`, `cgpa`, `issueDate`, `courseMarks`)
2. **Code semantics**: 7 scalar fields + N individual course matches from `courseMarks` array

Because the code computes TP/FP/FN over the expanded field list (7 + N courses) while the paper reports metrics over 7 fields, the stored `fieldScores` do not correspond to the reported 7-field metrics. This single design flaw cascades into aggregate metrics, tables, and manuscript values.

**Secondary Causes**:
- No validation layer ensures mathematical consistency between `fieldMatches` and `fieldScores`
- HITL metrics are hardcoded in `PipelineExecutor` and manually patched later
- `MetricsEngine` trusts input `fieldScores` without recomputing from `fieldMatches`
- Table generators derive from potentially incorrect `AggregateMetrics`
- No deterministic execution guarantees

---

## 2. Pipeline Stage Analysis

### Stage 1: Field Comparison (`FieldComparisonEngine`)

**Input**: Ground truth record + prediction record  
**Output**: `FieldMatchResult[]`

**Current Behavior**:
```typescript
compareAll(expected, actual, scalarFields) {
  // For each scalar field: 1 FieldMatchResult
  for (const field of scalarFields) {
    results.push(compareField(field, expected[field], actual[field]));
  }
  
  // For courseMarks: N FieldMatchResults (one per course)
  if (expected['courseMarks'] || actual['courseMarks']) {
    results.push(...compareCourseMarks(expected['courseMarks'], actual['courseMarks']));
  }
  
  return results; // Length = 7 + N_courses
}
```

**Problem**: `compareCourseMarks` returns one result per course code (e.g., `courseMarks.CS106`, `courseMarks.CS101`). For a document with 5 courses, this produces 5 additional results. The total field count becomes 12, not 7.

**Impact**: TP/FP/FN computed over 12 items do not correspond to 7-field precision/recall.

### Stage 2: Metric Calculation (`PipelineExecutor`)

**Input**: `FieldMatchResult[]` from Stage 1  
**Output**: `DocumentEvaluationResult.fieldScores`

**Current Behavior**:
```typescript
const tp = fieldMatches.filter((f) => f.isMatch).length;
const fp = fieldMatches.filter((f) => !f.isMatch && f.actual !== null && f.actual !== undefined).length;
const fn = fieldMatches.filter((f) => !f.isMatch && (f.actual === null || f.actual === undefined)).length;
```

**Problem**: TP/FP/FN are computed over ALL field matches including individual courses. For a 5-course document:
- If all 7 scalar fields match and all 5 courses match: tp=12, fp=0, fn=0
- But paper reports this as: tp=7, fp=0, fn=0

**Impact**: Per-document F1 scores are computed over the wrong field universe.

### Stage 3: Aggregation (`MetricsEngine`)

**Input**: Array of `DocumentEvaluationResult` with pre-computed `fieldScores`  
**Output**: `AggregateMetrics`

**Current Behavior**:
```typescript
const totalTP = this.sum(successful.map((r) => r.fieldScores.truePositives));
const totalFP = this.sum(successful.map((r) => r.fieldScores.falsePositives));
const totalFN = this.sum(successful.map((r) => r.fieldScores.falseNegatives));
```

**Problem**: Aggregates incorrect per-document TP/FP/FN values. The sums are arithmetically consistent with the wrong per-document values, so no internal error is detected.

**Impact**: Aggregate metrics appear correct but are computed over the wrong field universe.

### Stage 4: Table Generation (`ResultExporter`)

**Input**: `AggregateMetrics` and `ComparisonTableRow[]`  
**Output**: Markdown/CSV/LaTeX tables

**Current Behavior**: Derives all values from `AggregateMetrics` without recomputing.

**Problem**: Tables are consistent with aggregates, which are consistent with per-document scores, which are all wrong. No error detection.

**Impact**: Tables appear internally consistent but report metrics over 12 fields instead of 7.

### Stage 5: Manuscript Binding

**Input**: Generated tables  
**Output**: Hardcoded values in `research_paper.md`

**Current Behavior**: Values copied from tables into manuscript text.

**Problem**: Manuscript values are consistent with tables, which are consistent with the wrong field semantics.

**Impact**: The paper presents a coherent but incorrect empirical narrative.

---

## 3. HITL Metrics Inconsistencies

### Root Cause

`PipelineExecutor.processSingle()` hardcodes HITL metrics:
```typescript
const hitlMetrics = {
  reviewDurationSec: 0,
  fieldsCorrected: 0,
  finalAction: 'APPROVED' as const,
};
```

These values are later manually patched in the benchmark JSON simulation. Because there is no validation, inconsistent values propagate to tables and manuscript.

### Specific Inconsistencies Found

| Location | Claim | Actual |
|---|---|---|
| Table 7 | "2 of 5 (40%) documents requiring HITL review" | JSON shows all 5 have reviewDurationSec > 0 |
| Table 7 | "Total review time: 35 seconds" | Sum of all 5 review durations = 35s |
| Section 14.5 | "Total review time of 19 seconds" | Only sums 2 documents (12s + 7s) |
| Table 7 | "Total Corrections: 3" | JSON shows total fieldsCorrected = 2 |
| Section 14.5 | "2 fields corrected" | Matches JSON total fieldsCorrected = 2 |

**Root Cause**: No validation enforces consistency between `reviewDurationSec`, `fieldsCorrected`, and `reviewRequired` flags.

---

## 4. Missing Validation Layer

The pipeline has ZERO validation checkpoints:

```
Dataset → Runner → Comparison → Metrics → Aggregation → Export → Paper
   ↓         ↓          ↓           ↓            ↓           ↓        ↓
  None     None       None        None         None       None     None
```

There is no point in the pipeline where:
- `fieldScores` is recomputed from `fieldMatches` and checked for equality
- Precision/Recall/F1 equations are verified
- HITL metric consistency is checked
- Aggregate sums are verified against per-document values
- Latency totals are verified

---

## 5. Field Semantics Design Flaw

### Current Design

`FieldMatchResult` is a flat list where each element represents either:
- A scalar field comparison (studentName, rollNumber, etc.)
- An individual course comparison (courseMarks.CS106)

The pipeline treats all elements as equally weighted "fields" for TP/FP/FN computation.

### Required Design

The paper defines 7 core fields. Each field has specific comparison semantics:
1. `studentName`: string match
2. `rollNumber`: string match
3. `semester`: string match
4. `sgpa`: numeric tolerance match
5. `cgpa`: numeric tolerance match
6. `issueDate`: date-normalized match
7. `courseMarks`: exact array match (all-or-nothing)

Under the required semantics:
- `courseMarks` contributes exactly 1 to TP or 1 to FN (never per-course)
- Total field count is always 7 per document
- F1 is computed over 7 fields, not 7 + N courses

### Implementation Gap

`FieldComparisonEngine.compareCourseMarks()` returns per-course results. There is no mode to treat the array as a single atomic field.

---

## 6. Redundant Data Storage

`DocumentEvaluationResult` stores both:
- `fieldMatches: FieldMatchResult[]` (fundamental)
- `fieldScores: { tp, fp, fn, precision, recall, f1 }` (derived)

Because both are stored, they can diverge. The correct design is:
- Store ONLY `fieldMatches`
- Compute `fieldScores` on demand
- Validate that any stored `fieldScores` matches recomputed values

---

## 7. Determinism Gaps

1. **Timestamps**: `new Date().toISOString()` in `PipelineExecutor` produces different timestamps on every run
2. **Latency**: `Date.now()` measurements include OS scheduling jitter
3. **No seed control**: `FieldComparisonEngine` has no randomness, but runners may have nondeterministic API responses

For reproducibility, the benchmark must:
- Use deterministic timestamps based on document index
- Allow fixed latency injection for testing
- Record all random seeds

---

## 8. Recommended Architecture

### Single Source of Truth

```
CanonicalEvaluation {
  documentId, category, systemId,
  expected: Record<string, unknown>,
  predicted: Record<string, unknown>,
  fieldMatches: FieldMatchResult[],  // ONLY fundamental comparison data
  latencyMs: LatencyBreakdown,
  fallback: { triggered, provider },
  hitl: { reviewDurationSec, fieldsCorrected, finalAction }
}
```

### Derived Data (Computed, Never Stored Independently)

```
fieldScores = computeMetrics(fieldMatches)
aggregateMetrics = aggregate(fieldScores, fieldMatches)
tables = generateTables(aggregateMetrics)
paperValues = extractFromTables(tables)
```

### Validation Checkpoints

1. After field comparison: verify fieldMatches count matches expected field count
2. After metric computation: verify Precision = TP/(TP+FP), Recall = TP/(TP+FN), F1 = 2PR/(P+R)
3. After aggregation: verify aggregate TP = sum(doc TP), etc.
4. Before table generation: verify all documents have valid metrics
5. Before paper binding: verify all manuscript values match table values

---

## 9. Required Code Changes

### 9.1 Field Comparison Engine

Add `CourseMarksComparisonMode`:
```typescript
enum CourseMarksComparisonMode {
  PER_COURSE,    // Current behavior: one result per course
  PER_ARRAY      // Required behavior: one result for entire array
}
```

When `PER_ARRAY` is selected:
- `compareCourseMarks` returns a SINGLE `FieldMatchResult` for `courseMarks`
- `isMatch` is true only if ALL courses match exactly
- TP/FP/FN counts align with 7-field semantics

### 9.2 Pipeline Executor

- Accept `courseMarksComparisonMode` parameter
- Compute `fieldScores` from `fieldMatches` with explicit field-count validation
- Add `validateFieldScores()` method
- Never hardcode HITL metrics; require explicit input or simulate deterministically

### 9.3 Metrics Engine

- Add `recomputeFromFieldMatches()` method
- Add `validateAgainstFieldMatches()` method
- Never trust input `fieldScores`; always recompute and compare

### 9.4 Benchmark Validator (New)

```typescript
interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

interface ValidationError {
  documentId: string;
  systemId: string;
  field: string;
  expected: unknown;
  actual: unknown;
  violation: string;
  suggestedFix: string;
}
```

Validates:
- TP + FP + FN = total fieldMatches count
- Precision = TP / (TP + FP)
- Recall = TP / (TP + FN)
- F1 = 2 * P * R / (P + R)
- Aggregate sums match per-document sums
- HITL consistency: reviewDurationSec > 0 iff reviewRequired = true
- Latency total = upload + aiInference + dbStaging

### 9.5 Table Generators

- Accept `CanonicalEvaluation[]` instead of pre-computed `AggregateMetrics`
- Compute aggregates on the fly
- Never accept manually computed metrics

### 9.6 Manuscript Binding

- Generate manuscript values programmatically from benchmark JSON
- Never allow hardcoded numeric values in manuscript template

---

## 10. Test Coverage Requirements

### Unit Tests

| Component | Test Cases |
|---|---|
| FieldComparisonEngine | Per-array exact match, per-array partial match, empty arrays, null values |
| MetricsCalculator | TP/FP/FN computation, zero-division handling, floating-point precision |
| BenchmarkValidator | All equation validations, impossible state rejection |
| AggregationEngine | Sum verification, mean latency, category breakdown |

### Integration Tests

| Scenario | Expected Outcome |
|---|---|
| Full pipeline with 5 documents | All validations pass, tables match JSON |
| Introduce TP/FP/FN error | Validator fails, artifacts not generated |
| Introduce HITL inconsistency | Validator fails, artifacts not generated |
| Introduce latency mismatch | Validator fails, artifacts not generated |

### Property-Based Tests

| Invariant | Property |
|---|---|
| Precision/Recall/F1 | For all possible TP/FP/FN combinations, equations hold |
| Aggregation | Sum(per-doc TP) = aggregate TP for all datasets |
| Determinism | Same input → identical output across 100 runs |

---

## 11. Migration Strategy

### Phase 1: Validation Layer (No Breaking Changes)
- Add `BenchmarkValidator` class
- Add validation calls in `BenchmarkOrchestrator`
- Existing code continues to work; invalid runs abort with clear errors

### Phase 2: Metric Recalculation (Minimal Breaking Changes)
- Modify `MetricsEngine` to recompute from `fieldMatches`
- Add backward-compatible getters for `fieldScores`
- Existing serialized results still load but are validated

### Phase 3: Canonical Model (Breaking Changes)
- Introduce `CanonicalEvaluation` type
- Migrate all pipeline stages to use canonical model
- Deprecate `fieldScores` storage in `DocumentEvaluationResult`

### Phase 4: Table/Paper Generation
- Refactor `ResultExporter` to accept canonical evaluations
- Generate manuscript values programmatically
- Remove hardcoded values from manuscript templates

---

## 12. Success Criteria

| Criterion | Verification Method |
|---|---|
| All TP/FP/FN equations hold | Validator unit test: 100% pass |
| Aggregate sums match per-document sums | Integration test: 100% pass |
| HITL metrics consistent | Validator unit test: 100% pass |
| Latency totals match components | Validator unit test: 100% pass |
| Deterministic execution | Property test: 100 runs produce identical output |
| Tables match JSON | Integration test: 100% pass |
| Paper values match tables | Integration test: 100% pass |
| No manually entered metrics | Code review: 0 manual metric assignments |

---

## 13. Immediate Actions Required

1. **STOP** all manual benchmark JSON editing
2. **STOP** all manual table generation
3. **STOP** all manuscript value editing
4. **START** implementation of `BenchmarkValidator`
5. **START** refactoring of `FieldComparisonEngine` for 7-field semantics
6. **START** refactoring of `PipelineExecutor` to compute metrics from fieldMatches only
7. **START** creation of comprehensive test suite

---

*Report generated as part of benchmark pipeline repair initiative. All findings are based on static code analysis of the existing benchmark framework.*
