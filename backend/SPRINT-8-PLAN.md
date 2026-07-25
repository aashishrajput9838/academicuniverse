# Sprint 8 Plan
## Resume Parser — Production Readiness

**Sprint:** 8  
**Date:** 2026-07-25  
**Status:** FROZEN  
**Architecture Baseline:** `RESUME-PARSER-ARCHITECTURE.md` v1.7  
**Tag Baseline:** `v0.7.0`

---

## 1. Objectives

Improve the production readiness of the resume parser pipeline without changing user-facing behavior or architecture:

1. **Performance Benchmarking** — measure and validate end-to-end pipeline latency against the `< 5s` SLA target.
2. **Structured Logging & Observability** — add consistent, structured log emission across resume pipeline stages.
3. **Person Deduplication Optimization** — reduce full-table scan cost in `findExistingPerson` while preserving exact Architecture v1.7 Section 7.4 matching behavior.
4. **Production Readiness Validation** — confirm backward compatibility, idempotency, and multi-tenant safety under realistic conditions.
5. **Technical Debt Reduction** — address low-severity backlog items that block production confidence.

**Outcome:** The resume parser pipeline remains feature-complete from Stage 0 → Stage 6, but is now measurable, observable, and optimized for production scale.

---

## 2. Scope

### In Scope

- Performance benchmarking suite for resume pipeline stages
- Structured logging standardization across resume services
- Person deduplication query optimization (indexing + query refactor)
- Production readiness validation tests
- Health-check / readiness-probe enhancement for resume subsystem
- Idempotency and multi-tenant safety regression tests
- Documentation updates for operational runbooks

### Out of Scope

- DIC Review UI
- New canonical models
- New AI providers or model changes
- OCR or parsing logic changes
- Changes to existing event contracts
- Database schema changes for core models
- Frontend changes

---

## 3. Architecture Impact

**Architecture version:** v1.7 (no architecture changes)

### v1.7 Stability

- No new stages or events
- No changes to deduplication formula
- No changes to event payloads
- No changes to multi-tenant boundaries

### Additive Changes Only

- New benchmark utilities under `src/__tests__/benchmarks/`
- New structured log fields in existing resume services
- New database indexes for `Person` and `AcademicRecord`
- New operational docs for on-call runbooks

---

## 4. Dependencies

| Dependency | Source | Purpose |
|------------|--------|---------|
| `ResumeParseResult` | Stage 4 output | Benchmark input fixture |
| `Person` | Canonical model | Deduplication optimization target |
| `AcademicRecord` | Canonical model | Institution score lookup |
| `KnowledgeDispatcher` | Shared infrastructure | Stage routing baseline |
| `EventBus` / `UaipEvents` | Events | Observability hooks |
| `winston` | Existing | Structured logging |
| `mongodb-memory-server` | Test infra | Benchmark isolation |

**No new npm dependencies required.**

---

## 5. Deliverables

### 5.1 Performance Benchmarking

- Add `src/__tests__/benchmarks/resumePipeline.benchmark.ts`
- Measure per-stage latency: classification, section detection, entity extraction, AI enhancement, confidence scoring, DIC routing, canonical writes
- Enforce `< 5s` end-to-end SLA threshold in CI
- Capture memory and query-count baselines
- Measure structured-logging overhead as part of benchmark

### 5.2 Structured Logging

- Standardize log keys across resume services: `processingId`, `organizationId`, `userId`, `stage`, `durationMs`
- Add stage-entry / stage-exit logs in dispatcher handlers
- Add `ResumeParseResult` state transition logs
- Ensure production format is JSON, development format is human-readable

### 5.3 Person Deduplication Optimization

- Add MongoDB compound indexes to support `findExistingPerson` queries
- Refactor `Person.findOne({ organizationId })` to use indexed `primaryEmail` lookup as first pass
- Preserve exact Architecture v1.7 Section 7.4 matching behavior
- Add fallback to full scan only when index miss occurs

### 5.4 Production Readiness Validation

- Add integration tests for concurrent canonical writes (idempotency under concurrency)
- Add health-check probe for resume subsystem dependencies (queue, dispatcher, event bus)
- Validate graceful degradation when DIC is unavailable
- Confirm no cross-tenant data leakage under load

