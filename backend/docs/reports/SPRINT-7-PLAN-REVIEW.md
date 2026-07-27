# Sprint 7 Plan — Senior Plan Review
## Resume Parser — DIC Integration & Canonical Model Writes (Stages 5-6)

**Reviewer:** Kilo (Senior Plan Review)  
**Date:** 2026-07-25  
**Plan Status:** PLANNING  
**Architecture Baseline:** `RESUME-PARSER-ARCHITECTURE.md` v1.7  

---

## Review Scope

Reviewed artifacts:
- `SPRINT-7-PLAN.md`
- `SPRINT-7-PLAN-EVIDENCE.md`
- `RESUME-PARSER-ARCHITECTURE.md` v1.7
- `PROJECT-INDEX.md`
- Existing source references: `DocumentIntelligenceService`, `ResumePersonSuggestion`, canonical models, `KnowledgeDispatcher`

---

## Checkpoint Review

### 1. Architecture Correctness

**Status:** ✅ PASS

Plan proposes architecture v1.8, extending v1.7 by adding Stage 5 (DIC Integration) and Stage 6 (Canonical Model Writes). Stage progression is sequential and consistent with prior sprints. No circular dependencies or premature optimization detected. Plan correctly identifies that canonical models are already defined in the codebase.

### 2. Stage 5 (DIC Integration) Boundaries

**Status:** ⚠️ MINOR FINDING

Stage 5 owns DIC routing based on `reviewStatus`, auto-approval flow, human review queue, re-upload flow, and DIC event handling. Boundaries are clear against Stage 6.

**Finding 2.1 (LOW):** Trigger mechanism undefined. The plan does not explicitly state how Stage 5 is initiated — whether it subscribes to `ResumeParseCompleted` (from Sprint 6) or polls `ResumeParseResult` by `reviewStatus`. Without this, the event flow is ambiguous.

### 3. Stage 6 (Canonical Model Writes) Boundaries

**Status:** ✅ PASS

Stage 6 owns canonical model mapping, person deduplication, and idempotent writes. Boundaries against Stage 5 are clear: Stage 6 triggers only after approval (auto or human).

### 4. Dispatcher Design

**Status:** ✅ PASS

Plan extends existing `KnowledgeDispatcher` with `dic_integration` and `canonical_write` routing cases. This follows the pattern established in Sprints 3–6 (`section_detection`, `entity_extraction`, `ai_enhancement`, `confidence_scoring`). No dispatcher changes to prior stages.

### 5. Event Contracts

**Status:** ✅ PASS

Four new events defined with complete payloads:
- `ResumeDICRouted`
- `ResumeDICRoutingFailed`
- `ResumeCanonicalWritten`
- `ResumeCanonicalWriteFailed`

All events include `processingId`, `timestamp`, `correlationId?`, plus event-specific fields. Payloads extend `UaipEventPayload` consistently.

### 6. Person Deduplication Strategy

**Status:** ❌ MEDIUM FINDING

Plan Section 6 defines a three-bucket strategy:
- Deterministic match (email/phone) → reuse existing Person
- Soft match above threshold → create ResumePersonSuggestion for DIC review
- No match → create new Person

**Finding 6.1 (MEDIUM):** This deviates from architecture v1.7 Section 7.4 deduction formula:

```ts
const isDuplicate =
  emailMatch ||
  phoneMatch ||
  (nameScore >= 0.92 && (emailMatch || phoneMatch || institutionScore >= 0.85));
```

Per architecture:
- `email` or `phone` exact match → duplicate (reuse Person)
- `name >= 0.92` AND (`email` OR `phone` OR `institution >= 0.85`) → duplicate (reuse Person)
- Otherwise → not duplicate

The plan's "soft match → suggestion" path incorrectly converts architecture-defined duplicates into suggestions. For example, `name >= 0.92` AND `institution >= 0.85` (without email/phone) should reuse the existing Person per the formula, but the plan would create a `ResumePersonSuggestion`.

**Required fix:** Align the plan's decision logic with the architecture formula. Suggested correction:
- If architectural formula says duplicate → reuse existing Person; create `ResumePersonSuggestion` with `matchConfidence` and `matchBasis` for audit/override
- If formula says not duplicate → create new Person; create `ResumePersonSuggestion` with `isNewPerson: true` for DIC confirmation
- Remove the plan's artificial "soft match" bucket that contradicts the formula

