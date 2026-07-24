# Sprint 4 Plan Review
## Resume Parser — ResumeEntityExtractor (Stage 2)

**Date:** 2026-07-24  
**Reviewer:** Kilo  
**Scope:** Sprint 4 planning documents only  
**Status:** APPROVED WITH FINDINGS

---

## Executive Summary

Sprint 4 plan is structurally sound, aligns with the permanent stage-routing architecture, and maintains the disciplined patterns established in Sprints 1–3. Scope is well-controlled with explicit out-of-scope guardrails. However, **4 planning-level findings** must be resolved before implementation begins to prevent downstream ambiguity in Sprint 7 canonical writes, Sprint 5/6 downstream consumption, and runtime deduplication correctness.

| Dimension | Verdict |
|-----------|---------|
| Architecture alignment | ✅ Compliant |
| Stage routing compatibility | ✅ Compliant |
| ResumeEntityExtractor responsibilities | ✅ Clear |
| Statelessness | ✅ Compliant |
| Entity schema design | ⚠️ Adequate but missing canonical mapping |
| AI fallback semantics | ✅ Compliant |
| Retry semantics | ✅ Compliant |
| Idempotency | ✅ Compliant |
| Multi-tenant isolation | ✅ Compliant |
| Event-driven architecture | ⚠️ Events defined but payloads incomplete |
| Error handling | ✅ Compliant |
| Test strategy | ✅ Adequate |
| Performance targets | ✅ Defined |
| Maintainability | ✅ Clean |
| Scope control | ✅ Strong |
| Production readiness | N/A — planning phase |

**Overall Verdict:** APPROVED WITH FINDINGS

**1 High finding** and **3 Medium findings** must be resolved before implementation.

---

## Critical Findings

None found.

---

## High Findings

### 1. Entity-to-Canonical Model Mapping Undefined for Sprint 7

- **Severity:** High
- **File:** `SPRINT-4-PLAN.md` Section 7.2 + `RESUME-PARSER-ARCHITECTURE.md` Section 5.1
- **Explanation:** The architecture document (v1.4, Section 5.1) already defines the canonical mapping:
  - `Person` ← HEADER entities
  - `ExperienceRecord` ← EXPERIENCE entries
  - `AcademicRecord` ← EDUCATION entries
  - `SkillEvidence` + `SkillAlias` + `CanonicalSkill` ← SKILLS
  - `CertificateRecord` ← CERTIFICATIONS entries
  - `CareerRecord` ← PROJECTS entries

  However, the Sprint 4 plan does not reference this mapping, does not verify that the planned entity schemas are compatible with these canonical models, and does not include a mapping table. If Sprint 4 entities are designed without Sprint 7 constraints, later canonical writes will require schema migrations or field transformations.
- **Impact:** When Sprint 7 implements DIC integration + canonical writes, mismatches between `ResumeEntity.data` fields and canonical model fields will require adapter logic or data loss.
- **Recommendation:** Add a canonical-mapping validation section to Sprint 4 plan:
  ```
  Entity Type    Canonical Model       Required Fields Match?
  person         Person                name, email, phone, linkedin, github
  experience     ExperienceRecord      title, company, startDate, endDate, description
  education      AcademicRecord        degree, institution, startDate, endDate
  skill          SkillEvidence + SkillAlias + CanonicalSkill  name, category, proficiency
  project        CareerRecord          name, description, techStack
  certification  CertificateRecord     title, issuer, issueDate, expiryDate
  achievement    (no direct canonical)  title, description, date
  language       (no direct canonical)  name, proficiency
  ```
  For types without canonical models (achievement, language), document where they will be stored or if they remain in `rawCandidateFields` only.
- **Must fix before implementation:** Yes

---

## Medium Findings

### 2. Confidence Boundary Between Per-Entity and Per-Document Not Defined

- **Severity:** Medium
- **File:** `SPRINT-4-PLAN.md` Section 7.4 + `RESUME-PARSER-ARCHITECTURE.md` Section 4
- **Explanation:** The plan defines confidence per entity (0.7–0.9 heuristic, 0.5–0.7 AI fallback) and the architecture defines document-level confidence scoring in Stage 4 (`ResumeConfidenceScorer`). However, there is no explicit boundary or aggregation rule:
  - If 20 entities are extracted and 5 have confidence < 0.6, does the document score drop below `PENDING_REVIEW`?
  - How does `entityScore` in the confidence formula account for per-entity confidence values?
  - What is the minimum acceptable per-entity confidence before an entity is included in `rawCandidateFields` at all?
  
  The architecture (Section 4.2) defines penalty caps but assumes `entityScore` is already computed. The plan does not specify how Stage 2 outputs feed Stage 4 inputs.
