# Sprint 9 Plan Freeze

**Freeze Date:** 2026-07-26  
**Freeze Time:** 05:15 IST  
**Sprint:** 9 — DIC Review & Production Hardening  
**Status:** FROZEN

---

## Freeze Summary

Sprint 9 planning is complete and the plan baseline is now **immutable**.

All planning artifacts have been reviewed, approved, and frozen. Implementation may begin.

---

## Baseline State

| Item | Value |
|------|-------|
| **Architecture Baseline** | `RESUME-PARSER-ARCHITECTURE.md` v1.7 |
| **Tag Baseline** | `v0.8.0` |
| **Sprint Theme** | DIC Review & Production Hardening |
| **Status** | FROZEN |
| **Scope Frozen** | Yes |
| **Planning Artifacts Immutable** | Yes |

---

## Scope Lock

### In Scope (Frozen)

#### M1: DIC Reviewer Override Hooks
- Add `applyPersonOverride` method to `reviewService` (NOT `dicIntegrationService.handleReviewAction`) for HTTP review actions
- Record `manual` in `ResumePersonSuggestion.matchBasis` array when reviewer changes person match
- Add `version` field to `ResumePersonSuggestion` for optimistic concurrency
- Publish new event `ResumePersonSuggestionUpdated` after successful override
- Append `ReviewAuditLog` entry on every reviewer override

#### M2: DIC Review API Enhancement
- New endpoint: `POST /review/:processingId/override-person` — reviewer overrides suggested person; protected by `authorize('REVIEW_RESUME', 'OVERRIDE_PERSON_MATCH')`
- New endpoint: `GET /review/:processingId/suggestion` — returns current `ResumePersonSuggestion` with match details
- Enhanced `GET /review/:processingId/routing` — includes person suggestion data
- All endpoints require authentication + org isolation + role guard
- `override-person` requires `Idempotency-Key` header; rejects duplicate submissions with same key
- Optimistic locking: reject with `409 Conflict` if `version` mismatch

#### M3: Rate Limiting & Production Hardening
- Add rate-limiting middleware to `/api/resume/parse-upload` using MongoDB `RateLimitAttempt` collection with TTL index (multi-instance safe)
- Rate limit: 10 uploads per 15 minutes per organization
- Memory optimization for PDFs > 20 pages: async generator refactor of `DocumentExtractionEngine.renderPdfPages`
- Request-size validation: verify existing 10MB multer guardrail is active; add DOCX unzipped size check (cap at 50MB)

#### M4: Production Benchmark Execution
- Run benchmark suite in staging environment matching production hardware profile
- SLA definitions:
  - Time-to-acknowledge: `POST /resume/parse-upload` API response < 500ms
  - Pipeline completion: `ResumeParseCompleted` event publish within < 5s for PDFs < 10 pages
- Document production benchmark results; update hardware profile if needed

### Out of Scope (Frozen)
- Frontend DIC Review UI implementation
- New canonical models
- Architecture v1.7 changes
- New npm dependencies
- Resume generation / templating
- Scanned-image OCR pipeline improvements

---

## Review History

| Phase | Date | Verdict | Findings |
|-------|------|---------|----------|
| Senior Plan Review | 2026-07-26 | NEEDS FIXES | 4 HIGH, 6 MEDIUM, 4 LOW |
| Plan Fixes | 2026-07-26 | COMPLETE | All 14 findings addressed |
| Plan Re-Review | 2026-07-26 | APPROVED FOR PLAN FREEZE | 0 |
| Plan Freeze | 2026-07-26 | FROZEN | — |

---

## Final Acceptance Criteria

1. M1: `ResumePersonSuggestion.matchBasis` records `manual` on reviewer override
2. M1: `ResumePersonSuggestionUpdated` event published after successful override
3. M1: `ReviewAuditLog` appended on every reviewer override with actor, previous value, new value, timestamp
4. M2: `POST /review/:processingId/override-person` returns `403` for unauthorized roles
5. M2: Duplicate `override-person` with same `Idempotency-Key` returns `200` with cached result within 24h
6. M2: Concurrent override with stale `version` returns `409 Conflict`
7. M2: `GET /review/:processingId/suggestion` returns current `ResumePersonSuggestion` with match details
8. M3: `/api/resume/parse-upload` rate-limited to 10 uploads per 15 minutes per organization using MongoDB-backed store
9. M3: PDFs > 20 pages processed via async `pdf-to-img` generator without loading full buffer into memory
10. M3: DOCX files with unzipped size > 50MB return `413 Payload Too Large`
11. M4: Staging benchmark measures time-to-acknowledge < 500ms for `POST /resume/parse-upload`
12. M4: Staging benchmark measures pipeline completion < 5s for PDFs < 10 pages
13. M4: Production benchmark results documented with hardware profile
14. Full regression suite passes with zero dropped test cases
15. No new npm dependencies added
16. Architecture v1.7 unchanged
17. Backward compatible with v0.8.0

