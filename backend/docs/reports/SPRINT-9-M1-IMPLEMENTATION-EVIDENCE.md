# Sprint 9 M1 Implementation Evidence

## 1. Evidence Sources

### Source Files Inspected
- `backend/SPRINT-9-PLAN-FREEZE.md` — M1 acceptance criteria
- `backend/SPRINT-9-PLAN-FREEZE-EVIDENCE.md` — Pre-freeze verification
- `backend/src/shared/services/review.service.ts` — Implementation target
- `backend/src/models/ResumePersonSuggestion.ts` — Schema baseline
- `backend/src/events/UaipEvents.ts` — Event enum baseline
- `backend/src/models/ReviewHistory.ts` — Existing audit pattern

### Final Verification
- All 6 M1 unit tests pass
- Full regression suite: 548/548 passed, 69 suites green
- Typecheck clean for M1 files

---

## 2. Evidence by Plan Acceptance Criterion

### AC1: matchBasis records manual on reviewer override

**Evidence:**
- Plan: `SPRINT-9-PLAN-FREEZE.md` section Final Acceptance Criteria #1
- Implementation: `src/shared/services/review.service.ts:1039`
  ```typescript
  const newMatchBasis = Array.from(new Set([...previousMatchBasis, 'manual']));
  ```
- Test: `src/__tests__/review.service.test.ts` test 1
  ```
  expect(mockResumePersonSuggestionFindOneAndUpdate).toHaveBeenCalledWith(
    { processingId: 'proc1', version: 1 },
    expect.objectContaining({
      $set: expect.objectContaining({
        matchBasis: ['email', 'manual'],
        ...
      })
    })
  );
  ```
- **Status: VERIFIED**

### AC2: ResumePersonSuggestionUpdated event published after successful override

**Evidence:**
- Plan: `SPRINT-9-PLAN-FREEZE.md` section Final Acceptance Criteria #2
- Implementation: `src/shared/services/review.service.ts:1062-1070`
  ```typescript
  void eventBus.publish(UaipEvent.ResumePersonSuggestionUpdated, {
    processingId,
    organizationId,
    userId: reviewer.userId,
    reviewerId: reviewer.userId,
    suggestedPersonId,
    previousSuggestedPersonId: previousPersonId ? String(previousPersonId) : undefined,
    matchBasis: newMatchBasis,
    version: newVersion,
  });
  ```
- Event enum: `src/events/UaipEvents.ts:26`
  ```typescript
  ResumePersonSuggestionUpdated = "RESUME_PERSON_SUGGESTION_UPDATED",
  ```
- Payload fields: `src/events/UaipEvents.ts:150-153`
  ```typescript
  // Resume parser review fields
  suggestedPersonId?: string;
  previousSuggestedPersonId?: string;
  matchBasis?: string[];
  ```
- Test: `src/__tests__/review.service.test.ts` test 1
  ```
  expect(mockEventBusPublish).toHaveBeenCalledWith(
    UaipEvent.ResumePersonSuggestionUpdated,
    expect.objectContaining({ ... })
  );
  ```
- **Status: VERIFIED**

### AC3: ReviewAuditLog appended on every reviewer override

**Evidence:**
- Plan: `SPRINT-9-PLAN-FREEZE.md` section Final Acceptance Criteria #3
- Implementation: `src/shared/services/review.service.ts:1072-1085`
  ```typescript
  await ReviewAuditLog.create({
    processingId,
    organizationId: orgOid,
    action: 'PERSON_OVERRIDE',
    actorId: reviewer.userId,
    actorRole: reviewer.role,
    previousSuggestedPersonId: previousPersonId ? toObjectId(String(previousPersonId)) : undefined,
    newSuggestedPersonId: personOid,
    previousMatchBasis,
    newMatchBasis,
    previousVersion: currentVersion,
    newVersion,
    idempotencyKey,
    timestamp: new Date(),
  });
  ```
- Model: `src/models/ReviewAuditLog.ts` — 37 lines, new collection
- Test: `src/__tests__/review.service.test.ts` test 1
  ```
  expect(ReviewAuditLog.create).toHaveBeenCalledWith(
    expect.objectContaining({
      processingId: 'proc1',
      action: 'PERSON_OVERRIDE',
      ...
    })
  );
  ```
