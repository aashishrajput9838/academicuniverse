# Sprint 9 Plan Review

**Reviewer:** Senior Software Architect  
**Date:** 2026-07-26  
**Plan Version:** Draft (SPRINT-9-PLAN.md)  
**Architecture Baseline:** v1.7  
**Verdict:** NEEDS FIXES BEFORE FREEZE

---

## Executive Summary

Sprint 9 plan addresses real production gaps identified in v0.8.0 release. Scope is appropriate and architecture-conformant in most areas. However, three HIGH-priority issues must be resolved before freeze:

1. **Missing reviewer authorization model** for person override endpoints
2. **Event contract gap** — `ResumePersonSuggestionUpdated` does not exist and has no consumer
3. **Rate-limiting implementation risk** — memoryStore is unsafe for multi-instance deployments

Additional MEDIUM and LOW findings relate to idempotency, audit trails, benchmark scope, and redundancy with existing multer guardrails.

Plan is **not ready for implementation** until findings are addressed.

---

## Findings

### HIGH

| ID | Finding | Area | Impact |
|----|---------|------|--------|
| H1 | No authorization model defined for `POST /review/:processingId/override-person` | M2 | Any authenticated user could override person matches |
| H2 | Event `ResumePersonSuggestionUpdated` does not exist in `UaipEvents` enum | M1 | Publish will fail; downstream consumers break |
| H3 | Rate limiter uses in-memory store — unsafe for multi-instance production | M3 | Rate limits bypassed on scale-out; inconsistent UX |
| H4 | `handleReviewAction` is invoked from MQ consumer (`knowledgeDispatcher.service.ts`), not from HTTP — M1 mechanism unclear | M1 | Reviewer override path is disconnected; implementation may require architectural refactor |

### MEDIUM

| ID | Finding | Area | Impact |
|----|---------|------|--------|
| M1 | No idempotency for `override-person` — duplicate submissions create ambiguous state | M2 | Data integrity risk under retries |
| M2 | No optimistic locking / version check for concurrent reviewer overrides | M2 | Lost updates when two reviewers act simultaneously |
| M3 | Reviewer override not captured in immutable review audit history | M1 | Compliance gap; cannot trace who changed person match |
| M4 | Benchmark SLA target "< 5s end-to-end" is ambiguous — API returns immediately; pipeline is async | M4 | M4 acceptance criteria unmeasurable |
| M5 | Duplicate validation — plan says "Add 10MB guardrail" but multer already enforces it in `resumeParserRoutes.ts` | M3 | Redundant work; plan should clarify intent |
| M6 | No Redis or shared store mention for rate limiter — only in-memory assumption | M3 | Fails in production multi-instance |

### LOW

| ID | Finding | Area | Impact |
|----|---------|------|--------|
| L1 | Test strategy says "maintain 542+ passing tests" — arbitrary count may be outdated tomorrow | Test | Brittle acceptance criterion |
| L2 | No mention of DOCX unzipped memory expansion under 10MB guardrail | M3 | Rare but possible memory spike for complex DOCX |
| L3 | Rollback strategy missing for `override-person` endpoint specifically | M2 | Reviewer cannot undo override without admin DB access |
| L4 | `pdf-to-img` streaming returns array literal in DocumentExtractionEngine — plan says "stream via pdf-to-img" but current impl collects all pages in memory | M3 | Large PDF memory spike may persist |

---

## Detailed Findings & Actionable Fixes

### H1 — Missing Authorization Model

**Observation:** `reviewRoutes.ts` currently has no role checks for person override. The plan says "All endpoints require authentication + org isolation" but does not restrict `override-person` to reviewers with specific permissions.

**Fix:** Add explicit role guard. Restrict `POST /review/:processingId/override-person` to roles:
- `FACULTY`
- `ADMIN`
- `SUPER_ADMIN`

Add middleware: `authorize('REVIEW_RESUME', 'OVERRIDE_PERSON_MATCH')` or equivalent permission token.

### H2 — Missing Event in UaipEvents Enum

**Observation:** `UaipEvents.ts` does not define `ResumePersonSuggestionUpdated`. Plan says "Add event `ResumePersonSuggestionUpdated`".

**Fix:** Add new enum value:
```
ResumePersonSuggestionUpdated = "RESUME_PERSON_SUGGESTION_UPDATED"
```
Update `UaipEventPayload` with fields:
- `suggestedPersonId`
- `previousPersonId?`
- `matchBasis`
- `reviewerId`
- `overrideReason?`

Ensure at least one consumer (e.g., Skills Tracker or Growth Hub) lists this event or document it as "publish-only" with no current consumer.

### H3 — Rate Limiter Multi-Instance Risk

**Observation:** No rate-limiting middleware exists. Plan says "10 uploads per 15 minutes per organization" but does not specify store.

**Fix:** Use `express-rate-limit` with a Redis or Memcached store, OR document clearly that rate limiting is per-single-instance only and requires Redis for production scale. If external store is out of scope, move rate limiting behind a feature flag and default to disabled in production until Redis is provisioned.

Alternative: Use the existing `knowledgeJobRepo` or a simple `RateLimitAttempt` collection in MongoDB for persistence. This avoids new dependencies.

