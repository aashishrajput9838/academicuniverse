# Sprint 9 M1 Code Review

**Reviewer:** Senior Staff Engineer  
**Date:** 2026-07-26  
**Commit:** `befdc4a`  
**Milestone:** M1 — DIC Reviewer Override Hooks  
**Verdict:** NEEDS FIXES BEFORE MERGE

---

## Executive Summary

M1 implementation introduces reviewer override capability correctly, with optimistic locking, idempotency, audit logging, and event publishing. However, 2 HIGH findings and 4 MEDIUM findings must be resolved before merge. The most critical issue is the lack of cross-org validation for `suggestedPersonId`, which creates a multi-tenant data isolation breach. The idempotency logic also bypasses optimistic version checking, creating a consistency gap.

---

## Findings

### HIGH

| ID | Finding | File | Line | Impact |
|----|---------|------|------|--------|
| H1 | No validation that `suggestedPersonId` belongs to the same organization as the reviewer | `review.service.ts` | 1034-1035 | Cross-tenant data access; reviewer can override to a person from another org |
| H2 | Idempotency check bypasses optimistic version check | `review.service.ts` | 1014-1031 | Stale request with valid idempotency key can return 200 instead of 409 |

### MEDIUM

| ID | Finding | File | Line | Impact |
|----|---------|------|------|--------|
| M1 | `findOneAndUpdate` return value not checked | `review.service.ts` | 1042-1052 | Concurrent stale update silently no-ops; caller receives misleading success |
| M2 | Idempotency has no expiration window | `review.service.ts` | 1015 | Plan specifies 24h dedup; implementation is infinite |
| M3 | No structured logging in `applyPersonOverride` | `review.service.ts` | 1004-1090 | Inconsistent with rest of `ReviewService`; production debugging gap |
| M4 | `status` forced to `ACCEPTED` without recording previous status in audit | `review.service.ts` | 1048, 1067 | Audit trail loses state transition context |

### LOW

| ID | Finding | File | Line | Impact |
|----|---------|------|------|--------|
| L1 | EventBus publish is fire-and-forget with no failure logging | `review.service.ts` | 1075 | Consistent with codebase pattern, but event failures are invisible |
| L2 | `matchBasis` ordering uses `Set` — `manual` always appended at end | `review.service.ts` | 1039 | Deterministic but may affect downstream consumers relying on basis order |

---

## Detailed Findings & Recommendations

### H1 — Missing Cross-Org Person Validation

**Observation:** `applyPersonOverride` accepts any `suggestedPersonId` and converts it to ObjectId without verifying the target `Person` record belongs to the reviewer's organization.

**Why it matters:** This is a multi-tenant isolation breach. A reviewer in Org A could override a resume's person match to a person in Org B, creating cross-tenant data leakage.

**Recommendation:** Before applying the override, query the target `Person`:
```typescript
const targetPerson = await Person.findOne({ _id: personOid, organizationId: orgOid }).lean();
if (!targetPerson) {
  throw new Error('Forbidden: target person not found in organization');
}
```

### H2 — Idempotency Bypasses Version Check

**Observation:** The idempotency check (lines 1014-1026) executes before the version check (lines 1028-1032). If a request carries a valid idempotency key but an stale `expectedVersion`, it returns the cached current result instead of throwing `409 Conflict`.

**Why it matters:** A replayed request with an old idempotency key and mismatched version bypasses optimistic locking. The caller gets a 200 with the current state, masking the version conflict.

**Recommendation:** Move the version check before the idempotency check, OR validate that the cached audit log entry's `previousVersion` matches `expectedVersion`. Simpler and safer:
```typescript
// Check version FIRST
if (expectedVersion !== currentVersion) {
  throw new Error('Conflict: version mismatch...');
}

// THEN check idempotency
if (idempotencyKey) {
  // Only dedup if the original log matches the same version
  const existingLog = await ReviewAuditLog.findOne({ 
    idempotencyKey, 
    action: 'PERSON_OVERRIDE',
    previousVersion: expectedVersion 
  }).lean();
  ...
}
```

