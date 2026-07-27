# Sprint 9 Plan Evidence

## 1. Evidence Sources

### Current State Analysis
- `RELEASE-v0.8.0.md` — Sprint 8 release notes and known limitations
- `SPRINT-8-COMPLETION-REPORT.md` — Sprint 8 completion summary
- `RESUME-PARSER-ARCHITECTURE.md` v1.7 — current architecture baseline
- `PROJECT-INDEX.md` — artifact inventory and sprint status
- `SPRINT-9-PLAN-REVIEW.md` — Senior architect review findings
- `SPRINT-9-PLAN-REVIEW-EVIDENCE.md` — Detailed review evidence

### Known Limitations Driving Sprint 9 Scope

From `RELEASE-v0.8.0.md`:
1. DIC UI not implemented — backend routing logic complete; frontend review interface is separate work
2. Production benchmark not executed — test-environment benchmarks are in place; production SLA validation pending
3. Person dedup full-scan fallback — acceptable for current scale; noted for future optimization
4. Dispatcher health hardcoded — documented limitation

From `SPRINT-8-COMPLETION-REPORT.md` "What's Next":
- Sprint 9 planning
- DIC Review UI implementation
- Production benchmark execution
- Reviewer intervention hooks for `matchBasis`

From Architecture v1.7 Section 16 (Backlog items):
- AI result caching by `fileHash` — tracked for v1.1
- Rate limiting on `/api/resume/parse-upload`
- Large PDF memory spike — use `pdf-to-img` for >20 pages
- Hardcoded section alias registry — move to `ResumeSectionAlias` collection in v2

---

## 2. Review Findings Applied

### HIGH Fixes Applied

| Finding | Fix Applied | Evidence |
|---------|-------------|----------|
| H1 — Missing authorization model | Added `authorize('REVIEW_RESUME', 'OVERRIDE_PERSON_MATCH')` guard to `POST /review/:processingId/override-person` | Plan Section 3, M2 |
| H2 — Missing event enum | Plan now requires `ResumePersonSuggestionUpdated` event in `UaipEvents` before implementation | Plan Section 3, M1 |
| H3 — Rate limiter unsafe store | Replaced in-memory assumption with MongoDB `RateLimitAttempt` collection + TTL index | Plan Section 3, M3; Plan Section 4 |
| H4 — Implementation path unclear | M1 now uses `reviewService.applyPersonOverride` instead of `dicIntegrationService.handleReviewAction` | Plan Section 3, M1 |

### MEDIUM Fixes Applied

| Finding | Fix Applied | Evidence |
|---------|-------------|----------|
| M1 — No idempotency | Plan requires `Idempotency-Key` header on `override-person`; 24h dedup window | Plan Section 3, M2; Plan Section 5 |
| M2 — No optimistic locking | Added `version` field requirement to `ResumePersonSuggestion`; `409 Conflict` on mismatch | Plan Section 3, M2; Plan Section 5 |
| M3 — No audit trail | Plan requires `ReviewAuditLog` append on every reviewer override | Plan Section 3, M1 |
| M4 — Benchmark SLA ambiguous | Defined two SLAs: time-to-acknowledge < 500ms and pipeline completion < 5s | Plan Section 3, M4 |
| M5 — Redundant 10MB guardrail | Clarified plan as "verify existing multer guardrail is active" | Plan Section 3, M3 |
| M6 — DOCX memory expansion | Added DOCX unzipped size validation (50MB cap), 413 response | Plan Section 3, M3; Plan Section 5 |

### LOW Fixes Applied

| Finding | Fix Applied | Evidence |
|---------|-------------|----------|
| L1 — Arbitrary test count | Replaced with "Full regression suite remains green; zero dropped test cases" | Plan Section 6 |
| L2 — No rollback for override | Plan requires rollback capability via feature flag or commit revert | Plan Section 10 |
| L3 — pdf-to-img memory | Plan requires async generator refactor of `renderPdfPages` | Plan Section 3, M3; Plan Section 10 |

---

## 3. Scope Rationale

### M1: DIC Reviewer Override Hooks
**Why:** Architecture v1.7 Section 7.4 specifies manual override capability, but `handleReviewAction` does not update `ResumePersonSuggestion.matchBasis` with `manual`. This is the highest priority gap because it blocks the DIC Review UI from completing the review loop.

