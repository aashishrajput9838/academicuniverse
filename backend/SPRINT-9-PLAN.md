# Sprint 9 Plan

**Sprint:** 9 — DIC Review & Production Hardening  
**Date:** 2026-07-26  
**Status:** APPROVED FOR PLAN FREEZE  
**Architecture Version:** v1.7  
**Baseline:** v0.8.0

---

## 1. Sprint Goal

Enable the DIC Review UI and harden the resume pipeline for production scale by adding reviewer override hooks, rate limiting, and production benchmark execution.

---

## 2. Milestones

| Milestone | Deliverable | Acceptance |
|-----------|-------------|------------|
| M1 | DIC Reviewer Override Hooks | `ResumePersonSuggestion.matchBasis` records `manual` when reviewer overrides; event `ResumePersonSuggestionUpdated` emitted; `ReviewAuditLog` appended |
| M2 | DIC Review API Enhancement | New endpoints `override-person`, `suggestion`, enhanced `routing`; all protected by role guard; idempotent with optimistic locking |
| M3 | Rate Limiting & Production Hardening | Rate-limited `/api/resume/parse-upload` via MongoDB-backed store; PDF streaming via async `pdf-to-img` generator; DOCX unzipped size validated |
| M4 | Production Benchmark Execution | Staging benchmark measures time-to-acknowledge < 500ms and pipeline completion < 5s; results documented |

---

## 3. Scope

### In Scope

#### M1: DIC Reviewer Override Hooks
- Add `applyPersonOverride` method to `reviewService` (NOT `DicIntegrationService.handleReviewAction`) for HTTP review actions
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

### Out of Scope
- Frontend DIC Review UI implementation
- New canonical models
- Architecture v1.7 changes
- New npm dependencies
- Resume generation / templating
- Scanned-image OCR pipeline improvements

---

## 4. Architecture Compliance

- No breaking changes to existing APIs
- All new endpoints follow existing auth + org isolation patterns
- MongoDB indexes remain compatible; add TTL index for `RateLimitAttempt`
- Event contracts extend `UaipEvents` with `ResumePersonSuggestionUpdated`
- Backward compatible with v0.8.0
- Multi-tenant safe: all endpoints enforce org context + role guard

---

## 5. Error Handling

| Failure Mode | Behavior |
|--------------|----------|
| Rate limit exceeded | Return `429 Too Many Requests` with `Retry-After` header |
| Reviewer override validation fails | Return `400` with error details |
| Reviewer unauthorized | Return `403 Forbidden` |
| Optimistic lock conflict | Return `409 Conflict` with current version |
| Duplicate idempotency key | Return `200` with cached result |
| Production benchmark exceeds SLA | Document result, do not block release |
| Large PDF memory spike | Stream pages via `pdf-to-img` async generator; log warning |
| DOCX unzipped size exceeds 50MB | Return `413 Payload Too Large` |

---

## 6. Testing Strategy

| Layer | Test focus |
|-------|------------|
| Unit | `applyPersonOverride` updates `ResumePersonSuggestion` atomically with `manual` matchBasis |
| Unit | Rate limiter rejects excess requests per organization using MongoDB store |
| Unit | PDF async generator handles >20 pages without loading full buffer |
| Integration | Reviewer override flow end-to-end with role guard |
| Integration | Idempotency: duplicate `override-person` returns same result within 24h |
| Integration | Optimistic locking rejects concurrent override with `409` |
| Integration | DIC review API endpoints return 403 for unauthorized roles |
| Regression | Full regression suite remains green; zero dropped test cases |

---

## 7. Review History

| Phase | Verdict | Findings |
|-------|---------|----------|
| Senior Plan Review | NEEDS FIXES | 4 HIGH, 6 MEDIUM, 4 LOW |
| Plan Fixes | ALL FINDINGS ADDRESSED | See SPRINT-9-PLAN-FIX-REPORT.md |
| Plan Re-Review | APPROVED FOR PLAN FREEZE | All findings verified resolved |
| Plan Freeze | TBD | TBD |

---

## 8. Estimated Effort

| Workstream | Effort |
|------------|--------|
| M1: Reviewer override hooks | 0.5 day |
| M2: DIC Review API | 0.75 day |
| M3: Rate limiting + hardening | 0.5 day |
| M4: Production benchmark | 0.5 day |
| Fixes & Documentation | 0.25 day |
| **Total** | **~2.5 days** |

---

## 9. Risks & Mitigations

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

## 10. Rollback Strategy

1. Disable rate-limit middleware via feature flag
2. Disable `override-person` endpoint via feature flag
3. Revert reviewer override changes via commit revert
4. Rollback target: v0.8.0

---

*Sprint 9 plan approved for freeze. Subject to final freeze confirmation.*
