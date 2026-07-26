# Sprint 9 M1 Code Review Evidence

## 1. Evidence Sources

### Files Reviewed
- `backend/SPRINT-9-PLAN-FREEZE.md` — M1 acceptance criteria
- `backend/SPRINT-9-M1-IMPLEMENTATION-REPORT.md` — Implementation summary
- `backend/SPRINT-9-M1-IMPLEMENTATION-EVIDENCE.md` — Implementation evidence
- `backend/src/shared/services/review.service.ts` — M1 implementation (lines 1004-1091)
- `backend/src/models/ResumePersonSuggestion.ts` — Schema with new version field
- `backend/src/models/ReviewAuditLog.ts` — New audit log collection
- `backend/src/events/UaipEvents.ts` — New event and payload fields
- `backend/src/__tests__/review.service.test.ts` — M1 unit tests

### Review Methodology
1. Line-by-line inspection of `applyPersonOverride` method
2. Schema review for new fields and indexes
3. Event contract review for consistency with existing patterns
4. Test coverage gap analysis
5. Cross-reference against plan acceptance criteria
6. Architecture v1.7 compliance check

---

## 2. Finding Evidence

### H1 — Missing Cross-Org Person Validation

**Evidence:**
- `review.service.ts:1034-1035`:
  ```typescript
  const orgOid = toObjectId(organizationId);
  const personOid = toObjectId(suggestedPersonId);
  ```
  No query to verify `Person` exists in `orgOid`.

- `review.service.ts:1046`:
  ```typescript
  suggestedPersonId: personOid,
  ```
  Direct assignment to suggestion without org-boundary check.

- Existing pattern in `review.service.ts:415` (`approve` method):
  ```typescript
  const personId = await resolveOrCreatePerson(reviewer.userId, reviewer.organizationId, session);
  ```
  `approve` resolves/creates person within org context. `applyPersonOverride` does not.

**Fix Evidence:**
- Add before line 1034:
  ```typescript
  const targetPerson = await Person.findOne({ _id: personOid, organizationId: orgOid }).lean();
  if (!targetPerson) {
    throw new Error('Forbidden: target person not found in organization');
  }
  ```
- Requires import: `import { Person } from '../../models/Person';` (already imported at line 24)

---

### H2 — Idempotency Bypasses Version Check

**Evidence:**
- `review.service.ts:1014-1026` (idempotency check) executes before `1028-1032` (version check).
- If a request carries a valid idempotency key but stale `expectedVersion`, it returns cached current state at line 1021-1024 without throwing 409.

- Plan requirement: `SPRINT-9-PLAN-FREEZE.md` section Final Acceptance Criteria #6:
  > "Stale version returns 409 Conflict"

- Plan requirement: `SPRINT-9-PLAN-FREEZE.md` section Error Handling:
  > "Duplicate idempotency key | Return 200 with cached result"

These requirements conflict when both apply. The current implementation prioritizes idempotency over version safety.

**Fix Evidence:**
- Move version check before idempotency check, OR add `previousVersion: expectedVersion` filter to idempotency query.
- Simpler fix: swap order:
  ```typescript
  const currentVersion = (suggestion as any).version ?? 1;
  if (expectedVersion !== currentVersion) {
    throw new Error('Conflict: version mismatch...');
  }
  // idempotency check after version check
  ```

---

### M1 — `findOneAndUpdate` Result Not Checked

**Evidence:**
- `review.service.ts:1042-1052`:
  ```typescript
  await ResumePersonSuggestion.findOneAndUpdate(
    { processingId, version: currentVersion },
    { $set: { ... } }
  );
  ```
  Return value is not captured.

- `review.service.ts:1054`:
  ```typescript
  const updatedSuggestion = await ResumePersonSuggestion.findOne({ processingId }).lean();
  ```
  This finds the document regardless of whether the update modified 0 or 1 docs.

- Concurrent scenario:
  - Request A reads version 1, updates to version 2
  - Request B reads version 1 (before A commits), attempts update with `{ processingId, version: 1 }` → matches 0 docs
  - Request B then reads current doc (version 2, from Request A) and returns success

- Plan requirement: `SPRINT-9-PLAN-FREEZE.md` section Final Acceptance Criteria #6:
  > "Concurrent override with stale version returns 409 Conflict"

But this only covers version mismatch at read time. It doesn't cover the race window between read and update.

**Fix Evidence:**
- Capture and check result:
  ```typescript
  const updateResult = await ResumePersonSuggestion.findOneAndUpdate(
    { processingId, version: currentVersion },
    { $set: { ... } }
  );
  if (!updateResult) {
    throw new Error('Conflict: concurrent update detected');
  }
  ```

---

### M2 — Idempotency Has No Expiration Window

