# Sprint 4 Code Review
## Resume Parser — ResumeEntityExtractor (Stage 2)

**Date:** 2026-07-25  
**Reviewer:** Kilo  
**Scope:** Sprint 4 implementation only

---

## Executive Summary

Sprint 4 implementation is structurally sound. `ResumeEntityExtractor` is properly stateless, dispatcher orchestration follows the permanent stage-routing pattern, deduplication and confidence rules match the approved plan, and events are published with complete payloads. However, **1 High finding** must be fixed before merge: the `entityExtractionStrategy` value written by the dispatcher does not match the `ResumeParseResult` schema enum, which will cause a runtime Mongoose validation error.

**Verdict:** APPROVED WITH FIXES

---

## Critical Findings

None found.

---

## High Findings

### 1. entityExtractionStrategy Value Mismatch with Mongoose Schema Enum

- **Severity:** High
- **File:** `src/shared/services/knowledgeDispatcher.service.ts:473`
- **Explanation:** The dispatcher writes `entityExtractionStrategy: result.strategy`, where `result.strategy` is typed as `'heuristic' | 'heuristic+ai' | 'ai-only'`. However, `ResumeParseResult` schema defines the field as:
  ```ts
  entityExtractionStrategy: { type: String, required: true, enum: ['regex', 'regex+ner', 'regex+ner+ai', 'ai-only'] }
  ```
  The values `'heuristic'` and `'heuristic+ai'` are not in the enum. When Mongoose attempts to persist the document, it will throw a validation error and the stage will fail.
- **Impact:** Stage 2 will crash on every resume after the first successful extraction. The job will be retried 3 times and then dead-lettered. No entities will ever be persisted.
- **Recommendation:** Either:
  - **Option A:** Update `ResumeParseResult` schema enum to `['heuristic', 'heuristic+ai', 'ai-only']` to match the implementation, OR
  - **Option B:** Change the implementation to write `'regex'` instead of `'heuristic'` and `'regex+ai'` instead of `'heuristic+ai'` to match the existing schema.
  
  Option A is preferred because the entity extractor uses heuristic rules, not regex-only extraction. The plan consistently refers to the strategy as `'heuristic'`, `'heuristic+ai'`, `'ai-only'`.
- **Must fix before merge:** Yes

---

## Medium Findings

### 2. No Validation of AI Response Schema

- **Severity:** Medium
- **File:** `src/services/resume/resumeEntityExtractor.service.ts:540-554`
- **Explanation:** The AI fallback parses the JSON response and filters items by presence of `type` and `confidence`. However, it does not validate that `data` is an object, that `confidence` is within `[0.0, 1.0]`, or that `type` is one of the 8 allowed values. A malformed or adversarial AI response could inject unexpected entity types or invalid confidence values.
- **Impact:** Low in practice because the prompt constrains the AI, but a provider regression or prompt injection could produce invalid data that propagates to `ResumeParseResult`.
- **Recommendation:** Add runtime validation in `invokeAiFallback`:
  ```ts
  const VALID_TYPES = new Set(['person','experience','education','skill','project','certification','achievement','language']);
  const valid = parsed.filter((item: any) => 
    VALID_TYPES.has(item.type) && 
    typeof item.confidence === 'number' && 
    item.confidence >= 0 && 
    item.confidence <= 1 &&
    item.data && typeof item.data === 'object'
  );
  ```
- **Must fix before merge:** No

### 3. Certification Title/Issuer Parsing Edge Case

- **Severity:** Medium
- **File:** `src/services/resume/resumeEntityExtractor.service.ts:382-402`
- **Explanation:** The regex `/(?:from|by|issued by)\s+(.+)/i` matches the first occurrence of "from", "by", or "issued by" in a line. For a line like `"AWS Solutions Architect from Amazon Web Services from 2022"`, it would match `"Amazon Web Services from 2022"` as the issuer instead of `"Amazon Web Services"`. The subsequent `.replace(datePattern, '')` only removes date patterns, not trailing "from" clauses.
- **Impact:** Certification issuer data will be polluted with trailing text in edge cases. Confidence scoring and canonical mapping in Sprint 7 may be affected.
- **Recommendation:** Make the issuer regex non-greedy or anchor it to avoid matching trailing content: `/(?:from|by|issued by)\s+(.+?)(?:\s*\(|\s*from\s+\d{4}|$)/i`
- **Must fix before merge:** No

