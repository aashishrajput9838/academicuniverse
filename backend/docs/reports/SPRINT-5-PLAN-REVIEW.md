# Sprint 5 Plan Review
## Resume Parser — ResumeAIEnhancer (Stage 3)

**Date:** 2026-07-25  
**Reviewer:** Kilo  
**Scope:** Sprint 5 planning documents only  
**Status:** APPROVED WITH FINDINGS

---

## Executive Summary

Sprint 5 plan is well-structured, aligns with the permanent stage-routing architecture, and maintains stateless service design. However, **3 planning-level findings** must be resolved before implementation to prevent responsibility overlap with Stage 4 and clarify the deduplication boundary.

| Dimension | Verdict |
|-----------|---------|
| Scope correctness | ⚠️ Confidence adjustment overlaps Stage 4 |
| Architecture compliance | ✅ Compliant |
| Stage-3 responsibilities | ⚠️ Needs clearer boundary vs Stage 4 |
| Statelessness requirements | ✅ Compliant |
| AI enhancement flow | ✅ Well-defined |
| AI fallback semantics | ✅ Compliant |
| Confidence adjustment ownership | ⚠️ Overlap with Stage 4 |
| Dispatcher responsibilities | ✅ Clear |
| Event contracts | ✅ Defined |
| Retry semantics | ✅ Compliant |
| Idempotency | ⚠️ Missing schema field |
| Multi-tenant isolation | ✅ Compliant |
| Rollback strategy | ✅ Defined |
| Testing strategy | ✅ Adequate |
| Risks | ✅ Identified |
| Definition of Done | ✅ Complete |
| Scope control | ⚠️ Deduplication contradiction |
| Future Sprint compatibility | ⚠️ Confidence boundary unclear |

**Overall Verdict:** APPROVED WITH FINDINGS

**1 High finding** and **2 Medium findings** must be resolved before implementation.

---

## Critical Findings

None found.

---

## High Findings

### 1. Confidence Score Adjustment Overlaps Stage 4 Responsibility

- **Severity:** High
- **File:** `SPRINT-5-PLAN.md` Sections 1, 5, 8, 13, 15, 16
- **Explanation:** The plan lists "Confidence score adjustment" as in-scope (Section 2), describes recomputing confidence after enhancement (Section 5), includes before/after confidence summaries in the event payload (Section 8), and lists "Scores recomputed after enhancement" as a test target (Section 13). However:
  1. Architecture v1.5 Section 3 explicitly defines Stage 4 (`ResumeConfidenceScorer`) as the component responsible for "Per-field confidence" and "Document aggregate confidence"
  2. The plan explicitly lists `ResumeConfidenceScorer` as out-of-scope (Section 2)
  3. The architecture confidence formula (Section 4) is defined as belonging to Stage 4
  
  This creates a responsibility overlap: Stage 5 will adjust confidence scores, but Stage 6 is defined as the component that computes document-level confidence. The boundary between "enhancement-adjusted confidence" and "final document confidence" is undefined.
- **Impact:** When Stage 6 is implemented, it will need to decide whether to trust Stage 5's adjusted confidence or recompute from scratch. Without a clear boundary, Stage 6 may double-adjust or ignore Stage 5 adjustments, leading to inconsistent confidence scores.
- **Recommendation:** Clarify in the plan:
  1. Stage 5 may adjust per-entity confidence as a *hint* or *proposal*, but the final document-level `confidenceScore` belongs to Stage 6
  2. Define the exact fields Stage 5 writes vs Stage 6 computes
  3. Update event payload to distinguish between "enhancement confidence" and "final document confidence"
  
  Alternatively, remove "Confidence score adjustment" from Stage 5 scope and defer it to Stage 6 entirely, keeping Stage 5 focused on normalization and enrichment only.
- **Must fix before implementation:** Yes

---

## Medium Findings

### 2. Deduplication Contradiction: In-Scope vs Out-of-Scope

- **Severity:** Medium
- **File:** `SPRINT-5-PLAN.md` Sections 2 and 5
- **Explanation:** 
  - Section 2 (Out of Scope) explicitly states: "Entity deduplication (already done in Stage 2)"
  - Section 5 (AI Enhancement Flow) states: "After all entities processed: Deduplicate again (AI may introduce new overlaps)"
  
  These two statements contradict each other. If deduplication is already done in Stage 2 and is out of scope for Stage 5, then the flow should not include a second deduplication step. If AI enhancement can introduce new overlaps that require deduplication, then deduplication must be in scope for Stage 5.
- **Impact:** Implementation team will be uncertain whether to implement deduplication in Stage 5. If they skip it, AI-introduced duplicates will persist. If they implement it, they're adding functionality that the plan says is out of scope.
- **Recommendation:** Decide and document explicitly:
  - **Option A:** Keep deduplication in Stage 5 scope. Remove it from "Out of Scope" list. Document that Stage 5 performs a second deduplication pass after AI enhancement.
  - **Option B:** Keep deduplication in Stage 2 only. Stage 5 does not deduplicate. Document that AI enhancement may introduce duplicates, and Stage 6 (or downstream) handles them.
  
  Option A is recommended because AI enhancement can legitimately create new duplicate entities that need cleanup before Stage 6.
- **Must fix before implementation:** Yes

### 3. Idempotency Field `aiEnhanced` Not in ResumeParseResult Schema