**Evidence:**
- `review.service.ts:1015`:
  ```typescript
  const existingLog = await ReviewAuditLog.findOne({ idempotencyKey, action: 'PERSON_OVERRIDE' }).lean();
  ```
  No `timestamp` filter.

- Plan requirement: `SPRINT-9-PLAN-FREEZE.md` section Scope M2:
  > "Duplicate `override-person` with same `Idempotency-Key` returns 200 with cached result within 24h"

**Fix Evidence:**
- Add time filter:
  ```typescript
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const existingLog = await ReviewAuditLog.findOne({
    idempotencyKey,
    action: 'PERSON_OVERRIDE',
    timestamp: { $gte: oneDayAgo }
  }).lean();
  ```

---

### M3 — No Structured Logging

**Evidence:**
- `review.service.ts:1004-1091` — zero `logger` calls in `applyPersonOverride`.
- Compare with `review.service.ts:291-327` (`saveDraft`):
  ```typescript
  await ReviewHistory.create({...});
  void eventBus.publish(UaipEvent.CandidateDraftSaved, {...});
  return { version: newVersion };
  ```
  `saveDraft` has no explicit logger either, but `approve` at line 388 has:
  ```typescript
  logger.info('[ReviewService] MongoDB transaction mode for approve');
  ```

- Pattern in codebase: `dicIntegration.service.ts`, `canonicalWrite.service.ts` all use `logger.info/error`.

**Fix Evidence:**
- Add at start of method:
  ```typescript
  logger.info('[ReviewService] applyPersonOverride START', { processingId, reviewerId: reviewer.userId });
  ```
- Add after successful update:
  ```typescript
  logger.info('[ReviewService] applyPersonOverride SUCCESS', { processingId, version: newVersion });
  ```

---

### M4 — Previous Status Not Captured in Audit

**Evidence:**
- `review.service.ts:1048`:
  ```typescript
  status: 'ACCEPTED',
  ```
  Status is forced to ACCEPTED.

- `review.service.ts:1067`:
  ```typescript
  previousMatchBasis,
  newMatchBasis,
  previousVersion: currentVersion,
  newVersion,
  ```
  Audit log captures matchBasis and version, but NOT previous/new status.

- Plan requirement: `SPRINT-9-PLAN-FREEZE.md` section Final Acceptance Criteria #1:
  > "`ResumePersonSuggestion.matchBasis` records `manual` on reviewer override"

This is satisfied, but the broader state transition is not captured.

**Fix Evidence:**
- Add to audit log create:
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

### L1 — EventBus Fire-and-Forget

**Evidence:**
- `review.service.ts:1075`:
  ```typescript
  void eventBus.publish(UaipEvent.ResumePersonSuggestionUpdated, {...});
  ```
  Consistent with existing patterns (`saveDraft:317`, `approve`, etc.), but failures are silently dropped.

- No try/catch or `.catch()` on publish.

**Recommendation:** Add `.catch()` with logger for production visibility:
```typescript
void eventBus.publish(...).catch(err => 
  logger.error('[ReviewService] applyPersonOverride event publish failed', { error: err.message, processingId })
);
```

---

### L2 — `matchBasis` Ordering via `Set`

**Evidence:**
- `review.service.ts:1039`:
  ```typescript
  const newMatchBasis = Array.from(new Set([...previousMatchBasis, 'manual']));
  ```
  `Set` preserves insertion order; `manual` is always appended.

- Deterministic and acceptable for current needs. No downstream consumer depends on basis ordering.

**Recommendation:** No fix required. Document as expected behavior.

---

## 3. Test Gap Analysis

| Missing Test | Risk | Priority |
|--------------|------|----------|
| Cross-org `suggestedPersonId` rejected | H1 bypass | HIGH |
| Concurrent update (findOneAndUpdate modifies 0 docs) | M1 silent failure | MEDIUM |
| Idempotency key + stale version returns 409 | H2 bypass | HIGH |
| Idempotency key expired after 24h | M2 plan deviation | MEDIUM |
| Status re-acceptance from REJECTED | M4 audit gap | MEDIUM |

---

## 4. Plan Compliance Matrix

| Criterion | Implementation | Gap |
|-----------|---------------|-----|
| matchBasis records manual | PASS | — |
| ResumePersonSuggestionUpdated event | PASS | — |
| ReviewAuditLog appended | PASS | Missing status fields |
| version field for optimistic locking | PASS | Missing result check |
| applyPersonOverride in reviewService | PASS | — |
| Idempotency | PARTIAL | No expiration, bypasses version |
| Cross-tenant safety | FAIL | No Person org validation |

---

SPRINT 9 M1 CODE REVIEW EVIDENCE COMPLETE