### 5.5 Documentation

- Update `PROJECT-INDEX.md` test baselines
- Add operational runbook for resume pipeline monitoring
- Document benchmark execution and SLA interpretation

### 5.6 Benchmark Hardware Profile

All benchmark results are measured against this fixed hardware profile to ensure reproducibility:

| Resource | Specification |
|----------|---------------|
| CPU | 2 vCPU |
| Memory | 4 GB RAM |
| MongoDB | Single-node replica set on localhost |
| Network | Loopback (no network latency) |
| Cold start | Excluded from measurement |

Benchmark results must be reported with this profile referenced. CI runners must meet or exceed this profile.

---

## 6. Error Handling

| Failure Mode | Behavior |
|--------------|----------|
| Benchmark exceeds 5s SLA | CI warning; test marked flaky until optimized |
| Index creation fails | Fallback to existing query plan; log warning |
| Structured log serialization failure | Fallback to stringified JSON; do not crash pipeline |
| Concurrent canonical write collision | Existing E11000 duplicate-key handling preserved |
| Health-check dependency unavailable | Return 503 with dependency name |

---

## 7. Multi-Tenant Safety

- All benchmark fixtures scoped by `organizationId`
- Logging never emits `primaryEmail` or PII in production unless explicitly required
- Index design respects `organizationId` prefix where applicable
- No cross-tenant query changes

---

## 8. Interfaces

### BenchmarkRunner (new)

```ts
interface BenchmarkResult {
  stage: string;
  durationMs: number;
  memoryMB: number;
  queries: number;
  passed: boolean;
}

interface BenchmarkThresholds {
  endToEndMaxMs: 5000;
  stageMaxMs: Record<string, number>;
}
```

### HealthCheck (enhanced)

```ts
interface ResumeSubsystemHealth {
  healthy: boolean;
  dependencies: {
    queue: boolean;
    dispatcher: boolean;
    eventBus: boolean;
  };
  checkedAt: Date;
}
```

---

## 9. Implementation Files

### Files to Create

| File | Purpose |
|------|---------|
| `src/__tests__/benchmarks/resumePipeline.benchmark.ts` | End-to-end and per-stage latency benchmarks |
| `src/middleware/structuredLogging.ts` | Shared structured-logging middleware for resume services |
| `src/utils/resumeHealthCheck.ts` | Health-check utility for resume subsystem |
| `docs/runbooks/resume-pipeline.md` | Operational runbook for monitoring and incident response |

### Files to Modify

| File | Changes |
|------|---------|
| `src/services/resume/dicIntegration.service.ts` | Add structured log emission |
| `src/services/resume/canonicalWrite.service.ts` | Add structured log emission + dedup optimization hooks |
| `src/shared/services/knowledgeDispatcher.service.ts` | Add stage-entry / stage-exit logs |
| `src/models/ResumeParseResult.ts` | No schema changes |
| `PROJECT-INDEX.md` | Update test baselines and technical debt status |
| `RESUME-PARSER-ARCHITECTURE.md` | No changes (v1.7 remains current) |

---

## 10. Testing Strategy

### Unit Tests (10+)

| Test | Target |
|------|--------|
| Benchmark runner measures stage latency | Timing assertions per stage |
| Benchmark log-overhead measurement | Logging adds < 5% to end-to-end latency |
| Structured log emission | Correct keys and JSON shape |
| Production log format validation | Valid JSON with required keys in production mode |
| PII scrubbing | `email` and `phone` redacted or absent in production logs |
| Health check: all dependencies up | Returns healthy |
| Health check: queue down | Returns unhealthy with queue flagged |
| Health check: dispatcher down | Returns unhealthy with dispatcher flagged |
| Health check: eventBus down | Returns unhealthy with eventBus flagged |
| Dedup optimization: indexed email lookup | Reuses existing Person |
| Dedup optimization: fallback on index miss | Still deduplicates correctly |

### Integration Tests (4+)

| Test | Target |
|------|--------|
| End-to-end benchmark < 5s | Full Stage 0 → 6 flow within SLA |
| Concurrent canonical writes | Idempotency holds under 10 parallel jobs |
| Multi-tenant isolation under load | No cross-tenant data leakage |
| Graceful DIC unavailability | Pipeline completes without Stage 5 blocking |

