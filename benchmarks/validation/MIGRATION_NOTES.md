# Migration Notes — Benchmark Pipeline v1 to v2

**From**: Legacy benchmark pipeline with manual metric entry  
**To**: Validated, deterministic, single-source-of-truth benchmark pipeline

---

## 1. What Changed

### Before (v1)

```
Runner Output → Manual fieldScores → Aggregation → Tables → Paper
                ↑
                Manual edits, inconsistencies possible
```

### After (v2)

```
Runner Output → fieldMatches → computeFieldMetrics() → Validated fieldScores
                                                         ↓
                                        BenchmarkValidator checks all invariants
                                                         ↓
                                        MetricsEngine recomputes aggregates
                                                         ↓
                                        ResultExporter validates before export
                                                         ↓
                                        Paper binds to exported tables
```

---

## 2. Immediate Actions for Existing Code

### 2.1 Update FieldComparisonEngine usage

```typescript
// BEFORE (implicit PER_COURSE mode)
const engine = new FieldComparisonEngine();

// AFTER (explicit PER_ARRAY mode for 7-field semantics)
import { CourseMarksComparisonMode } from '../validation/fieldComparisonMode';
const engine = new FieldComparisonEngine({
  courseMarksMode: CourseMarksComparisonMode.PER_ARRAY,
});
```

### 2.2 Replace manual metric calculation

```typescript
// BEFORE (manual inline calculation)
const tp = fieldMatches.filter(f => f.isMatch).length;
const fp = fieldMatches.filter(f => !f.isMatch && f.actual).length;
const fn = fieldMatches.filter(f => !f.isMatch && !f.actual).length;
const precision = tp / (tp + fp);
// ... etc

// AFTER (canonical computation)
import { computeFieldMetrics } from '../metrics/metricsCalculator';
const metrics = computeFieldMetrics(fieldMatches);
// metrics.tp, metrics.fp, metrics.fn, metrics.precision, metrics.recall, metrics.f1
```

### 2.3 Add validation checkpoints

```typescript
// BEFORE (no validation)
const results = await executor.execute();
aggregateBySystem.set(sysId, metricsEngine.computeAggregate(results));

// AFTER (validation before artifact generation)
const results = await executor.execute();
const aggregates = metricsEngine.computeAggregate(results);

const validator = new BenchmarkValidator();
const validation = validator.validateAggregates(results, aggregates);
if (!validation.isValid) {
  throw new Error(`Validation failed: ${validation.errors.map(e => e.violation).join('; ')}`);
}
```

### 2.4 Use validated export

```typescript
// BEFORE (unvalidated export)
exporter.exportComparisonMarkdown(rows);

// AFTER (validated export)
exporter.exportValidatedResults(results, aggregates, experimentId);
```

---

## 3. Compatibility Matrix

| Component | v1 Compatible? | v2 Change Required? |
|---|---|---|
| FieldComparisonEngine | Yes (default changed) | Update if relying on PER_COURSE |
| PipelineExecutor | No | Rewrite to use computeFieldMetrics |
| MetricsEngine | Partial | Accepts old input but ignores fieldScores |
| ResultExporter | Yes | Use new exportValidatedResults() |
| BenchmarkOrchestrator | Partial | Add validation checkpoint |
| BenchmarkValidator | New | No migration needed |
| MetricsCalculator | New | No migration needed |

---

## 4. Rollback Plan

If issues arise with the new pipeline:

1. Revert `benchmarks/evaluators/fieldComparisonEngine.ts` to previous version
2. Revert `benchmarks/runners/pipelineExecutor.ts` to previous version
3. Revert `benchmarks/metrics/metricsEngine.ts` to previous version
4. Keep new validation files (they are additive and non-breaking)
5. Old benchmark JSON files remain valid (backward compatible deserialization)

---

## 5. Verification Steps

After migration, verify:

```bash
# 1. All unit tests pass
cd C:\github\academicuniverse.com\academicuniverse\benchmarks
npx jest --config jest.config.js --runInBand tests/unit/

# 2. Integration tests pass
npx jest --config jest.config.js --runInBand tests/integration/

# 3. Property tests pass
npx jest --config jest.config.js --runInBand tests/property/

# 4. Run a small pilot benchmark
npx ts-node cli/benchmark.ts pilot --sample 5 --systems SYS-PROP

# 5. Verify validation report exists in results directory
cat results/EXP-*_validation_report.json
```

---

## 6. Performance Impact

| Operation | v1 Time | v2 Time | Delta |
|---|---|---|---|
| Field comparison | ~1ms | ~1ms | 0% |
| Metric computation | ~0.1ms | ~0.1ms | 0% |
| Validation | 0ms | ~0.5ms | Negligible |
| Aggregation | ~1ms | ~1ms | 0% |
| Table generation | ~10ms | ~10ms | 0% |

**Conclusion**: Validation adds negligible overhead (< 1ms per document).

---

## 7. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| PER_ARRAY mode changes field counts | High | Medium | Explicit mode selection; tests verify 7-field semantics |
| Validation rejects previously accepted results | Medium | Low | Review and fix underlying data issues |
| MetricsEngine recomputation changes aggregate values | Medium | High | Recompute from canonical fieldMatches (correct behavior) |
| Tests fail on existing code | Low | Medium | Run test suite before and after migration |

---

*End of Migration Notes*
