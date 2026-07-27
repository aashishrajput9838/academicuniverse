# Sprint 4 Plan Fix — Evidence Report
## Resume Parser — ResumeEntityExtractor (Stage 2)

**Date:** 2026-07-24  
**Reviewer:** Kilo  
**Scope:** Sprint 4 plan fixes implementation evidence

---

## Evidence 1: Entity → Canonical Model Mapping Added

### Finding Addressed
Plan Review Finding #1 (High): "Entity-to-Canonical Model Mapping Undefined for Sprint 7"

### File and Lines
`backend/SPRINT-4-PLAN.md` — New Section 7.2.1 (lines 295–338)

### Evidence

**New section added after 7.2 Entity Schemas:**
```markdown
### 7.2.1 Entity → Canonical Model Mapping

This table validates that every `ResumeEntity.data` field aligns with an existing canonical model field. Sprint 7 DIC integration and canonical writes depend on this compatibility.

| Entity Type | Canonical Destination | Required Fields Match? | Notes |
|-------------|----------------------|------------------------|-------|
| `person` | `Person` | ✅ `name`, `email`, `phone`, `linkedin`, `github` | `summary` stored in `rawCandidateFields` only |
| `experience` | `ExperienceRecord` | ✅ `title`, `company`, `startDate`, `endDate`, `description` | `current` mapped to `endDate === null` |
| `education` | `AcademicRecord` | ✅ `degree`, `institution`, `startDate`, `endDate` | `gpa` in `rawCandidateFields` only |
| `skill` | `SkillEvidence` + `SkillAlias` + `CanonicalSkill` | ✅ `name` | `category`/`proficiency` in `SkillEvidence.rawCandidateFields` |
| `project` | `CareerRecord` | ✅ `name`, `description` | `techStack` in `rawCandidateFields` only |
| `certification` | `CertificateRecord` | ✅ `title`, `issuer`, `issueDate`, `expiryDate` | `credentialId` in `rawCandidateFields` only |
| `achievement` | *None* | N/A | Stored in `rawCandidateFields.achievements[]` |
| `language` | *None* | N/A | Stored in `rawCandidateFields.languages[]` |
```

**Validation rule added:**
> If Sprint 4 implementation adds a field to any `ResumeEntity.data` shape that does not appear in the corresponding canonical model, it must be documented here as `rawCandidateFields`-only.

**Status:** FIXED

---

## Evidence 2: Confidence Boundary Defined

### Finding Addressed
Plan Review Finding #2 (Medium): "Confidence Boundary Between Per-Entity and Per-Document Not Defined"

### File and Lines
`backend/SPRINT-4-PLAN.md` — New Section 7.4.1 (lines 356–394)

### Evidence

**New section added after 7.4 AI Fallback Trigger:**
```markdown
### 7.4.1 Confidence Aggregation Rule

Minimum per-entity confidence threshold:
- Entities with confidence < 0.4 are excluded from rawCandidateFields entirely.
- Entities with confidence >= 0.4 and < 0.7 are included but flagged reviewStatus: 'pending'.
- Entities with confidence >= 0.7 are included with reviewStatus: 'auto'.

Aggregation formula (Stage 4 input):
entityScore = average(confidence) over all entities with confidence >= 0.4

If no entities meet the threshold, entityScore = 0.0.

Boundary contract:
Stage 2 outputs must include, for every extracted entity:
- confidence: number (0.0–1.0)
- reviewStatus: 'auto' | 'pending'

Stage 4 reads these fields directly. No transformation is performed between stages.
```

**Status:** FIXED

---

## Evidence 3: Entity Deduplication Rules Defined

### Finding Addressed
Plan Review Finding #3 (Medium): "Entity Deduplication Strategy Underspecified"

### File and Lines
`backend/SPRINT-4-PLAN.md` — New Section 7.4.2 (lines 396–436)

### Evidence

**New section added after 7.4.1:**
```markdown
### 7.4.2 Entity Deduplication

Normalization rules:
1. Lowercase all entity names.
2. Trim whitespace from both ends.
3. Remove punctuation: `.`, `,`, `;`, `:`, `-`, `(`, `)`, `[`, `]`, `{`, `}`, `/`, `\`, `|`.
4. Replace multiple spaces with a single space.

Deduplication key: (type, normalized_name)

Merge strategy:
1. Group entities by deduplication key.
2. If a group has exactly one entity, keep it.
3. If a group has multiple entities:
   - Keep the entity with the highest confidence.
   - If confidence ties, prefer the entity from the section with the highest priority.
   - Set mergedFrom: [sourceSection, sourceSection, ...] on the kept entity.

Scope: Global across all sections.

Section priority order (for tie-breaking):
1. HEADER
2. EXPERIENCE
3. EDUCATION
4. PROJECTS
5. SKILLS
6. CERTIFICATIONS
7. ACHIEVEMENTS
8. LANGUAGES
9. SUMMARY
```

**Status:** FIXED

---

