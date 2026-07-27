# Sprint 8 Plan Fix Report

## Fixes Applied

### Finding 1 (MEDIUM) — Test Strategy Gaps

**File:** `SPRINT-8-PLAN.md`

**Sections updated:** §5.1, §10, §12, §13, §17

**Changes:**
- Added benchmark log-overhead measurement to §5.1 Performance Benchmarking
- Expanded Unit Tests from 6+ to 10+ with new tests:
  - Benchmark log-overhead measurement (< 5% target)
  - Production log format validation (valid JSON with required keys)
  - PII scrubbing verification (`email` and `phone` redacted or absent in production logs)
  - Health-check failure tests for `dispatcher` and `eventBus` (in addition to `queue`)
- Added acceptance criteria #3 (log-overhead), #4 (production log format + PII), #5 (health-check 503 for all dependencies)
- Added Definition of Done items for log-overhead, production log format, and PII scrubbing
- Updated Milestone M1 and M2 to include new acceptance criteria

### Finding 2 (LOW) — Index Rollback Strategy

**File:** `SPRINT-8-PLAN.md`

**Section updated:** §15 Rollback Strategy

**Changes:**
- Replaced placeholder `db.Person.dropIndex(...)` with exact index names
- Documented creation commands:
  ```js
  db.Person.createIndex({ organizationId: 1, primaryEmail: 1 }, { name: 'person_org_email_1' });
  db.AcademicRecord.createIndex({ organizationId: 1, subjectName: 1 }, { name: 'academic_org_subject_1' });
  ```
- Documented rollback commands:
  ```js
  db.Person.dropIndex('person_org_email_1');
  db.AcademicRecord.dropIndex('academic_org_subject_1');
  ```

### Finding 3 (LOW) — Benchmark Hardware Profile

**File:** `SPRINT-8-PLAN.md`

**Section added:** §5.6 Benchmark Hardware Profile

**Changes:**
- Added new subsection defining fixed hardware profile:
  - CPU: 2 vCPU
  - Memory: 4 GB RAM
  - MongoDB: single-node replica set on localhost
  - Network: loopback (no network latency)
  - Cold start: excluded from measurement
- Updated acceptance criterion #1 to reference §5.6
- Updated Milestone M1 to reference hardware profile and log-overhead target

---

## Summary

| Finding | Severity | Status | Section |
|---------|----------|--------|---------|
| 1 | MEDIUM | FIXED | §5.1, §10, §12, §13, §17 |
| 2 | LOW | FIXED | §15 |
| 3 | LOW | FIXED | §5.6, §12, §17 |

All three findings incorporated into `SPRINT-8-PLAN.md`. No scope changes, no architecture version bump, no new features added.