- **Impact:** Sprint 6 (`ResumeConfidenceScorer`) will need to reverse-engineer per-entity confidence aggregation rules. Without explicit definitions, scoring may be inconsistent or arbitrary.
- **Recommendation:** Define in the plan:
  1. Minimum per-entity confidence threshold for inclusion (e.g., `>= 0.4`)
  2. Entity-to-entityScore aggregation formula (e.g., weighted average by entity type, or simple average)
  3. Mapping between Stage 2 output fields and Stage 4 input fields
- **Must fix before implementation:** No

### 3. Entity Deduplication Strategy Underspecified

- **Severity:** Medium
- **File:** `SPRINT-4-PLAN.md` Section 7.3 + Section 15
- **Explanation:** The risk table mentions "Deduplication by normalized name + section priority" but the implementation strategy does not specify:
  - What normalization rules apply (case folding, whitespace, punctuation)?
  - What is the priority order when the same entity appears in multiple sections (e.g., "Python" in SKILLS and "Python" in PROJECTS tech stack)?
  - Are duplicate entities merged, deduped, or kept with a `duplicateOf` reference?
  - Does deduplication happen per-section or globally across all sections?
  - What is the deduplication key (entity name, normalized name, type + name)?
- **Impact:** Without explicit rules, implementation may produce duplicate entries in `rawCandidateFields`, causing confusion in DIC review and incorrect entity counts in confidence scoring.
- **Recommendation:** Add a deduplication subsection to Section 7.3:
  ```
  ### 7.3.1 Entity Deduplication

  After all sections are processed:
  1. Normalize entity names: lowercase, trim whitespace, remove punctuation.
  2. Group entities by (type, normalized name).
  3. If duplicates found:
     - Keep the entity with highest confidence.
     - If confidence ties, prefer the entity from the earlier section in document order.
     - Mark merged entities with `mergedFrom: [sourceSection, sourceSection]`.
  4. Skill-specific: also deduplicate by canonical skill alias if available.
  ```
- **Must fix before implementation:** No

### 4. ResumeEntityExtracted Event Payload Undefined

- **Severity:** Medium
- **File:** `SPRINT-4-PLAN.md` Section 6, Section 1
- **Explanation:** The plan states that the dispatcher publishes `ResumeEntityExtracted` or `ResumeEntityExtractionFailed`, but does not define the payload structure for either event. Downstream stages (Sprint 5 AI enhancement, Sprint 6 confidence scoring) and the DIC integration (Sprint 7) will consume these events. Without a payload contract:
  - Sprint 5/6 implementers will guess required fields
  - Event consumers may break if payload shape changes
  - No way to verify completeness in testing
- **Impact:** Ambiguous event contracts cause integration bugs between stages that are only discovered during implementation of downstream stages.
- **Recommendation:** Add explicit event payload definitions to Section 6 or a new Section 6.1:
  ```ts
  // ResumeEntityExtracted
  {
    processingId: string;
    entitiesExtracted: number;
    strategy: 'heuristic' | 'heuristic+ai' | 'ai-only';
    aiFallbackUsed: boolean;
    entityTypes: string[];        // e.g., ['person', 'experience', 'education', 'skill']
    confidenceSummary: {
      min: number;
      max: number;
      average: number;
      belowThreshold: number;     // count with confidence < 0.5
    };
    reviewStatus: 'AUTO_APPROVED' | 'PENDING_REVIEW' | 'NEEDS_REINDEX';
    timestamp: Date;
    correlationId?: string;
  }

  // ResumeEntityExtractionFailed
  {
    processingId: string;
    errorMessage: string;
    reason: 'no_sections' | 'ai_exhausted' | 'malformed_response' | 'unknown';
    timestamp: Date;
    correlationId?: string;
  }
  ```
- **Must fix before implementation:** No

---

## Low Findings

### 5. No Explicit Section Priority for Entity Overlap

- **Severity:** Low
- **File:** `SPRINT-4-PLAN.md` Section 7.3
- **Explanation:** The risk table mentions "section priority" for deduplication but no priority order is defined (e.g., does EXPERIENCE take precedence over PROJECTS for overlapping entities?).
- **Impact:** Minor; deduplication tie-breaking may vary across implementations.
- **Recommendation:** Define section priority order in the deduplication rules (e.g., HEADER > EXPERIENCE > EDUCATION > PROJECTS > SKILLS > CERTIFICATIONS > ACHIEVEMENTS > LANGUAGES > SUMMARY).
- **Must fix before implementation:** No

### 6. No Explicit Minimum Per-Entity Confidence Threshold