## Evidence 4: Event Payload Contracts Defined

### Finding Addressed
Plan Review Finding #4 (Medium): "ResumeEntityExtracted Event Payload Undefined"

### File and Lines
`backend/SPRINT-4-PLAN.md` — New Section 6.1 (lines 144–183)

### Evidence

**New section added before Section 7:**
```markdown
## 6.1 Event Contracts

All resume-stage events use `UaipEventPayload` as the base interface. The following contracts are binding for Sprint 4 implementation and downstream consumers (Sprint 5, Sprint 6, Sprint 7).

### ResumeEntityExtracted

Published when Stage 2 completes successfully.

interface ResumeEntityExtractedPayload extends UaipEventPayload {
  processingId: string;
  entitiesExtracted: number;
  strategy: 'heuristic' | 'heuristic+ai' | 'ai-only';
  aiFallbackUsed: boolean;
  entityTypes: string[];
  confidenceSummary: {
    min: number;
    max: number;
    average: number;
    belowThreshold: number;
  };
  reviewStatus: 'AUTO_APPROVED' | 'PENDING_REVIEW' | 'NEEDS_REINDEX';
  timestamp: Date;
  correlationId?: string;
}

### ResumeEntityExtractionFailed

Published when Stage 2 fails after all retries or encounters a terminal error.

interface ResumeEntityExtractionFailedPayload extends UaipEventPayload {
  processingId: string;
  errorMessage: string;
  reason: 'no_sections' | 'ai_exhausted' | 'malformed_response' | 'unknown';
  timestamp: Date;
  correlationId?: string;
}
```

**Status:** FIXED

---

## Evidence 5: Low Findings Documented

### Finding Addressed
Plan Review Finding #5 (Low): "No Explicit Section Priority for Entity Overlap"
Plan Review Finding #6 (Low): "No Explicit Minimum Per-Entity Confidence Threshold"
Plan Review Finding #7 (Low): "Missing AI Prompt Contract"

### File and Lines
`backend/SPRINT-4-PLAN.md`

### Evidence

**Section priority (Finding #5):**
- Added to Section 7.4.2, lines 424–433
- Explicit priority order: HEADER > EXPERIENCE > EDUCATION > PROJECTS > SKILLS > CERTIFICATIONS > ACHIEVEMENTS > LANGUAGES > SUMMARY

**Minimum threshold (Finding #6):**
- Added to Section 7.4.1, line 378
- `confidence < 0.4` → excluded from output

**AI prompt contract (Finding #7):**
- Added to Section 7.4.3, lines 438–475
- Full prompt template with placeholders
- Expected JSON response schema (`AiEntityResponse` interface)
- Validation rules

**Status:** FIXED

---

## Evidence 6: No Scope Creep

### Files Changed

Only one file modified:
- `backend/SPRINT-4-PLAN.md`

### Changes Are Planning-Only

All additions are documentation:
- Section 6.1: Event payload schemas
- Section 7.2.1: Mapping table
- Section 7.4.1: Confidence rules
- Section 7.4.2: Deduplication rules
- Section 7.4.3: AI prompt template

No production code added. No new services, models, or infrastructure introduced.

### Out-of-Scope Items Guarded

| Item | Evidence |
|------|----------|
| ResumeAIEnhancer | Plan Section 12 still lists: ❌ |
| ResumeConfidenceScorer | Plan Section 12 still lists: ❌ |
| DIC integration | Plan Section 12 still lists: ❌ |
| Canonical model writes | Plan Section 12 still lists: ❌ |
| Frontend changes | Plan Section 12 still lists: ❌ |
| API changes | Plan Section 5 still states: None |

**Status:** NO SCOPE CREEP

---

## Evidence 7: Plan Structure

### Before Fixes

| Section | Title |
|---------|-------|
| 1–6 | Existing |
| 7 | Entity Extraction Strategy |
| 7.1–7.4 | Existing subsections |
| 8–15 | Existing |

### After Fixes

| Section | Title | Status |
|---------|-------|--------|
| 1–6 | Existing | Unchanged |
| 6.1 | Event Contracts | NEW |
| 7 | Entity Extraction Strategy | Unchanged |
| 7.1 | Entity Types | Unchanged |
| 7.2 | Entity Schemas | Unchanged |
| 7.2.1 | Entity → Canonical Model Mapping | NEW |
| 7.3 | Heuristic Rules | Unchanged |
| 7.4 | AI Fallback Trigger | Unchanged |
| 7.4.1 | Confidence Aggregation Rule | NEW |
| 7.4.2 | Entity Deduplication | NEW |
| 7.4.3 | AI Prompt Contract | NEW |
| 8–15 | Existing | Unchanged |

---

## Conclusion

All 7 findings from Sprint 4 Senior Plan Review have been addressed in the planning document. No production code was modified. No scope creep introduced.

**Verdict:** READY FOR PLAN RE-REVIEW

---

*End of Sprint 4 Plan Fix Evidence*
*Generated: 2026-07-24*
