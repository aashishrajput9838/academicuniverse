# Sprint 8 Plan Fix Evidence

## 1. Finding 1 (MEDIUM) — Test Strategy Gaps

### File: `backend/SPRINT-8-PLAN.md`

### §5.1 Performance Benchmarking — Updated

**Before:**
```md
- Capture memory and query-count baselines
```

**After:**
```md
- Capture memory and query-count baselines
- Measure structured-logging overhead as part of benchmark
```

### §10 Testing Strategy — Expanded

**Before:** 6 unit tests
**After:** 10 unit tests

New tests added:
| Test | Target |
|------|--------|
| Benchmark log-overhead measurement | Logging adds < 5% to end-to-end latency |
| Production log format validation | Valid JSON with required keys in production mode |
| PII scrubbing | `email` and `phone` redacted or absent in production logs |
| Health check: dispatcher down | Returns unhealthy with dispatcher flagged |
| Health check: eventBus down | Returns unhealthy with eventBus flagged |

### §12 Acceptance Criteria — Expanded

**Before:** 10 criteria
**After:** 12 criteria

New criteria:
3. Structured-logging overhead is measured and does not exceed 5% of end-to-end latency
4. Production log format produces valid JSON with required keys; PII (`email`, `phone`) is redacted or absent
5. Health-check endpoint returns 503 for each individual dependency failure (queue, dispatcher, eventBus)

### §13 Definition of Done — Updated

New items:
- [ ] Benchmark log-overhead measured and < 5%
- [ ] Production log format and PII scrubbing validated
- [ ] Health-check utility implemented with all dependency failures covered

### §17 Milestones — Updated

| Milestone | Deliverable | Acceptance |
|-----------|-------------|------------|
| M1 | Benchmark suite + baseline report | `< 5s` end-to-end on benchmark hardware (§5.6); log-overhead < 5% |
| M2 | Structured logging rollout | All stages emit valid JSON logs in prod; PII scrubbed |

---

## 2. Finding 2 (LOW) — Index Rollback Strategy

### File: `backend/SPRINT-8-PLAN.md`

### §15 Rollback Strategy — Documented

**Before:**
```md
2. Drop new indexes if query plan regresses: `db.Person.dropIndex(...)`
```

**After:**
```md
2. Drop new indexes if query plan regresses:
   ```js
   // Creation
   db.Person.createIndex({ organizationId: 1, primaryEmail: 1 }, { name: 'person_org_email_1' });
   db.AcademicRecord.createIndex({ organizationId: 1, subjectName: 1 }, { name: 'academic_org_subject_1' });

   // Rollback
   db.Person.dropIndex('person_org_email_1');
   db.AcademicRecord.dropIndex('academic_org_subject_1');
   ```
```

---

## 3. Finding 3 (LOW) — Benchmark Hardware Profile

### File: `backend/SPRINT-8-PLAN.md`

### §5.6 Benchmark Hardware Profile — Added

**New subsection:**

```md
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
```

### §12 Acceptance Criteria — Updated

**Before:**
```md
1. End-to-end resume pipeline benchmark completes within `< 5s` on benchmark hardware
```

**After:**
```md
1. End-to-end resume pipeline benchmark completes within `< 5s` on benchmark hardware (see §5.6)
```

### §17 Milestones — Updated

**Before:**
```md
M1 | Benchmark suite + baseline report | `< 5s` end-to-end on benchmark HW |
```

**After:**
```md
M1 | Benchmark suite + baseline report | `< 5s` end-to-end on benchmark hardware (§5.6); log-overhead < 5% |
```

---

## 4. Verification

All three findings from `SPRINT-8-PLAN-REVIEW.md` have been addressed:

| # | Severity | Finding | Fix Applied |
|---|----------|---------|-------------|
| 1 | MEDIUM | Test strategy gaps | Expanded unit tests (6→10), added integration tests for log overhead, PII, and all health-check failures |
| 2 | LOW | Index rollback strategy | Exact index names and MongoDB commands documented |
| 3 | LOW | Benchmark hardware profile | New §5.6 with CPU, RAM, MongoDB, network, and cold-start policy |

No scope changes. No architecture version bump. No new features added.