- **Severity:** Low
- **File:** `SPRINT-4-PLAN.md` Section 7.4
- **Explanation:** Heuristic confidence ranges (0.7–0.9) and AI fallback ranges (0.5–0.7) are defined, but no minimum threshold is specified for including an entity in the output. An entity with confidence 0.1 would still be included.
- **Impact:** Low-confidence noise may pollute `rawCandidateFields`, causing false positives in downstream confidence scoring.
- **Recommendation:** Specify a minimum inclusion threshold (e.g., `>= 0.4`) or route entities below threshold to a `lowConfidence` bucket rather than the main output.
- **Must fix before implementation:** No

### 7. Missing AI Prompt Contract

- **Severity:** Low
- **File:** `SPRINT-4-PLAN.md` Section 7.4
- **Explanation:** The plan mentions AI fallback prompt includes section text, expected entity types, and existing entities, but does not specify the exact prompt template or JSON output schema expected from the AI.
- **Impact:** Implementation may produce inconsistent AI responses across models or providers.
- **Recommendation:** Add a sample prompt template and expected JSON response structure to Section 7.4.
- **Must fix before implementation:** No

---

## Architecture Compliance Verification

| Architecture Requirement | Plan Status | Evidence |
|--------------------------|-------------|----------|
| Stage 2: entity_extraction handler | ✅ Planned | Section 4, 6 |
| Permanent stage routing | ✅ Planned | `switch(payload.stage)` maintained |
| Stateless extractor | ✅ Planned | Section 7 header |
| AI fallback (same attempt) | ✅ Planned | Section 7.4 |
| Idempotency | ✅ Planned | Section 10, Plan DoD #6 |
| Multi-tenant isolation | ✅ Planned | Section 9 |
| Event publication | ⚠️ Events named, payloads undefined | Section 1, 6 |
| Confidence aggregation boundary | ⚠️ Not defined | Section 7.4 vs Architecture Section 4 |
| Canonical model mapping | ⚠️ Not validated | Architecture Section 5.1 vs Plan Section 7.2 |
| Deduplication strategy | ⚠️ Mentioned but underspecified | Section 7.3, 15 |

---

## Scope Control Review

| In-Scope Item | Status |
|---------------|--------|
| ResumeEntityExtractor service | ✅ Planned |
| ResumeEntity interface | ✅ Planned |
| 8 entity types | ✅ Planned |
| Unit tests (12+) | ✅ Planned |
| Integration tests | ✅ Planned |
| KnowledgeDispatcher handler | ✅ Planned |
| Event publishing | ⚠️ Names defined, payloads missing |
| AI fallback | ✅ Planned |
| Idempotency | ✅ Planned |

| Out-of-Scope Item | Status |
|-------------------|--------|
| ResumeAIEnhancer | ✅ Guarded |
| ResumeConfidenceScorer | ✅ Guarded |
| DIC integration | ✅ Guarded |
| Canonical model writes | ✅ Guarded |
| Frontend changes | ✅ Guarded |
| API changes | ✅ Guarded |
| NER model training | ✅ Guarded |

No scope creep detected.

---

## Support for Special Focus Questions

### Q1: Is ResumeEntity schema sufficient for Sprint 7 canonical writes?

**Answer:** Schema shapes are broadly compatible with existing canonical models (`Person`, `ExperienceRecord`, `AcademicRecord`, `SkillEvidence`, `CertificateRecord`, `CareerRecord`), but the plan does not explicitly validate this mapping. **Finding #1 (High)** addresses this gap.

### Q2: Is there a clear boundary between confidence per entity and overall document confidence?

**Answer:** No. The plan defines per-entity confidence but does not define how these aggregate into the document-level `confidenceScore` that Stage 4 computes. **Finding #2 (Medium)** addresses this gap.

### Q3: Is entity deduplication strategy specified enough?

**Answer:** No. The risk table mentions deduplication conceptually but no normalization rules, merge strategy, or priority order are defined. **Finding #3 (Medium)** addresses this gap.

### Q4: Is ResumeEntityExtracted event payload complete for downstream stages?

**Answer:** No. Event names are defined but payload fields are not specified. Sprint 5/6 implementers will have no contract to build against. **Finding #4 (Medium)** addresses this gap.

---

## Verdict

### APPROVED WITH FINDINGS

Sprint 4 plan is ready for implementation pending resolution of:

**1 High finding:**
1. Add entity-to-canonical model mapping validation table

**3 Medium findings:**
2. Define confidence boundary between per-entity and per-document scoring
3. Specify entity deduplication rules (normalization, priority, merge strategy)
4. Define event payload contracts for `ResumeEntityExtracted` and `ResumeEntityExtractionFailed`

**Next step:** Plan fixes → Plan freeze → Implementation.

---

*Review completed. No code was modified.*
