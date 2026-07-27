# Sprint 5 Code Review
## Resume Parser — ResumeAIEnhancer (Stage 3)

**Date:** 2026-07-25  
**Reviewer:** Kilo  
**Scope:** Sprint 5 implementation code review  
**Status:** APPROVED WITH FIXES

---

## Executive Summary

Implementation is clean, well-structured, and fully compliant with the frozen Sprint 5 plan and Architecture v1.6. Stateless service design is maintained, event contracts are correct, and error handling follows existing patterns.

**2 findings** must be resolved before merge:
- 1 Medium: `normalizedSkills` counter data accuracy
- 1 Low: Documentation mismatch on test counts

No critical or high-severity issues found.

---

## Findings

### 1. `normalizedSkills` Counts All Skill Entities, Not Just Normalized Ones

- **Severity:** Medium
- **File:** `src/shared/services/knowledgeDispatcher.service.ts` (handleResumeAiEnhancement)
- **Explanation:** The dispatcher increments `normalizedSkills` by the total number of skill entities:
  ```ts
  normalizedSkills: normalizedSkillCount + skillEntities.length,
  ```
  This counts every skill entity, regardless of whether it was actually normalized or enhanced. The field name implies it should track only normalized skills.
- **Impact:** Downstream consumers (UI, analytics) will see inflated normalization counts.
- **Recommendation:** Increment by `result.improvements.fieldsNormalized` (scoped to skills) or by the number of skill entities where at least one field changed.
- **Must fix before merge:** Yes

### 2. Implementation Report Test Count Mismatch

- **Severity:** Low
- **File:** `SPRINT-5-IMPLEMENTATION-REPORT.md`
- **Explanation:** The report states "12 unit tests" in the deliverables table and test results section, but the evidence report lists 21 actual unit tests. The same inconsistency appears in the evidence doc.
- **Impact:** Documentation inaccuracy; completion reports rely on consistent artifact counts.
- **Recommendation:** Update the implementation report to state "21 unit tests" (or "12 planned / 21 implemented") and ensure evidence matches.
- **Must fix before merge:** No (recommended)

### 3. Date Normalization Regex Produces Invalid ISO for Non-US Formats

- **Severity:** Low
- **File:** `src/services/resume/resumeAIEnhancer.service.ts` (normalizeDate)
- **Explanation:** `normalizeDate` uses `(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})` and always treats the first capture group as month. For DD-MM-YYYY dates where the first part exceeds 12 (e.g., "31-12-2021"), it produces `2021-31-12` (invalid ISO). Similarly, "05-06-2021" is ambiguous.
- **Impact:** Invalid dates trigger `isInvalidDate`, causing AI fallback recovery, but adds unnecessary latency and token cost.
- **Recommendation:** Add a guard: if month > 12, swap month/day; if both ≤ 12, prefer MM-DD-YYYY convention (common in US resumes) or add a heuristic based on locale.
- **Must fix before merge:** No (existing Stage 2 pattern; AI fallback recovers)

### 4. Error Classification Gap for AI JSON Parse Failures

- **Severity:** Low
- **File:** `src/shared/services/knowledgeDispatcher.service.ts` (handleResumeAiEnhancement)
- **Explanation:** The catch block classifies `ai_exhausted` only when the error message contains "AI", "quota", or "rate limit". If the AI returns a non-JSON response and `JSON.parse` throws `SyntaxError: Unexpected end of JSON input`, it falls into `unknown` instead of `malformed_response`.
- **Impact:** Failed enhancement logs may misclassify technical failures as unknown, reducing debuggability.
- **Recommendation:** Add `'JSON'`, `'parse'`, or `'malformed'` to the category checks, matching Stage 2's pattern:
  ```ts
  else if (message.includes('JSON') || message.includes('parse') || message.includes('malformed')) {
    reason = 'malformed_response';
  }
  ```
- **Must fix before merge:** No (recoverable; logs still capture the original error)

---

## Verified Dimensions

### 1. Architecture Compliance

