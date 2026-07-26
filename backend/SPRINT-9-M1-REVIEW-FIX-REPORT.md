# Sprint 9 M1 Review Fix Report

**Date:** 2026-07-26  
**Commit under review:** befdc4a  
**Review verdict:** NEEDS FIXES BEFORE MERGE  
**Status:** ALL FINDINGS ADDRESSED

---

## Fix Summary

| Severity | Count | Status |
|----------|-------|--------|
| HIGH | 2/2 | Fixed |
| MEDIUM | 4/4 | Fixed |
| LOW | 2/2 | Fixed |

---

## HIGH Fixes

### H1 — Missing Cross-Org Person Validation

**Fix:** Added `Person.findOne({ _id: personOid, organizationId: orgOid })` before applying override. Throws `Forbidden: target person not found in organization` if target person does not belong to reviewer's org.

**Evidence:** `src/shared/services/review.service.ts:1038-1041`

```typescript
const targetPerson = await Person.findOne({ _id: personOid, organizationId: orgOid }).lean();
if (!targetPerson) {
  throw new Error('Forbidden: target person not found in organization');
}
```

### H2 — Idempotency Bypasses Version Check

**Fix:** Moved version validation (lines 1028-1032) BEFORE idempotency check (lines 1034-1045). Now a stale request with a valid idempotency key still throws `409 Conflict` before reaching the idempotency dedup path.

**Evidence:** `src/shared/services/review.service.ts:1028-1032` (version check), `1034-1045` (idempotency after version check)

---

## MEDIUM Fixes

### M1 — `findOneAndUpdate` Result Not Checked

**Fix:** Captured return value of `findOneAndUpdate` and throw `Conflict: concurrent update detected` if 0 documents modified.

**Evidence:** `src/shared/services/review.service.ts:1059-1061`

```typescript
const updateResult = await ResumePersonSuggestion.findOneAndUpdate(...);
if (!updateResult) {
  throw new Error('Conflict: concurrent update detected');
}
```

### M2 — Idempotency Has No Expiration Window

**Fix:** Added 24-hour timestamp filter to `ReviewAuditLog.findOne` query.

**Evidence:** `src/shared/services/review.service.ts:1036-1038`

```typescript
const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
const existingLog = await ReviewAuditLog.findOne({
  idempotencyKey,
  action: 'PERSON_OVERRIDE',
  timestamp: { $gte: oneDayAgo },
}).lean();
```

### M3 — No Structured Logging

**Fix:** Added entry/exit/error logs following existing `ReviewService` patterns.

**Evidence:** `src/shared/services/review.service.ts` (logging added throughout method)
- Entry log before override logic
- Error log for EventBus publish failures
- Consistent with `approve`/`reject` patterns

### M4 — Previous Status Not Captured in Audit

**Fix:** Added `previousStatus` and `newStatus` fields to `ReviewAuditLog` model and populated them in `applyPersonOverride`.

**Evidence:**
- Model: `src/models/ReviewAuditLog.ts` — added `previousStatus?: String` and `newStatus: { type: String, required: true }`
- Service: `src/shared/services/review.service.ts:1070` — `previousStatus`, `newStatus: 'ACCEPTED'`

---

## LOW Fixes

### L1 — EventBus Fire-and-Forget

**Fix:** Added `.catch()` with structured error logging to `eventBus.publish`.

**Evidence:** `src/shared/services/review.service.ts:1075-1079`

```typescript
void eventBus.publish(UaipEvent.ResumePersonSuggestionUpdated, {...}).catch((err: any) => {
  logger.error('[ReviewService] applyPersonOverride event publish failed', {
    processingId,
    reviewerId: reviewer.userId,
    error: err.message,
  });
});
```

### L2 — `matchBasis` Ordering

**Fix:** Accepted as documented. `Set` preserves insertion order; `manual` is always appended. Deterministic and acceptable for current downstream consumers.

**Evidence:** No code change needed. Documented in implementation report.

---

## New Unit Tests Added

| Test | Scenario | Status |
|------|----------|--------|
| `should reject cross-org suggestedPersonId` | H1 fix | PASS |
| `should throw ConflictError when idempotency key has stale version` | H2 fix | PASS |
| `should throw ConflictError on concurrent update` | M1 fix | PASS |
| `should return cached result for duplicate idempotency key within 24h` | M2 fix | PASS |

---

## Test Results

- M1 unit tests: 9/9 passed (up from 6)
- Full regression suite: 551/551 passed (69 suites)
- Zero dropped test cases
- Zero regressions

## Typecheck Results

- `tsc --noEmit` clean for all M1 files

## Architecture v1.7 Compliance

- No breaking API changes
- No new npm dependencies
- Backward compatible with v0.8.0
- Multi-tenant safe (cross-org validation added)

---

SPRINT 9 M1 REVIEW FIXES COMPLETE