### 7. Idempotency Strategy

**Status:** ✅ PASS

Plan uses `ResumeParseResult.dicRoutedAt` and `ResumeParseResult.canonicalWrittenAt` as recomputation guards, plus `processingId` as idempotency key. This matches the architecture's at-least-once delivery guarantees.

### 8. Retry and Rollback Strategy

**Status:** ✅ PASS

Backoff: 1s, 2s, 4s. Max attempts: 3. Dead-letter: `ResumeParseDeadLetter`. Rollback disables dispatcher routing. No data loss since `ResumeParseResult` and `KnowledgeRecord` remain intact. Aligns with architecture Section 5.

### 9. Multi-Tenant Safety

**Status:** ✅ PASS

All reads/writes scope by `processingId` + `organizationId`. Person deduplication scoped to `organizationId`. Matches architecture Section 7.4 organization isolation guarantee.

### 10. Canonical Model Mapping

**Status:** ✅ PASS

All 8 resume entity types map to existing canonical models:
- `Person`, `ExperienceRecord`, `AcademicRecord`, `SkillEvidence`, `CertificateRecord`, `CareerRecord`

Plan correctly notes no schema changes required for existing canonical models. Mapping aligns with architecture Section 5.1.

### 11. Test Strategy

**Status:** ✅ PASS

14 unit tests + 3 integration tests planned. Coverage includes:
- DIC routing per `reviewStatus`
- Person deduplication (email, phone, name)
- Canonical writes per entity type
- Idempotency
- Error handling
- End-to-end Stage 4 → 5 → 6

This exceeds the 12+ unit test requirement.

### 12. Scope Control

**Status:** ⚠️ MINOR FINDING

Out-of-scope items are clearly listed: DIC UI, frontend, API changes, new canonical models, person matching redesign, OCR/parsing.

**Finding 12.1 (LOW):** Plan in-scope lists "Resume-specific DIC UI metadata" but out-of-scope says "DIC UI implementation". This creates ambiguity about what metadata is being added vs. what is excluded. Recommendation: remove "DIC UI metadata" from in-scope or replace with "DIC routing metadata" to clarify this is backend-side metadata only.

### 13. Risks and Mitigation

**Status:** ✅ PASS

Five risks identified with likelihood, impact, and mitigation. Key risks (person dedup false positives, partial write failure) have appropriate mitigations (multi-signal matching, transactional writes).

### 14. Acceptance Criteria

**Status:** ✅ PASS

12 acceptance criteria defined, covering routing, auto-approval, queue, re-upload, writes, deduplication, events, idempotency, tests, regressions, compilation, and code review.

---

## Additional Findings

### Finding 15 (LOW): Existing Model Not Correctly Acknowledged

Plan Section 11 says: `src/models/ResumePersonSuggestion.ts` — "Create if not exists"

However, `ResumePersonSuggestion` already exists in the codebase (verified via grep). The plan should state "update if needed" or "extend if needed" to reflect current state.

---

## Summary

| # | Checkpoint | Status |
|---|-----------|--------|
| 1 | Architecture correctness | ✅ PASS |
| 2 | Stage 5 boundaries | ⚠️ MINOR |
| 3 | Stage 6 boundaries | ✅ PASS |
| 4 | Dispatcher design | ✅ PASS |
| 5 | Event contracts | ✅ PASS |
| 6 | Person deduplication | ❌ MEDIUM |
| 7 | Idempotency | ✅ PASS |
| 8 | Retry/rollback | ✅ PASS |
| 9 | Multi-tenant safety | ✅ PASS |
| 10 | Canonical model mapping | ✅ PASS |
| 11 | Test strategy | ✅ PASS |
| 12 | Scope control | ⚠️ MINOR |
| 13 | Risks/mitigation | ✅ PASS |
| 14 | Acceptance criteria | ✅ PASS |
| 15 | Existing model reference | ⚠️ LOW |

---

## Verdict

### APPROVED WITH FINDINGS

The plan is structurally sound and aligned with architecture v1.8. The primary concern is the person deduplication strategy (Finding 6.1, MEDIUM), which must be corrected to match the architecture v1.7 Section 7.4 deduction formula exactly. The three minor findings (2.1, 12.1, 15) should also be addressed for clarity.

---

*End of Sprint 7 Plan Review*
*Generated: 2026-07-25*