---

## Final Definition of Done

- [ ] M1: `applyPersonOverride` implemented in `reviewService`
- [ ] M1: `ResumePersonSuggestion` schema updated with `version` field
- [ ] M1: `ResumePersonSuggestionUpdated` event added to `UaipEvents` and published
- [ ] M1: `ReviewAuditLog` collection created and populated on override
- [ ] M2: `POST /review/:processingId/override-person` endpoint created with role guard, idempotency, optimistic locking
- [ ] M2: `GET /review/:processingId/suggestion` endpoint created
- [ ] M2: `GET /review/:processingId/routing` enhanced with person suggestion data
- [ ] M3: `RateLimitAttempt` collection created with TTL index
- [ ] M3: Rate-limiting middleware applied to `/api/resume/parse-upload`
- [ ] M3: `DocumentExtractionEngine.renderPdfPages` refactored to async generator
- [ ] M3: DOCX unzipped size validation implemented
- [ ] M4: Benchmark executed in staging environment
- [ ] M4: SLA results documented
- [ ] Code review passed
- [ ] Full regression suite passes; zero dropped test cases

---

## Final Milestones

| Milestone | Deliverable | Acceptance |
|-----------|-------------|------------|
| M1 | DIC Reviewer Override Hooks | `matchBasis` records `manual`; `ResumePersonSuggestionUpdated` event emitted; `ReviewAuditLog` appended |
| M2 | DIC Review API Enhancement | New endpoints `override-person`, `suggestion`, enhanced `routing`; all protected by role guard; idempotent with optimistic locking |
| M3 | Rate Limiting & Production Hardening | Rate-limited `/api/resume/parse-upload` via MongoDB-backed store; PDF streaming via async `pdf-to-img` generator; DOCX unzipped size validated |
| M4 | Production Benchmark Execution | Staging benchmark measures time-to-acknowledge < 500ms and pipeline completion < 5s; results documented |

---

## Final Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Rate limiting blocks legitimate users | Medium | Medium | Configurable limits per org; admin override |
| Reviewer unauthorized override | High | High | Role guard + permission check |
| Event publish fails due to missing enum | High | High | Add enum + consumer before implementation |
| Optimistic lock rejection UX | Medium | Low | Return current state in 409 response |
| Concurrent override lost update | Medium | Medium | Optimistic locking via version field |
| Rate limit bypass on multi-instance | Medium | Medium | MongoDB store with TTL |
| Production benchmark flakiness | Medium | Medium | Retry policy; deterministic fixtures |
| Large PDF memory spike persists | Low | Medium | Async generator; fallback to chunked processing |
| DOCX unzipped memory spike | Low | Medium | Unzipped size cap at 50MB |

---

## Rollback Strategy

If review/hardening changes cause issues:

1. Disable rate-limit middleware via feature flag
2. Disable `override-person` endpoint via feature flag
3. Revert reviewer override changes via commit revert
4. Revert `DocumentExtractionEngine.renderPdfPages` async generator via commit revert
5. Rollback target: v0.8.0

---

## Artifact Inventory

| Artifact | Status |
|----------|--------|
| `SPRINT-9-PLAN.md` | FROZEN |
| `SPRINT-9-PLAN-EVIDENCE.md` | FROZEN |
| `SPRINT-9-PLAN-REVIEW.md` | FROZEN |
| `SPRINT-9-PLAN-REVIEW-EVIDENCE.md` | FROZEN |
| `SPRINT-9-PLAN-FIX-REPORT.md` | FROZEN |
| `SPRINT-9-PLAN-FIX-EVIDENCE.md` | FROZEN |
| `SPRINT-9-PLAN-RE-REVIEW.md` | FROZEN |
| `SPRINT-9-PLAN-RE-REVIEW-EVIDENCE.md` | FROZEN |
| `SPRINT-9-PLAN-FREEZE.md` | FROZEN |
| `SPRINT-9-PLAN-FREEZE-EVIDENCE.md` | FROZEN |

---

## Change Control

Sprint 9 planning artifacts are **immutable** once frozen.

Any changes to scope, acceptance criteria, or deliverables require:
1. Formal change request
2. Senior architect review
3. Updated plan document with change history
4. Re-freeze approval

---

SPRINT 9 PLAN FROZEN

READY FOR M1 IMPLEMENTATION