### M1 — `findOneAndUpdate` Result Not Checked

**Observation:** The method does not capture or validate the result of `findOneAndUpdate({ processingId, version: currentVersion }, ...)`. If two concurrent requests both read `version: 1`, the second `findOneAndUpdate` matches 0 documents and returns `null`, but the code proceeds as if the update succeeded.

**Why it matters:** The caller receives a success response even though their override was silently ignored. This violates the idempotency and consistency guarantees.

**Recommendation:** Capture the result and verify it modified a document:
```typescript
const updateResult = await ResumePersonSuggestion.findOneAndUpdate(
  { processingId, version: currentVersion },
  { $set: { ... } }
);
if (!updateResult) {
  throw new Error('Conflict: concurrent update detected');
}
```

### M2 — Idempotency Has No Expiration Window

**Observation:** The idempotency query has no time constraint. An idempotency key from a previous override months ago would still match.

**Why it matters:** Plan specifies "24h dedup window." Without time bounds, stale keys cause unintended caching behavior.

**Recommendation:** Add a time filter:
```typescript
const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
const existingLog = await ReviewAuditLog.findOne({
  idempotencyKey,
  action: 'PERSON_OVERRIDE',
  timestamp: { $gte: oneDayAgo }
}).lean();
```

### M3 — No Structured Logging

**Observation:** `applyPersonOverride` contains zero `logger` calls. Other `ReviewService` methods (`approve`, `reject`, `rollback`) all emit structured logs.

**Why it matters:** Without logs, production debugging of overrides is impossible. Audit trail exists in DB but not in real-time log streams.

**Recommendation:** Add entry/exit/error logs:
```typescript
logger.info('[ReviewService] applyPersonOverride START', { processingId, reviewerId: reviewer.userId });
...
logger.info('[ReviewService] applyPersonOverride SUCCESS', { processingId, newVersion });
```

### M4 — Previous Status Not Captured in Audit

**Observation:** The method forces `status: 'ACCEPTED'` but does not record the previous `status` in `ReviewAuditLog`.

**Why it matters:** If a suggestion was previously `REJECTED` and is being re-accepted, the audit trail loses this context.

**Recommendation:** Capture previous status in the audit log:
```typescript
const previousStatus = (suggestion as any).status;
...
await ReviewAuditLog.create({
  ...
  previousStatus,
  newStatus: 'ACCEPTED',
  ...
});
```

---

## Architecture v1.7 Compliance

| Requirement | Status |
|-------------|--------|
| No breaking API changes | PASS |
| MongoDB indexes compatible | PASS |
| Event contracts extend `UaipEvents` | PASS |
| Auth + org isolation | PARTIAL — missing Person org check (H1) |
| Backward compatible with v0.8.0 | PASS |
| Multi-tenant safe | FAIL — H1 cross-org vulnerability |
| No new npm dependencies | PASS |

---

## Test Quality Assessment

| Test | Coverage | Gap |
|------|----------|-----|
| Happy path override | Good | Missing cross-org person validation test |
| Version mismatch | Good | Missing concurrent update test |
| Idempotency dedup | Partial | No version-mismatch + idempotency combination test |
| Suggestion not found | Good | — |
| Upload missing/deleted | Good | — |
| Cross-tenant upload | Good | — |

**Missing tests:**
- Cross-org `suggestedPersonId` should be rejected
- `findOneAndUpdate` modifying 0 documents should throw
- Idempotency key with stale version should throw 409
- `status` re-acceptance from `REJECTED` state

---

## Production Readiness

| Check | Status |
|-------|--------|
| Error messages sanitized | PASS |
| No PII in logs | PASS (no logs yet) |
| Atomic update | PASS (`findOneAndUpdate` with version filter) |
| Idempotency | PARTIAL — infinite window, no version check |
| Audit trail | PARTIAL — missing status transition |
| Observability | FAIL — no structured logs |

---

SPRINT 9 M1 CODE REVIEW COMPLETE

VERDICT: NEEDS FIXES BEFORE MERGE

READY FOR REVIEW FIXES
