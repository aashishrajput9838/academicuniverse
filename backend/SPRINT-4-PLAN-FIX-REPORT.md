# Sprint 4 Plan Fix Report
## Resume Parser — ResumeEntityExtractor (Stage 2)

**Date:** 2026-07-24  
**Sprint:** 4 of 7  
**Status:** PLAN FIXES IMPLEMENTED — READY FOR PLAN RE-REVIEW

---

## 1. Summary

Implemented all mandatory (High) and strongly recommended (Medium) fixes from Sprint 4 Senior Plan Review. Low findings also documented.

**Verdict:** READY FOR PLAN RE-REVIEW

---

## 2. Files Changed

| File | Action | Description |
|------|--------|-------------|
| `backend/SPRINT-4-PLAN.md` | MODIFY | Added 4 new sections + updated existing sections |

---

## 3. Fixes Implemented

### 3.1 Entity → Canonical Model Mapping [HIGH — Mandatory]

**File:** `backend/SPRINT-4-PLAN.md` — New Section 7.2.1

**Added:** Validation table mapping every entity type to its Sprint 7 canonical destination:

| Entity Type | Canonical Destination | Required Fields Match? | Notes |
|-------------|----------------------|------------------------|-------|
| `person` | `Person` | ✅ | `summary` stored in `rawCandidateFields` only |
| `experience` | `ExperienceRecord` | ✅ | `current` mapped to `endDate === null` |
| `education` | `AcademicRecord` | ✅ | `gpa` stored in `rawCandidateFields` only |
| `skill` | `SkillEvidence` + `SkillAlias` + `CanonicalSkill` | ✅ | `category`/`proficiency` in `SkillEvidence.rawCandidateFields` |
| `project` | `CareerRecord` | ✅ | `techStack` in `rawCandidateFields` only |
| `certification` | `CertificateRecord` | ✅ | `credentialId` in `rawCandidateFields` only |
| `achievement` | *None* | N/A | No canonical model; stored in `rawCandidateFields.achievements[]` |
| `language` | *None* | N/A | No canonical model; stored in `rawCandidateFields.languages[]` |

**Validation rule added:** Any new field added to `ResumeEntity.data` that does not exist in the corresponding canonical model must be documented as `rawCandidateFields`-only.

### 3.2 Confidence Boundary Definition [MEDIUM — Strongly Recommended]

**File:** `backend/SPRINT-4-PLAN.md` — New Section 7.4.1

**Added:**
- Minimum per-entity confidence threshold: `>= 0.4` for inclusion
- Review status gating:
  - `confidence >= 0.7` → `reviewStatus: 'auto'`
  - `0.4 <= confidence < 0.7` → `reviewStatus: 'pending'`
  - `confidence < 0.4` → excluded from output
- Aggregation formula for Stage 4:
  ```
  entityScore = average(confidence) over all entities with confidence >= 0.4
  ```
- Boundary contract: Stage 2 outputs `confidence` and `reviewStatus` directly; Stage 4 reads without transformation.

### 3.3 Entity Deduplication Rules [MEDIUM — Strongly Recommended]

**File:** `backend/SPRINT-4-PLAN.md` — New Section 7.4.2

**Added:**
- Normalization rules (lowercase, trim, remove punctuation, collapse spaces)
- Deduplication key: `(type, normalized_name)`
- Merge strategy: keep highest confidence; tie-break by section priority
- Scope: global across all sections
- Section priority order: HEADER > EXPERIENCE > EDUCATION > PROJECTS > SKILLS > CERTIFICATIONS > ACHIEVEMENTS > LANGUAGES > SUMMARY
- Skill-specific: additional dedup by `canonicalId` when alias registry available
- `mergedFrom` metadata on kept entity

### 3.4 Event Payload Contracts [MEDIUM — Strongly Recommended]

**File:** `backend/SPRINT-4-PLAN.md` — New Section 6.1

**Added:**
- `ResumeEntityExtractedPayload` with full TypeScript interface
- `ResumeEntityExtractionFailedPayload` with full TypeScript interface
- Required fields for both events
- Confidence summary structure (`min`, `max`, `average`, `belowThreshold`)
- `correlationId` field included
- Binding note for downstream consumers

### 3.5 Low Findings Documented

**File:** `backend/SPRINT-4-PLAN.md` — Section 7.4.3

**Added:**
- AI prompt template with exact format
- Expected JSON response schema (`AiEntityResponse` interface)
- Validation rules for AI response parsing

**File:** `backend/SPRINT-4-PLAN.md` — Section 7.4.2 (Deduplication)

**Added:**
- Section priority order (tie-breaking for deduplication)

**File:** `backend/SPRINT-4-PLAN.md` — Section 7.4.1 (Confidence)

**Added:**
- Minimum inclusion threshold (`>= 0.4`)

---

## 4. Findings Resolution Status

| Finding | Severity | Status | Evidence |
|---------|----------|--------|----------|
| Entity-to-canonical mapping undefined | HIGH | FIXED | Section 7.2.1 added |
| Confidence boundary undefined | MEDIUM | FIXED | Section 7.4.1 added |
| Entity deduplication underspecified | MEDIUM | FIXED | Section 7.4.2 added |
| Event payloads undefined | MEDIUM | FIXED | Section 6.1 added |
| Section priority undefined | LOW | FIXED | Section 7.4.2 added |
| Minimum confidence threshold missing | LOW | FIXED | Section 7.4.1 added |
| AI prompt contract missing | LOW | FIXED | Section 7.4.3 added |

---

## 5. Plan Structure After Fixes

| Section | Title | Status |
|---------|-------|--------|
| 1 | Sprint Goal | Existing |
| 2 | Existing Code to Reuse | Existing |
| 3 | Files to Create | Existing |
| 4 | Files to Modify | Existing |
| 5 | Public API Changes | Existing |
| 6 | Data Flow | Existing |
| 6.1 | Event Contracts | **NEW** |
| 7 | Entity Extraction Strategy | Existing |
| 7.1 | Entity Types | Existing |
| 7.2 | Entity Schemas | Existing |
| 7.2.1 | Entity → Canonical Model Mapping | **NEW** |
| 7.3 | Heuristic Rules | Existing |
| 7.4 | AI Fallback Trigger | Existing |
| 7.4.1 | Confidence Aggregation Rule | **NEW** |
| 7.4.2 | Entity Deduplication | **NEW** |
| 7.4.3 | AI Prompt Contract | **NEW** |
| 8 | Error Handling | Existing |
| 9 | Multi-Tenant Safety | Existing |
| 10 | Test Plan | Existing |
| 11 | Definition of Done | Existing |
| 12 | Out-of-Scope Guardrails | Existing |
| 13 | Dependencies | Existing |
| 14 | Architecture Baseline | Existing |
| 15 | Risk Assessment | Existing |

---

## 6. Verification

### No Code Modified

Only `backend/SPRINT-4-PLAN.md` was updated. No production code changed. No test files changed.

### No Scope Creep

All additions are planning/documentation artifacts:
- Mapping table (documentation)
- Confidence rules (planning)
- Deduplication rules (planning)
- Event contracts (planning)
- AI prompt template (planning)

No new services, models, or infrastructure added.

---

## 7. Verdict

### READY FOR PLAN RE-REVIEW

All High and Medium findings from Sprint 4 Senior Plan Review have been resolved in the planning document.

---

*End of Sprint 4 Plan Fix Report*
*Generated: 2026-07-24*