- **Status: VERIFIED**

### AC4: version field added for optimistic concurrency

**Evidence:**
- Plan: `SPRINT-9-PLAN-FREEZE.md` section Final Acceptance Criteria #6
- Implementation: `src/models/ResumePersonSuggestion.ts:22`
  ```typescript
  version: { type: Number, required: true, default: 1 },
  ```
- Service usage: `src/shared/services/review.service.ts:1017-1032`
  ```typescript
  if (expectedVersion !== currentVersion) {
    throw new Error('Conflict: version mismatch. Expected ' + expectedVersion + ', got ' + currentVersion);
  }
  ...
  const newVersion = currentVersion + 1;
  await ResumePersonSuggestion.findOneAndUpdate(
    { processingId, version: currentVersion },
    { $set: { ..., version: newVersion } }
  );
  ```
- Test: `src/__tests__/review.service.test.ts` test 2
  ```
  await expect(service.applyPersonOverride({..., expectedVersion: 1}))
    .rejects.toThrow('Conflict: version mismatch');
  ```
- **Status: VERIFIED**

### AC5: applyPersonOverride routes through reviewService, not dicIntegrationService

**Evidence:**
- Plan: `SPRINT-9-PLAN-FREEZE.md` section Final Milestones M1
- Implementation: `src/shared/services/review.service.ts:994-1092`
  - New method on `ReviewService` class
  - Does NOT call `dicIntegrationService.handleReviewAction`
  - Does NOT call `DicIntegrationService` at all
- Test: `src/__tests__/review.service.test.ts` — imports `ReviewService`, not `DicIntegrationService`
- **Status: VERIFIED**

---

## 3. Schema Changes

### ResumePersonSuggestion

**Before:**
```typescript
version?: Date;  // No version field
```

**After:**
```typescript
version: { type: Number, required: true, default: 1 },
```

**Impact:** Additive only. Existing documents get `version: 1` on first read/write cycle.

### ReviewAuditLog (new)

```typescript
{
  processingId: String (indexed)
  organizationId: ObjectId (indexed)
  action: String, enum: ['PERSON_OVERRIDE']
  actorId: String
  actorRole: String
  previousSuggestedPersonId: ObjectId (ref: Person)
  newSuggestedPersonId: ObjectId (ref: Person, required)
  previousMatchBasis: [String]
  newMatchBasis: [String, required]
  previousVersion: Number (required)
  newVersion: Number (required)
  idempotencyKey: String (indexed, sparse)
  timestamp: Date (indexed)
}
```

**Impact:** Additive only. No existing schema changes.

---

## 4. Event Contract Changes

### New Event: ResumePersonSuggestionUpdated

**Enum:** `src/events/UaipEvents.ts:26`
```
ResumePersonSuggestionUpdated = "RESUME_PERSON_SUGGESTION_UPDATED"
```

**Payload:** Extended `UaipEventPayload` interface with:
- `suggestedPersonId?: string`
- `previousSuggestedPersonId?: string`
- `matchBasis?: string[]`

**Impact:** Additive only. Existing event consumers unaffected.

---

## 5. Test Coverage

| Test | Scenario | Status |
|------|----------|--------|
| test 1 | Happy path: override + manual + event + audit | PASS |
| test 2 | Version mismatch throws Conflict | PASS |
| test 3 | Idempotency dedup returns cached result | PASS |
| test 4 | ResumePersonSuggestion not found | PASS |
| test 5 | Upload missing/deleted | PASS |
| test 6 | Cross-tenant access denied | PASS |

**Coverage:** 6/6 tests pass.

---

## 6. Regression Impact

- Pre-M1 regression suite: 548 tests, 69 suites
- Post-M1 regression suite: 548 tests, 69 suites
- **Zero regressions**
- **Zero dropped test cases**

---

## 7. Artifacts Generated

- `backend/SPRINT-9-M1-IMPLEMENTATION-REPORT.md`
- `backend/SPRINT-9-M1-IMPLEMENTATION-EVIDENCE.md`

---

SPRINT 9 M1 IMPLEMENTATION EVIDENCE COMPLETE