| Requirement | Status |
|-------------|--------|
| Stage 3 handler | ✅ |
| Stateless enhancer | ✅ |
| No new deps | ✅ |
| AI fallback semantics | ✅ |
| Multi-tenant isolation | ✅ |
| Event naming | ✅ |
| Review status preserved | ✅ |
| Idempotency | ✅ |

### 2. Scope Compliance

| Frozen Plan Item | Status |
|-----------------|--------|
| ResumeAIEnhancer service | ✅ |
| 8 entity enhancements | ✅ |
| Normalization rules | ✅ |
| AI fallback | ✅ |
| Dispatcher handler | ✅ |
| Events | ✅ |
| Idempotency | ✅ |
| 12+ unit tests | ✅ 21 tests |
| 3 integration tests | ✅ 3 tests |

| Out-of-Scope Guard | Status |
|--------------------|--------|
| ResumeConfidenceScorer | ✅ Not touched |
| DIC integration | ✅ Not touched |
| Canonical writes | ✅ Not touched |
| Frontend/API | ✅ Not touched |
| Deduplication | ✅ Not touched |
| New AI providers | ✅ Not touched |

### 3. Stateless Service Design

`ResumeAIEnhancer` imports only `ResumeEntity`, `IAIProvider`, `AIConfig`, and `Logger`. No DB, queue, or event bus imports. Service can be instantiated independently.

### 4. AI Fallback Semantics

AI fallback is inside the `enhance()` method scope, not a separate retry. Fallback to normalized entity on failure. No retry count consumption.

### 5. Event Contracts

`ResumeAIEnhanced` and `ResumeAIEnhancementFailed` payloads match the frozen plan exactly. No `confidenceSummary` (removed in plan revision). `reviewStatus` is passed through, not modified.

### 6. Idempotency

`rawCandidateFields.aiEnhanced` check is consistent with the plan fix. No schema migration required.

### 7. Multi-Tenant Isolation

All DB writes in dispatcher scope by `processingId` + `organizationId` through the parent `ResumeParseResult`.

### 8. Retry Semantics

Dispatcher error path throws after publishing failure event, allowing upstream retry queue to handle it. No nested retry loops.

### 9. Test Coverage

- Unit tests cover all 8 entity types, AI fallback, validation triggers, GPA normalization, strategy aggregation, idempotency, and error handling.
- Integration tests cover dispatcher flow, idempotency skip, and failure event publishing.
- Full regression: 461/461 tests pass.

### 10. Regression Risk

Zero regressions. Sprint 5 changes are additive: new service, new event types, new dispatcher handler.

### 11. Maintainability

- Single-responsibility methods (`normalizeEntity`, `needsAiEnhancement`, `invokeAiEnhancement`, `buildEnhancementPrompt`)
- Constants for thresholds and critical fields
- Switch-based normalization per entity type
- Follows Sprint 4 patterns

### 12. Performance Considerations

- Normalization is synchronous and linear per entity.
- AI fallback is per-entity and sequential within the loop (no parallel AI calls). Acceptable for typical resume entity counts.
- No N+1 queries in dispatcher (single `findOne` + single `findOneAndUpdate`).

### 13. Future Sprint Compatibility

- Stage 4 can read `rawCandidateFields.entities` and `strategy` without modification.
- No schema changes block future stages.
- `entityExtractionStrategy` is updated, but Stage 4's confidence formula uses `entityExtractionStrategy` as a penalty factor. If Stage 5 overwrites it to `normalized+ai`, Stage 4's `aiAgreementScore` may treat it as AI-dependent. This is acceptable because Stage 5 DID use AI. **No finding.**

---

## Verdict

### APPROVED WITH FIXES

**1 Medium finding and 1 Low finding** must be resolved before merge:

1. Fix `normalizedSkills` increment to count normalized skills, not total skills
2. Align test count in implementation report with actual test coverage (21 unit tests)

Other findings are recommended but not blocking.

**Next step:** Apply fixes → re-review → merge → tag `v0.5.0`.

---

*Code review completed. No code was modified.*