### 4. Skill Deduplication Key Does Not Handle Skill-Specific Canonical Aliases

- **Severity:** Medium
- **File:** `src/services/resume/resumeEntityExtractor.service.ts:462-470`
- **Explanation:** The plan Section 7.4.2 states: "If a `CanonicalSkill` alias registry is available (future sprint), skills are additionally deduplicated by `canonicalId`." The current implementation deduplicates only by normalized name. While this is acceptable for Sprint 4 (canonical alias registry is a future sprint), the plan documents this as part of the deduplication strategy without indicating it's deferred.
- **Impact:** Skills with different surface forms but same canonical meaning (e.g., "JS" and "JavaScript") will not be deduplicated until Sprint 5+. This is acceptable per the plan but should be explicitly tracked.
- **Recommendation:** Add a `TODO(Sprint-5): Integrate CanonicalSkill alias registry for skill deduplication` comment in the deduplication method.
- **Must fix before merge:** No

---

## Low Findings

### 5. No Minimum Confidence Threshold Enforcement for AI Fallback Entities

- **Severity:** Low
- **File:** `src/services/resume/resumeEntityExtractor.service.ts:545-554`
- **Explanation:** The plan states that entities with `confidence < 0.4` should be excluded. The `invokeAiFallback` method maps AI responses and clamps confidence with `Math.max(0.4, ...)`, which means AI entities are always included even if the AI returned a low confidence. The heuristic path filters with `entities.filter((e) => e.confidence >= 0.4)` before deduplication, but AI entities bypass this filter because they're appended after the filter.
- **Impact:** Low-confidence AI entities may pollute the output. However, the AI prompt instructs the model to only return confident entities, so this is mitigated in practice.
- **Recommendation:** Either filter AI entities by confidence before appending, or trust the AI prompt and document that AI entities are not subject to the 0.4 threshold.
- **Must fix before merge:** No

### 6. Hardcoded Confidence Values for Heuristic Extraction

- **Severity:** Low
- **File:** `src/services/resume/resumeEntityExtractor.service.ts` (multiple methods)
- **Explanation:** Confidence values are hardcoded per entity type (0.9 for name, 0.95 for email, 0.75 for experience, etc.). These values are not configurable and will require code changes to tune. The plan does not specify exact values but implies they should be adjustable.
- **Impact:** Low. Tuning confidence requires code changes, but current values are reasonable starting points.
- **Recommendation:** Extract confidence values to a configuration object or constants file to enable tuning without changing extraction logic.
- **Must fix before merge:** No

### 7. extractExperience Does Not Handle Date-Only Lines

- **Severity:** Low
- **File:** `src/services/resume/resumeEntityExtractor.service.ts:237-242`
- **Explanation:** The date pattern matching runs on every line, including lines that contain only a date range. If a date-only line appears after a title/company line but before bullets, it will be captured correctly. However, if the date appears on a separate line without title/company context, it will be stored in `current` but never emitted as an entity because `tcMatch` won't fire.
- **Impact:** Some date-only lines may be lost. Low impact because dates are usually on the same line as title/company.
- **Must fix before merge:** No

### 8. No Explicit Error Classification in Dispatcher Catch Block

- **Severity:** Low
- **File:** `src/shared/services/knowledgeDispatcher.service.ts:512-539`
- **Explanation:** All errors in `handleResumeEntityExtraction` are published with `reason: 'unknown'`. The plan Section 6.1 defines specific reasons: `'no_sections' | 'ai_exhausted' | 'malformed_response' | 'unknown'`. Currently, only truly unexpected errors reach this block (AI failures are caught inside the extractor), so `'unknown'` is accurate but unhelpful for monitoring.
- **Impact:** Low. Monitoring cannot distinguish between different failure modes.
- **Recommendation:** Add error classification based on error message or type before publishing the failure event.
- **Must fix before merge:** No

