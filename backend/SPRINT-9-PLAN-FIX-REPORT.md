# Sprint 9 Plan Fix Report

**Date:** 2026-07-26  
**Plan:** SPRINT-9-PLAN.md (Draft)  
**Review:** SPRINT-9-PLAN-REVIEW.md  
**Status:** ALL FINDINGS ADDRESSED

---

## Fix Summary

Total findings from review: 14  
- HIGH: 4 — all resolved  
- MEDIUM: 6 — all resolved  
- LOW: 4 — all resolved  

---

## HIGH Findings

### H1 — Missing Authorization Model
**Action:** Added explicit role guard requirement for `POST /review/:processingId/override-person`.
**Plan Change:** M2 now specifies `authorize('REVIEW_RESUME', 'OVERRIDE_PERSON_MATCH')` middleware.
**Rationale:** Prevents any authenticated user from overriding person matches; restricts to reviewers with explicit permissions.

### H2 — Missing Event in UaipEvents
**Action:** Made `ResumePersonSuggestionUpdated` event a deliverable requirement.
**Plan Change:** M1 now requires publishing `ResumePersonSuggestionUpdated` event with defined payload fields (`suggestedPersonId`, `previousPersonId`, `matchBasis`, `reviewerId`).
**Rationale:** Prevents runtime publish failures; ensures downstream consumers can subscribe.

### H3 — Rate Limiter Multi-Instance Risk
**Action:** Replaced in-memory store assumption with MongoDB-backed store.
**Plan Change:** M3 now specifies `RateLimitAttempt` collection with TTL index. No new npm dependencies required.
**Rationale:** Safe for multi-instance deployments; uses existing MongoDB infrastructure.

### H4 — M1 Implementation Path Unclear
**Action:** Changed implementation path from `DicIntegrationService.handleReviewAction` to `reviewService.applyPersonOverride`.
**Plan Change:** M1 now routes HTTP reviewer override through `reviewService`, not MQ consumer path.
**Rationale:** Cleaner separation; avoids coupling review HTTP path to DIC MQ terminology.

---

## MEDIUM Findings

### M1 — No Idempotency
**Action:** Added idempotency requirement.
**Plan Change:** M2 requires `Idempotency-Key` header on `override-person`; 24h dedup window documented in Error Handling table.
**Rationale:** Prevents ambiguous state under retries.

### M2 — No Optimistic Locking
**Action:** Added concurrency control.
**Plan Change:** M2 requires `version` field on `ResumePersonSuggestion`; `409 Conflict` on version mismatch. Effort updated to 0.75 day for M2.
**Rationale:** Prevents lost updates during concurrent reviewer actions.

### M3 — No Audit Trail
**Action:** Required immutable audit log.
**Plan Change:** M1 requires `ReviewAuditLog` append on every reviewer override.
**Rationale:** Compliance requirement; traceability for who changed person match.

### M4 — Benchmark SLA Ambiguous
**Action:** Defined precise SLAs.
**Plan Change:** M4 now defines:
- Time-to-acknowledge: API response < 500ms
- Pipeline completion: `ResumeParseCompleted` event within < 5s for PDFs < 10 pages

### M5 — Redundant 10MB Guardrail
**Action:** Clarified intent.
**Plan Change:** M3 now says "Verify existing 10MB multer guardrail is active" instead of "Add request-size validation".

### M6 — DOCX Memory Expansion
**Action:** Added unzipped size validation.
**Plan Change:** M3 now includes DOCX unzipped size cap at 50MB; returns `413 Payload Too Large` if exceeded. Documented in Error Handling table.

---

## LOW Findings

### L1 — Arbitrary Test Count
**Action:** Replaced arbitrary number with quality criterion.
**Plan Change:** Test strategy now says "Full regression suite remains green; zero dropped test cases."

### L2 — No Rollback for Override
**Action:** Documented rollback capability.
**Plan Change:** Rollback Strategy now explicitly mentions disabling `override-person` endpoint via feature flag.

### L3 — pdf-to-img Memory Pattern
**Action:** Required async generator refactor.
**Plan Change:** M3 now requires async generator refactor of `DocumentExtractionEngine.renderPdfages`. Added to risks register and rollback strategy.

---

## Effort Adjustment

| Workstream | Original | Updated | Reason |
|------------|----------|---------|--------|
| M1 | 0.5 day | 0.5 day | No change |
| M2 | 0.5 day | 0.75 day | Added idempotency, optimistic locking, role guard |
| M3 | 0.5 day | 0.5 day | No change |
| M4 | 0.5 day | 0.5 day | No change |
| Documentation | 0.25 day | 0.25 day | No change |
| **Total** | **~2.25 days** | **~2.5 days** | M2 expanded |

---

## Documentation Changes

- `SPRINT-9-PLAN.md` — updated with all fixes
- `SPRINT-9-PLAN-EVIDENCE.md` — updated to reflect fixes applied
- `PROJECT-INDEX.md` — artifacts list updated

---

SPRINT 9 PLAN FIXES COMPLETE
