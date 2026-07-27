# Sprint 9 M2 Code Review Evidence

## 1. Evidence Sources

### Files Reviewed
- `backend/src/controllers/reviewController.ts` — M2 controller methods (lines 163-252)
- `backend/src/routes/reviewRoutes.ts` — Route registration (lines 1-97)
- `backend/src/shared/services/review.service.ts` — Service methods (lines 1004-1111)
- `backend/src/__tests__/reviewController.m2.test.ts` — M2 controller tests
- `backend/SPRINT-9-PLAN-FREEZE.md` — M2 acceptance criteria

### Review Date
2026-07-26

---

## 2. Finding Evidence

### M1 — Missing `expectedVersion` Type Validation

**Evidence:**
- `reviewController.ts:208`:
  ```typescript
  if (expectedVersion === undefined || expectedVersion === null) {
    return sendError(res, 400, 'expectedVersion is required');
  }
  ```
  No `typeof expectedVersion !== 'number'` check.

- Service layer (`review.service.ts:1025`):
  ```typescript
  if (expectedVersion !== currentVersion) {
    throw new Error('Conflict: version mismatch. Expected ' + expectedVersion + ', got ' + currentVersion);
  }
  ```
  JavaScript coercion means `"1" !== 1` evaluates to `true`, producing confusing error for numeric strings.

**Impact:** Client sends `expectedVersion: "abc"` → passes controller → service throws "Conflict: version mismatch. Expected abc, got 1" — misleading.

**Fix:** Add `typeof expectedVersion !== 'number'` guard in controller.

---

### M2 — Unconditional DB Query in `getRoutingInfo`

**Evidence:**
- `reviewController.ts:172`:
  ```typescript
  const personSuggestion = await reviewService.getPersonSuggestion(processingId, organizationId);
  ```
  Executed on every `GET /review/:processingId/routing` call.

- Service (`review.service.ts:1004-1011`):
  ```typescript
  async getPersonSuggestion(processingId: string, organizationId: string) {
    await assertOwnership(processingId, organizationId);
    const suggestion = await ResumePersonSuggestion.findOne({ processingId }).lean();
    if (!suggestion) return null;
    return suggestion;
  }
  ```
  Always hits MongoDB even when no suggestion exists.

**Impact:** Extra DB round-trip per routing call. For non-resume documents or early-stage processing, query returns `null`.

**Fix:** Acceptable for M2. Document as known overhead. Optimize in M3 if profiling shows impact.

---

### M3 — Raw Mongoose Document Exposure

**Evidence:**
- `reviewController.ts:246`:
  ```typescript
  return sendResponse(res, 200, suggestion, 'Person suggestion retrieved');
  ```
  `suggestion` is raw `lean()` result including `_id`, `organizationId` (ObjectId), `__v`, etc.

**Impact:** Couples API consumers to MongoDB schema. Exposes internal identifiers.

**Fix:** Sanitize response or document as internal API.

---

### L1 — Outdated Controller Header

**Evidence:**
- `reviewController.ts:1-14`:
  ```typescript
  /**
   * ReviewController
   *
   * Exposes HTTP endpoints for the Human-in-the-Loop review workflow.
   * Always derives identity from the authenticated JWT — never trusts client-supplied IDs.
   *
   * Routes (all authenticated):
   *   GET    /review/:processingId          → getCandidateState
   *   POST   /review/:processingId/draft    → saveDraft
   *   POST   /review/:processingId/reject   → reject
   *   POST   /review/:processingId/approve  → approve
   *   POST   /review/:processingId/rollback → rollback  (ADMIN or document owner)
   *   GET    /review/:processingId/history  → getHistory
   */
  ```
  Missing: `override-person`, `suggestion` routes.

**Fix:** Update comment block.

---

### L2 — Redundant Error Checks

**Evidence:**
- `reviewController.ts:225-228`:
  ```typescript
  if (err.message?.includes('Conflict')) return sendError(res, 409, err.message);
  if (err.message?.includes('version mismatch') || err.message?.includes('concurrent update')) {
    return sendError(res, 409, err.message);
  }
  ```
  Second condition is subset of first. Dead code.

**Fix:** Remove lines 226-228.

---

### L3 — Missing Null Test for `getRoutingInfo`

**Evidence:**
- `reviewController.m2.test.ts:140-163` only tests `getRoutingInfo` with existing `personSuggestion`.
- No test for `mockGetPersonSuggestion.mockResolvedValue(null)`.

**Fix:** Add test case.

---

## 3. Regression Verification

| Command | Result |
|---------|--------|
| `npx jest --runInBand --testPathPattern="reviewController.m2.test.ts"` | 9/9 passed |
| `npx jest --runInBand` | 560/560 passed, 70 suites |
| `npx tsc --noEmit` | Clean for M2 files |

---

## 4. Architecture v1.7 Compliance (M2)

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

SPRINT 9 M2 CODE REVIEW EVIDENCE COMPLETE
