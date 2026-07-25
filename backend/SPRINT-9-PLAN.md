# Sprint 9 Plan

**Sprint:** 9 — DIC Review & Production Hardening  
**Date:** 2026-07-26  
**Status:** PLANNING  
**Architecture Version:** v1.7  
**Baseline:** v0.8.0

---

## 1. Sprint Goal

Enable the DIC Review UI and harden the resume pipeline for production scale by adding reviewer override hooks, rate limiting, and production benchmark execution.

---

## 2. Milestones

| Milestone | Deliverable | Acceptance |
|-----------|-------------|------------|
| M1 | DIC Reviewer Override Hooks | `matchBasis` records `manual` when reviewer overrides person match |
| M2 | DIC Review API Enhancement | New endpoints for review actions, routing info, and suggestion management |
| M3 | Rate Limiting & Production Hardening | Rate-limited `/api/resume/parse-upload`, memory optimization for large PDFs |
| M4 | Production Benchmark Execution | Benchmark suite run in production-like environment, SLA validation |

---

## 3. Scope

### In Scope

#### M1: DIC Reviewer Override Hooks
- Update `handleReviewAction` in `DicIntegrationService` to update `ResumePersonSuggestion` when reviewer overrides
- Record `manual` in `matchBasis` array when reviewer changes person match
- Update `ResumePersonSuggestion.status` based on reviewer action
- Add event `ResumePersonSuggestionUpdated` for downstream consumers

#### M2: DIC Review API Enhancement
- New endpoint: `POST /review/:processingId/override-person` — reviewer overrides suggested person
- New endpoint: `GET /review/:processingId/suggestion` — returns current `ResumePersonSuggestion` with match details
- Enhanced `GET /review/:processingId/routing` — includes person suggestion data
- All endpoints require authentication + org isolation

#### M3: Rate Limiting & Production Hardening
- Add rate limiting middleware to `/api/resume/parse-upload`
- Rate limit: 10 uploads per 15 minutes per organization
- Memory optimization for PDFs > 20 pages: stream via `pdf-to-img` instead of loading full buffer
- Add request-size validation (10MB guardrail)

#### M4: Production Benchmark Execution
- Run benchmark suite in staging environment matching production profile
- Validate `< 5s` end-to-end SLA
- Document production benchmark results
- Update benchmark hardware profile if needed

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
- MongoDB indexes remain compatible
- Event contracts extend existing `UaipEvents` where needed
- Backward compatible with v0.8.0

---

## 5. Error Handling

| Failure Mode | Behavior |
|--------------|----------|
| Rate limit exceeded | Return `429 Too Many Requests` with `Retry-After` header |
| Reviewer override validation fails | Return `400` with error details |
| Production benchmark exceeds SLA | Document result, do not block release |
| Large PDF memory spike | Stream pages via `pdf-to-img`, log warning |

---

## 6. Testing Strategy

| Layer | Test focus |
|-------|------------|
| Unit | `handleReviewAction` updates `ResumePersonSuggestion` with `manual` matchBasis |
| Unit | Rate limiter middleware rejects excess requests |
| Unit | PDF streaming handles >20 pages without memory spike |
| Integration | Reviewer override flow end-to-end |
| Integration | DIC review API endpoints with auth + org isolation |
| Regression | Full suite remains green |

---

## 7. Review History

| Phase | Verdict | Findings |
|-------|---------|----------|
| Senior Plan Review | TBD | TBD |
| Plan Fixes | TBD | TBD |
| Plan Re-Review | TBD | TBD |
| Plan Freeze | TBD | TBD |

---

## 8. Estimated Effort

| Workstream | Effort |
|------------|--------|
| M1: Reviewer override hooks | 0.5 day |
| M2: DIC Review API | 0.5 day |
| M3: Rate limiting + hardening | 0.5 day |
| M4: Production benchmark | 0.5 day |
| Documentation | 0.25 day |
| **Total** | **~2.25 days** |

---

## 9. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Rate limiting blocks legitimate users | Medium | Medium | Configurable limits per org; admin override |
| Reviewer override data loss | Low | High | Atomic DB update with event publish |
| Production benchmark flakiness | Medium | Medium | Retry policy; deterministic fixtures |
| Large PDF memory spike persists | Low | Medium | Fallback to chunked processing; log alert |

---

## 10. Rollback Strategy

1. Revert rate-limit middleware via feature flag
2. Revert reviewer override changes via commit revert
3. Rollback target: v0.8.0

---

*Sprint 9 plan draft. Not frozen. Subject to senior plan review.*