**Fixes Applied:**
- `applyPersonOverride` routed through `reviewService` (not `dicIntegrationService`)
- `version` field added for concurrency control
- `ReviewAuditLog` appended for compliance
- `ResumePersonSuggestionUpdated` event required

**Evidence:**
- `ResumePersonSuggestion` model already has `matchBasis` enum including `'manual'`
- RELEASE-v0.8.0.md lists "Reviewer intervention hooks for matchBasis" as next work
- Review finding H4 (implementation path) resolved via `reviewService` routing

### M2: DIC Review API Enhancement
**Why:** The frontend DIC Review UI needs backend endpoints to fetch suggestions and accept overrides. Existing `/review/*` endpoints cover generic review but lack resume-specific person matching endpoints.

**Fixes Applied:**
- `override-person` endpoint protected by role guard
- Idempotency via `Idempotency-Key` header
- Optimistic locking via `version` field
- Cross-org validation implicit in `enforceOrgIsolation`

**Evidence:**
- `reviewController.ts` has generic approve/reject/rollback but no person override endpoint
- `auth.ts:59-98` provides `authorize()` middleware for role guards
- Review finding H1 (authorization) resolved via explicit permissions

### M3: Rate Limiting & Production Hardening
**Why:** Production readiness requires protecting the resume upload endpoint from abuse and handling large files gracefully.

**Fixes Applied:**
- MongoDB-backed rate limiter store (`RateLimitAttempt` collection with TTL index)
- DOCX unzipped size cap at 50MB
- Async generator refactor for `pdf-to-img`
- Clarified 10MB multer guardrail verification

**Evidence:**
- Architecture v1.7 Section 16 lists "Rate limiting on `/api/resume/parse-upload`" as backlog
- Large PDF memory spike risk documented in architecture Section 16
- No rate limiting middleware exists in `src/middleware/`
- Review finding H3 (multi-instance) resolved via MongoDB store

### M4: Production Benchmark Execution
**Why:** Sprint 8 created benchmark infrastructure but did not execute in production-like environment. SLA validation (< 5s end-to-end) is pending.

**Fixes Applied:**
- Split SLA into time-to-acknowledge and pipeline completion
- Staging environment matches production hardware profile

**Evidence:**
- RELEASE-v0.8.0.md lists "Production benchmark execution" as next step
- SPRINT-8-PLAN-FREEZE.md Definition of Done includes "Benchmark suite created and passing"
- Benchmark tests exist at `src/__tests__/benchmarks/resumePipeline.benchmark.test.ts`
- Review finding M4 (SLA ambiguity) resolved via precise definitions

---

## 4. Excluded from Sprint 9

| Item | Reason |
|------|--------|
| Frontend DIC Review UI | Separate frontend work; backend APIs provided in M1-M2 |
| AI result caching by fileHash | Tracked for v1.1; requires cache invalidation strategy |
| Section alias registry collection | Architecture v2 change; out of scope for v1.7 |
| New canonical models | Out of scope per architecture boundaries |
| DOCX streaming | Acceptable under 10MB guardrail per v1.7; unzipped size cap added |
| Tight coupling abstraction | Acceptable for v1; tracked for v2 |

---

## 5. Architecture Compliance

- No breaking changes to existing APIs
- All new endpoints follow existing auth + org isolation + role guard patterns
- MongoDB indexes remain compatible; add TTL index for `RateLimitAttempt`
- Event contracts extend existing `UaipEvents` with `ResumePersonSuggestionUpdated`
- Backward compatible with v0.8.0
- Multi-tenant safe via org isolation + role guard

---

## 6. Test Strategy

- All milestones include unit tests
- M1-M2 include integration tests for new endpoints
- Full regression suite must remain green; zero dropped test cases
- Target: maintain 542+ passing tests (unchanged; but acceptance criterion is now "green, zero dropped")

---

## 7. Verification Summary

| Check | Status |
|-------|--------|
| Scope aligned with v0.8.0 known limitations | YES |
| No architecture changes | YES |
| No new dependencies required | YES (MongoDB store uses existing driver) |
| Backward compatible | YES |
| Multi-tenant safe | YES |
| HIGH findings resolved | YES |
| MEDIUM findings resolved | YES |
| LOW findings resolved | YES |
| Testable milestones | YES |

---

SPRINT 9 PLAN FIXES COMPLETE

READY FOR PLAN RE-REVIEW