- **Severity:** Medium
- **File:** `SPRINT-5-PLAN.md` Section 9
- **Explanation:** The plan states: "Stage checks `ResumeParseResult.aiEnhanced` for idempotency; if already set, skip recomputation." However, `ResumeParseResult` model (`src/models/ResumeParseResult.ts`) does not have an `aiEnhanced` field. Current fields include `sectionsDetected`, `entitiesExtracted`, `normalizedSkills`, `sectionDetectionStrategy`, `entityExtractionStrategy`, etc., but no `aiEnhanced`.
- **Impact:** Implementation will either need to:
  1. Add a new field to `ResumeParseResult` schema (requires migration)
  2. Reuse an existing field (e.g., `entityExtractionStrategy` could be checked, but it's not semantically correct)
  3. Implement idempotency without a schema change (e.g., check if enhanced entities exist in `rawCandidateFields`)
  
  Without clarification, the implementation may introduce an unplanned schema change or incorrect idempotency logic.
- **Recommendation:** Either:
  - Add `aiEnhanced: Boolean` to `ResumeParseResult` schema in the plan's "Files to Modify" section, OR
  - Change idempotency check to use existing fields (e.g., check if `rawCandidateFields.entities` already have `extractedBy: 'ai'` marker), OR
  - Document that idempotency is implemented via a different mechanism
- **Must fix before implementation:** No

---

## Low Findings

### 4. Event Payload `strategy` Values Not Aligned with Implementation

- **Severity:** Low
- **File:** `SPRINT-5-PLAN.md` Section 8
- **Explanation:** The event payload defines `strategy: 'normalized' | 'normalized+ai' | 'ai-only'`. However, the implementation will likely write `strategy` to `ResumeParseResult` as well. The plan does not specify whether this field is added to the schema or reuses an existing field.
- **Impact:** Minor — implementation team will need to decide schema field name.
- **Recommendation:** Document the exact `ResumeParseResult` field name for Stage 3 strategy (e.g., `aiEnhancementStrategy`).
- **Must fix before implementation:** No

### 5. No Minimum Confidence Threshold for AI Enhancement Trigger

- **Severity:** Low
- **File:** `SPRINT-5-PLAN.md` Section 7
- **Explanation:** The plan lists trigger conditions but does not specify a minimum confidence threshold for when to apply normalization-only vs AI enhancement. For example, if an entity has confidence 0.75 (above the 0.7 threshold), should it still be enhanced?
- **Impact:** Minor — implementation may over-invoke AI for entities that only need minor normalization.
- **Recommendation:** Specify that normalization is always applied, but AI enhancement is triggered only when `confidence < 0.85` or critical fields are missing.
- **Must fix before implementation:** No

---

## Architecture Compliance Verification

| Architecture Requirement | Plan Status | Evidence |
|--------------------------|-------------|----------|
| Stage 3: ai_enhancement handler | ✅ Planned | Section 12 |
| Permanent stage routing | ✅ Planned | `switch(payload.stage)` maintained |
| Stateless enhancer | ✅ Planned | Section 3 |
| AI fallback (same attempt) | ✅ Planned | Section 7 |
| Multi-tenant isolation | ✅ Planned | Section 10 |
| Event publication | ✅ Planned | Section 8 |
| Deduplication | ⚠️ Contradiction | Sections 2 vs 5 |
| Confidence ownership | ⚠️ Overlap | Sections 1, 5, 8 vs Architecture Section 4 |

---

## Scope Control Review

| In-Scope Item | Status |
|---------------|--------|
| ResumeAIEnhancer service | ✅ Planned |
| 8 entity type enhancements | ✅ Planned |
| Normalization rules | ✅ Planned |
| AI fallback | ✅ Planned |
| Dispatcher handler | ✅ Planned |
| Events | ✅ Planned |
| Idempotency | ⚠️ Needs schema clarification |
| Tests (12+) | ✅ Planned |

| Out-of-Scope Item | Status |
|-------------------|--------|
| ResumeConfidenceScorer | ✅ Guarded |
| DIC integration | ✅ Guarded |
| Canonical model writes | ✅ Guarded |
| Frontend changes | ✅ Guarded |
| API changes | ✅ Guarded |
| Entity deduplication | ⚠️ Contradiction with Section 5 |

No scope creep detected beyond the deduplication contradiction.

---

## Special Focus Questions

### Q1: Is confidence ownership clearly defined between Stage 3 and Stage 4?

**Answer:** No. The plan assigns confidence adjustment to Stage 3, but the architecture assigns document-level confidence scoring to Stage 4. The boundary is undefined. **Finding #1 (High).**

### Q2: Is deduplication consistent across stages?

**Answer:** No. Stage 2 owns deduplication per the out-of-scope list, but Stage 3's flow includes a second deduplication pass. **Finding #2 (Medium).**

### Q3: Are event payloads aligned with existing reviewStatus enums?

**Answer:** Yes. `AUTO_APPROVED`, `PENDING_REVIEW`, `NEEDS_REINDEX` match the existing `ResumeParseResult.reviewStatus` enum exactly.

---

## Verdict

### APPROVED WITH FINDINGS

Sprint 5 plan is structurally sound and follows established patterns. However, **3 findings** must be resolved before implementation:

**1 High finding:**
1. Clarify confidence ownership between Stage 3 and Stage 4 — either remove confidence adjustment from Stage 5 scope, or define a clear boundary/adjustment proposal mechanism

**2 Medium findings:**
2. Resolve deduplication contradiction — decide if Stage 5 includes a second deduplication pass
3. Clarify idempotency mechanism — either add `aiEnhanced` field to schema or document alternative approach

**Next step:** Plan fixes → Plan re-review → Plan freeze → Implementation.

---

*Review completed. No code was modified.*