### H4 — M1 Implementation Path Unclear

**Observation:** `dicIntegration.service.ts:handleReviewAction` is called from the MQ consumer path (knowledge dispatcher). The reviewer HTTP override happens through `reviewController.ts`, which calls `reviewService.approve`. There is no documented path from HTTP review action → `handleReviewAction`.

**Fix:** Either:
(a) Extend `reviewService.approve` to call a new method `applyPersonOverride` in `DicIntegrationService`, or
(b) Move person override logic into `reviewService` directly and have it publish the event.

Do not route HTTP review through MQ consumer path.

### M1 — Idempotency

**Observation:** Duplicate `POST /review/:processingId/override-person` calls could race.

**Fix:** Add idempotency key requirement (`Idempotency-Key` header) or check if `ResumePersonSuggestion.status` is already terminal before applying.

### M2 — Optimistic Locking

**Observation:** Two reviewers could update the same `ResumePersonSuggestion` concurrently.

**Fix:** Add `version` field to `ResumePersonSuggestion` (integer, increments on update). Require `version` in request body for override. Reject with `409 Conflict` if version mismatch.

### M3 — Audit Trail Gap

**Observation:** `handleReviewAction` updates `ResumeParseResult.reviewStatus`. If a reviewer overrides a person match, this action is invisible to the review audit trail.

**Fix:** Emit an audit event or append to a `ReviewAuditLog` collection:
```
{
  processingId,
  action: 'PERSON_OVERRIDE',
  actorId: reviewerId,
  previousSuggestedPersonId,
  newSuggestedPersonId,
  matchBasis: ['manual'],
  timestamp
}
```

### M4 — Benchmark SLA Ambiguity

**Observation:** `POST /api/resume/parse-upload` returns immediately with `processingId`. The actual parsing is async via MQ. "End-to-end < 5s" is unclear.

**Fix:** Define SLA precisely:
- Option A: API response time < 500ms (time-to-acknowledge)
- Option B: Pipeline completion time < 5s for simple resumes
- Option C: Add a `GET /resume/parse-result/:processingId` polling endpoint or WebSocket for real-time completion tracking

Update benchmark test to measure time-to-acknowledge and total pipeline time separately.

### M5 — Redundant 10MB Guardrail

**Observation:** `resumeParserRoutes.ts:8-13` already sets `fileSize: 10 * 1024 * 1024` in multer.

**Fix:** In plan, clarify this as "verify existing 10MB multer guardrail is active" rather than "add request-size validation".

### M6 — DOCX Memory Expansion

**Observation:** Plan does not address DOCX unzipping. A 9.9MB DOCX could expand to 50MB+ in memory after ZIP extraction.

**Fix:** Add unzipped size check in the DOCX parsing path. Cap expansion at 50MB or stream DOCX parsing.

### L1 — Test Count Acceptance Criterion

**Fix:** Change to "Full regression suite remains green; no dropped test coverage."

### L2 — Rollback for Override

**Fix:** Add `POST /review/:processingId/rollback-person` endpoint or allow `override-person` to accept `null` as `suggestedPersonId` to reset to pending.

### L3 — pdf-to-img Memory

**Observation:** `DocumentExtractionEngine.ts:165-194` collects all rendered pages into an array before returning.

**Fix:** For Sprint 9 partial scope, document that `DocumentExtractionEngine.renderPdfPages` needs async generator refactor. Alternatively, process pages one at a time in the new streaming path without building the full array.

---

## Architecture Compliance

| Check | Status |
|-------|--------|
| No breaking API changes | PASS (new endpoints are additive) |
| MongoDB indexes compatible | PASS (no new indexes required) |
| Event contracts extend `UaipEvents` | FAIL (missing `ResumePersonSuggestionUpdated`) |
| Auth + org isolation patterns | PASS (existing middleware reusable) |
| Backward compatible with v0.8.0 | PASS |
| Multi-tenant safe | FAIL (no role guard for override endpoint) |
| No new npm dependencies | PASS (if using MongoDB rate-limit store) |

---

## Test Strategy Critique

Current plan test strategy is weak. It should specify:
- **Unit:** `applyPersonOverride` updates `ResumePersonSuggestion` atomically
- **Unit:** Rate limiter rejects exceeding requests for same `organizationId`
- **Unit:** PDF streaming does not load full buffer for >20 pages
- **Contract:** `POST /review/:processingId/override-person` returns 401/403 for unauthorized roles
- **Contract:** Duplicate override returns same result (idempotency)
- **Contract:** Cross-org person selection returns 400
- **Regression:** Full suite green

---

## Revised Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Reviewer unauthorized override | High | High | Role guard + permission check |
| Event publish fails due to missing enum | High | High | Add enum + consumer before implementation |
| Rate limit bypass on multi-instance | Medium | Medium | Redis store or MongoDB attempt store |
| Concurrent override lost update | Medium | Medium | Optimistic locking via version field |
| Benchmark SLA misinterpretation | Medium | Medium | Precise SLA definition in acceptance criteria |
| Duplicate override retries | Medium | Low | Idempotency key support |

---

SPRINT 9 PLAN REVIEW COMPLETE

READY FOR PLAN FIXES