---

## Architecture Compliance Verification

| Architecture Requirement | Implementation | Status |
|--------------------------|----------------|--------|
| Stage 2: entity_extraction handler | Implemented | ✅ Compliant |
| Permanent stage routing | `switch(payload.stage)` maintained | ✅ Compliant |
| Stateless extractor | Zero side effects | ✅ Compliant |
| AI fallback (same attempt) | Same method, no queue retry | ✅ Compliant |
| Idempotency | `entitiesExtracted > 0` check | ✅ Compliant |
| Multi-tenant isolation | organizationId preserved | ✅ Compliant |
| Event publication | Both events with full payloads | ✅ Compliant |
| Confidence aggregation boundary | Defined in plan Section 7.4.1 | ✅ Compliant |
| Canonical model mapping | Defined in plan Section 7.2.1 | ✅ Compliant |
| Deduplication strategy | Implemented per plan Section 7.4.2 | ✅ Compliant |

---

## Test Quality Review

| Test Category | Count | Quality |
|---------------|-------|---------|
| Entity type extraction | 8 | Good: covers HEADER, EXPERIENCE, EDUCATION, SKILLS, PROJECTS, CERTIFICATIONS, ACHIEVEMENTS, LANGUAGES |
| Edge cases | 3 | Good: empty input, SUMMARY returns empty, deduplication |
| Confidence | 2 | Good: threshold filtering, reviewStatus assignment |
| AI fallback | 3 | Good: trigger, unavailability, failure |
| Configurable model | 1 | Good |
| MergedFrom metadata | 1 | Good |
| Statelessness | 1 | Good |
| **Total** | **19** | **Good coverage** |

**Missing tests (Low priority):**
- Dispatcher handler integration test
- Malformed AI response handling
- Section priority edge cases in deduplication
- Empty section with non-empty rawText fallback

---

## Scope Control Review

| In-Scope Item | Status |
|---------------|--------|
| ResumeEntityExtractor service | ✅ Implemented |
| ResumeEntity model | ✅ Created |
| 8 entity types | ✅ All implemented |
| Unit tests | ✅ 19 tests |
| Dispatcher handler | ✅ Implemented |
| Event publishing | ✅ Both events |
| AI fallback | ✅ Implemented |
| Idempotency | ✅ Implemented |
| Architecture v1.5 | ✅ Updated |

| Out-of-Scope Item | Status |
|-------------------|--------|
| ResumeAIEnhancer | ✅ Not implemented |
| ResumeConfidenceScorer | ✅ Not implemented |
| DIC integration | ✅ Not implemented |
| Canonical model writes | ✅ Not implemented |
| Frontend changes | ✅ None |
| API changes | ✅ None |

No scope creep detected.

---

## Technical Debt Introduced

| Debt Item | Severity | Remediation Plan |
|-----------|----------|------------------|
| entityExtractionStrategy enum mismatch | High | Fix before merge (or model update) |
| No AI response schema validation | Medium | Add in Sprint 5 or as follow-up |
| Certification issuer regex edge case | Medium | Refine regex in future sprint |
| Hardcoded confidence values | Low | Extract to config in future sprint |
| No dispatcher integration tests | Low | Add in Sprint 5 |

---

## Verdict

### APPROVED WITH FIXES

Sprint 4 implementation is well-structured, maintains statelessness, follows the approved plan, and includes comprehensive tests. **1 High finding must be resolved before merge:**

1. **entityExtractionStrategy enum mismatch** — Update `ResumeParseResult` schema enum to include `'heuristic'` and `'heuristic+ai'`, OR change implementation to write `'regex'`/`'regex+ai'` to match existing schema.

**4 Medium findings** should be addressed but are not blockers:
2. Add AI response schema validation
3. Fix certification issuer regex edge case
4. Add TODO for canonical skill alias integration
5. Classify errors in dispatcher catch block

**4 Low findings** are acceptable for v1.

---

*Review completed. No code was modified.*
