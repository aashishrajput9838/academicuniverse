# Sprint 9 M2 Code Review

**Reviewer:** Senior Staff Engineer  
**Date:** 2026-07-26  
**Commit:** `38468ce`  
**Milestone:** M2 — DIC Review API Enhancement  
**Verdict:** NEEDS FIXES BEFORE MERGE

---

## Executive Summary

M2 implementation correctly exposes the three planned review API endpoints with proper auth, org isolation, and role guards. However, 3 MEDIUM findings and 3 LOW findings must be resolved before merge. No HIGH findings were identified. The most critical issue is the lack of `expectedVersion` type validation in `overridePerson`, which could lead to confusing error responses.

---

## Findings

### HIGH

| ID | Finding | File | Line | Impact |
|----|---------|------|------|--------|
| — | None | — | — | — |

### MEDIUM

| ID | Finding | File | Line | Impact |
|----|---------|------|------|--------|
| M1 | `overridePerson` does not validate `expectedVersion` is a number | `reviewController.ts` | 208 | String values pass null check, hit service, and produce confusing "version mismatch" errors |
| M2 | `getRoutingInfo` unconditionally queries `ResumePersonSuggestion` even when none exists | `reviewController.ts` | 172 | Extra DB query on every routing call; wasteful for non-resume docs or docs without suggestions |
| M3 | `getSuggestion` returns raw Mongoose lean document with internal `_id` and `organizationId` | `reviewController.ts` | 246 | Exposes internal DB identifiers to API consumers |

### LOW

| ID | Finding | File | Line | Impact |
|----|---------|------|------|--------|
| L1 | Controller header comment is outdated — does not list new M2 routes | `reviewController.ts` | 1-14 | Documentation drift; developers may miss new endpoints |
| L2 | Redundant error-message checks in `overridePerson` catch block | `reviewController.ts` | 225-228 | Code smell; second condition is subset of first |
| L3 | Missing test for `getRoutingInfo` when `personSuggestion` is `null` | `reviewController.m2.test.ts` | 140-163 | Incomplete test coverage for null branch |

---

## Detailed Findings & Recommendations

### M1 — Missing `expectedVersion` Type Validation

**Observation:** `overridePerson` checks `expectedVersion === undefined || expectedVersion === null` but does not verify it is actually a number. A request body with `expectedVersion: "abc"` passes validation, reaches the service, and fails with a generic "Conflict: version mismatch" error.

**Why it matters:** Clients receive misleading error messages. API contract says `expectedVersion` is a number; invalid types should be rejected with `400 Bad Request`.

**Recommendation:** Add explicit type check:
```typescript
if (typeof expectedVersion !== 'number') {
  return sendError(res, 400, 'expectedVersion must be a number');
}
```

### M2 — Unconditional `getPersonSuggestion` Query in `getRoutingInfo`

**Observation:** `getRoutingInfo` now calls `reviewService.getPersonSuggestion()` on every request, even for documents that have no `ResumePersonSuggestion`. This adds an extra DB round-trip for every routing info request.

**Why it matters:** Performance regression for review UI polling. For non-resume documents or early-stage processing, this query always returns `null`.

**Recommendation:** Acceptable for M2 scope. Document as known overhead. Optimize in M3 if needed by:
- Caching suggestion existence flag on `ResumeParseResult`
- Or batching with `getCandidateState`

### M3 — Raw Mongoose Document Exposure

**Observation:** `getSuggestion` returns the raw `lean()` result from MongoDB, which includes `_id`, `organizationId`, and other internal fields.

**Why it matters:** Exposes internal DB structure to API consumers. While the endpoint is authenticated and org-isolated, it couples clients to MongoDB schema.

**Recommendation:** Sanitize response or document that this is an internal API:
```typescript
const { _id, ...sanitized } = suggestion;
return sendResponse(res, 200, sanitized, 'Person suggestion retrieved');
```
Or at minimum, document the response schema in the route comment.

### L1 — Outdated Controller Header

**Observation:** File header comment (lines 1-14) lists routes but omits the three new M2 endpoints.

**Recommendation:** Update comment to include:
```
POST   /review/:processingId/override-person → overridePerson
GET    /review/:processingId/suggestion       → getSuggestion
```

### L2 — Redundant Error Checks

**Observation:** `overridePerson` catch block first checks `err.message?.includes('Conflict')`, then checks `err.message?.includes('version mismatch') || err.message?.includes('concurrent update')`. The second condition is redundant because both phrases contain "Conflict".

**Recommendation:** Remove redundant second check (lines 226-228).

### L3 — Missing Null Test for `getRoutingInfo`

**Observation:** Test suite only covers `getRoutingInfo` when `personSuggestion` exists. No test for the null case.

**Recommendation:** Add test:
```typescript
it('should include null personSuggestion when none exists', async () => {
  mockGetPersonSuggestion.mockResolvedValue(null);
  // ... assert personSuggestion: null in response
});
```

---

## Architecture v1.7 Compliance

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

## Test Quality Assessment

| Test | Coverage | Gap |
|------|----------|-----|
| `overridePerson` success | Good | Missing `expectedVersion` type validation test |
| `overridePerson` 400/403/404/409 | Good | — |
| `getSuggestion` found | Good | — |
| `getSuggestion` not found | Good | — |
| `getRoutingInfo` with suggestion | Partial | Missing null `personSuggestion` test |

---

SPRINT 9 M2 CODE REVIEW COMPLETE

VERDICT: NEEDS FIXES BEFORE MERGE

READY FOR REVIEW FIXES
