# Sprint 9 M1 Re-Review Evidence

## 1. Evidence Sources

### Documents Reviewed
- `backend/SPRINT-9-M1-CODE-REVIEW.md` — Original 8 findings (2 HIGH, 4 MEDIUM, 2 LOW)
- `backend/SPRINT-9-M1-CODE-REVIEW-EVIDENCE.md` — Line-by-line review evidence
- `backend/SPRINT-9-M1-REVIEW-FIX-REPORT.md` — Fix summary
- `backend/SPRINT-9-M1-REVIEW-FIX-EVIDENCE.md` — Fix evidence
- `backend/SPRINT-9-PLAN-FREEZE.md` — M1 acceptance criteria

### Code Reviewed
- `backend/src/shared/services/review.service.ts` — lines 1004-1113 (`applyPersonOverride`)
- `backend/src/models/ReviewAuditLog.ts` — full file
- `backend/src/__tests__/review.service.test.ts` — full file (9 tests)

---

## 2. Finding-by-Finding Verification

### HIGH

**H1 — Cross-Org Person Validation**
- Code: `review.service.ts:1022-1025`
  ```typescript
  const targetPerson = await Person.findOne({ _id: personOid, organizationId: orgOid }).lean();
  if (!targetPerson) {
    throw new Error('Forbidden: target person not found in organization');
  }
  ```
- Test: `review.service.test.ts:137-163` — `should reject cross-org suggestedPersonId`
- **VERDICT: RESOLVED**

**H2 — Idempotency Bypass**
- Code: `review.service.ts:1016-1018` (version check) precedes `1027-1044` (idempotency)
  ```typescript
  if (expectedVersion !== currentVersion) {
    throw new Error('Conflict: version mismatch...');
  }
  // idempotency AFTER version check
  ```
- Test: `review.service.test.ts:237-261` — `should throw ConflictError when idempotency key has stale version`
- **VERDICT: RESOLVED**

### MEDIUM

**M1 — findOneAndUpdate Result**
- Code: `review.service.ts:1052-1066`
  ```typescript
  const updateResult = await ResumePersonSuggestion.findOneAndUpdate(...);
  if (!updateResult) {
    throw new Error('Conflict: concurrent update detected');
  }
  ```
- Test: `review.service.test.ts:263-290`
- **VERDICT: RESOLVED**

**M2 — 24h Idempotency Expiry**
- Code: `review.service.ts:1028-1033`
  ```typescript
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const existingLog = await ReviewAuditLog.findOne({
    idempotencyKey,
    action: 'PERSON_OVERRIDE',
    timestamp: { $gte: oneDayAgo },
  }).lean();
  ```
- Test: `review.service.test.ts:190-235`
- **VERDICT: RESOLVED**

**M3 — Structured Logging**
- Code: `review.service.ts` — logger calls added throughout method
- Pattern matches existing `approve`/`reject`/`rollback` methods
- **VERDICT: RESOLVED**

**M4 — Status in Audit**
- Model: `ReviewAuditLog.ts:15-16,33-34`
  ```typescript
  previousStatus?: string;
  newStatus: string;
  ```
- Service: `review.service.ts:1049,1083-1084`
  ```typescript
  const previousStatus = (suggestion as any).status;
  ...
  previousStatus,
  newStatus: 'ACCEPTED',
  ```
- Test: `review.service.test.ts:105-120` — verifies `previousStatus: 'PENDING'` and `newStatus: 'ACCEPTED'`
- **VERDICT: RESOLVED**

### LOW

**L1 — EventBus Failure Logging**
- Code: `review.service.ts:1100-1106`
  ```typescript
  void eventBus.publish(...).catch((err: any) => {
    logger.error('[ReviewService] applyPersonOverride event publish failed', {
      processingId,
      reviewerId: reviewer.userId,
      error: err.message,
    });
  });
  ```
- **VERDICT: RESOLVED**

**L2 — matchBasis Ordering**
- Code: `review.service.ts:1048`
  ```typescript
  const newMatchBasis = Array.from(new Set([...previousMatchBasis, 'manual']));
  ```
- Decision: ACCEPTED WITH DOCUMENTED RATIONALE — deterministic, no downstream consumer depends on ordering
- **VERDICT: DOCUMENTED**

---

## 3. Regression Verification

| Command | Result |
|---------|--------|
| `npx jest --runInBand --testPathPattern="review.service.test.ts"` | 9/9 passed |
| `npx jest --runInBand` | 551/551 passed, 69 suites |
| `npx tsc --noEmit` | Clean for M1 files |

---

## 4. Architecture v1.7 Compliance (Post-Fix)

| Requirement | Status |
|-------------|--------|
| No breaking API changes | PASS |
| MongoDB indexes compatible | PASS |
| Event contracts extend `UaipEvents` | PASS |
| Auth + org isolation | PASS |
| Backward compatible with v0.8.0 | PASS |
| Multi-tenant safe | PASS |
| No new npm dependencies | PASS |

---

SPRINT 9 M1 RE-REVIEW EVIDENCE COMPLETE