### Regression Tests

- Full existing suite must remain green (514 tests)
- No changes to stage output contracts

---

## 11. Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Benchmark flakiness in CI | Medium | Medium | Deterministic fixtures; retry policy |
| Index migration on live DB | Low | High | Deploy index build during low-traffic window; backward compatible |
| Over-logging PII | Low | High | Production log scrubbing rules; exclude raw emails/phones |
| SLA not met in production | Medium | High | Profiling before/after; staged rollout |
| Dedup optimization changes behavior | Low | High | Exact formula preservation; integration test for all 4 signals |

---

## 12. Acceptance Criteria

1. End-to-end resume pipeline benchmark completes within `< 5s` on benchmark hardware (see §5.6)
2. All resume services emit structured logs with `processingId`, `organizationId`, `stage`, and `durationMs`
3. Structured-logging overhead is measured and does not exceed 5% of end-to-end latency
4. Production log format produces valid JSON with required keys; PII (`email`, `phone`) is redacted or absent
5. Health-check endpoint returns 503 for each individual dependency failure (queue, dispatcher, eventBus)
6. Person deduplication query uses indexed lookup path; fallback preserves exact Architecture v1.7 behavior
7. Concurrent write integration test passes (10 parallel jobs, 0 data corruption)
8. Full regression suite passes (514/514)
9. No new npm dependencies added
10. Architecture v1.7 unchanged
11. No breaking changes to event contracts
12. Documentation updated

---

## 13. Definition of Done

- [ ] Benchmark suite created and passing
- [ ] Benchmark log-overhead measured and < 5%
- [ ] Structured logging added to all resume services
- [ ] Production log format and PII scrubbing validated
- [ ] Person dedup indexes deployed and verified
- [ ] Health-check utility implemented with all dependency failures covered
- [ ] Concurrent write integration test passes
- [ ] Full regression suite passes (514/514)
- [ ] Operational runbook written
- [ ] No new dependencies
- [ ] Architecture v1.7 unchanged
- [ ] Code review passed

---

## 14. Migration Impact

- New MongoDB indexes added to `Person` and `AcademicRecord` — backward compatible, no downtime
- Logging changes are additive; existing log consumers unaffected
- Health-check endpoint is additive; existing `/health` route extended
- No breaking API or schema changes

---

## 15. Rollback Strategy

If performance or observability changes cause issues:

1. Revert dispatcher log emission via feature flag or commit revert
2. Drop new indexes if query plan regresses:
   ```js
   // Creation
   db.Person.createIndex({ organizationId: 1, primaryEmail: 1 }, { name: 'person_org_email_1' });
   db.AcademicRecord.createIndex({ organizationId: 1, subjectName: 1 }, { name: 'academic_org_subject_1' });

   // Rollback
   db.Person.dropIndex('person_org_email_1');
   db.AcademicRecord.dropIndex('academic_org_subject_1');
   ```
3. Benchmarks are test-only; no runtime impact
4. Rollback target: Sprint 7 state (`v0.7.0`)

---

## 16. Sprint Boundaries

- **Independent of Sprint 9 and 10** — DIC Review UI and Analytics can be built on top of this baseline without coupling
- **No user-facing behavior changes** — this sprint is purely operational
- **No architecture version bump required** — v1.7 remains current

---

## 17. Milestones

| Milestone | Deliverable | Acceptance |
|-----------|-------------|------------|
| M1 | Benchmark suite + baseline report | `< 5s` end-to-end on benchmark hardware (§5.6); log-overhead < 5% |
| M2 | Structured logging rollout | All stages emit valid JSON logs in prod; PII scrubbed |
| M3 | Dedup optimization + indexes | Query plan uses index; formula unchanged |
| M4 | Production readiness validation | Health checks for all dependencies, concurrency tests, regression suite green |

---

## 18. Estimated Effort

| Workstream | Effort |
|------------|--------|
| Benchmarking | 0.5 day |
| Structured logging | 0.5 day |
| Dedup optimization | 0.5 day |
| Health checks + validation | 0.5 day |
| Documentation | 0.25 day |
| **Total** | **~2.25 days** |

---

*Sprint 8 plan frozen and immutable on 2026-07-25. No changes permitted without formal change request.*
