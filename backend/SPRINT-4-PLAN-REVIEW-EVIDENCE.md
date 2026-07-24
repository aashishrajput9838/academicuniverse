# Sprint 4 Plan Review — Evidence Report
## Resume Parser — ResumeEntityExtractor (Stage 2)

**Date:** 2026-07-24  
**Reviewer:** Kilo  
**Scope:** Sprint 4 planning documents review evidence

---

## Evidence 1: Entity-to-Canonical Model Mapping Undefined

### Finding
Code Review Finding #1 (High): "Entity-to-Canonical Model Mapping Undefined for Sprint 7"

### File References
- `SPRINT-4-PLAN.md` Section 7.2
- `RESUME-PARSER-ARCHITECTURE.md` Section 5.1

### Evidence

**Architecture v1.4 already defines the mapping (Section 5.1):**
```markdown
| Section field | Canonical collection | Existing model |
|---------------|---------------------|----------------|
| sections[HEADER].entities | Person | Person |
| sections[EXPERIENCE].entries | ExperienceRecord | ExperienceRecord |
| sections[EDUCATION].entries | AcademicRecord | AcademicRecord |
| sections[SKILLS].normalizedSkills | SkillEvidence + SkillAlias | SkillEvidence, SkillAlias, CanonicalSkill |
| sections[CERTIFICATIONS].entries | CertificateRecord | CertificateRecord |
| sections[PROJECTS].entries | CareerRecord | CareerRecord |
```

**Sprint 4 Plan Section 7.2 defines entity schemas:**
- Person: `name`, `email?`, `phone?`, `linkedin?`, `github?`, `summary?`
- Experience: `title`, `company`, `startDate?`, `endDate?`, `current`, `description`, `bullets[]`, `confidence`
- Education: `degree`, `institution`, `field?`, `startDate?`, `endDate?`, `gpa?`, `confidence`
- Skill: `name`, `category?`, `proficiency?`, `confidence`
- Project: `name`, `description`, `techStack[]`, `url?`, `confidence`
- Certification: `title`, `issuer`, `issueDate?`, `expiryDate?`, `credentialId?`, `confidence`
- Achievement: `title`, `description`, `date?`, `confidence`
- Language: `name`, `proficiency?`, `confidence`

**Gap:**
- Sprint 4 plan does NOT reference the architecture's canonical mapping table
- No validation that `ResumeEntity.data` fields match canonical model fields
- No documentation of where `achievement` and `language` entities will be stored in Sprint 7 (no canonical models exist for them)
- Plan does not include a mapping table

**Impact:**
- If Sprint 4 entity schemas drift from canonical model field names, Sprint 7 will require field adapters or data migration
- Achievement and language entities have no canonical destination; their fate is undefined

**Recommendation:** Add mapping validation table to plan as described in review finding.

---

## Evidence 2: Confidence Boundary Undefined

### Finding
Code Review Finding #2 (Medium): "Confidence Boundary Between Per-Entity and Per-Document Not Defined"

### File References
- `SPRINT-4-PLAN.md` Section 7.4
- `RESUME-PARSER-ARCHITECTURE.md` Section 4

### Evidence

**Plan Section 7.4 defines per-entity confidence:**
```
- heuristic match: 0.7-0.9
- AI fallback: 0.5-0.7
- low-confidence: flag for manual review
```

**Architecture Section 4 defines document-level scoring:**
```
rawScore = (sectionScore * 0.30) +
           (entityScore   * 0.25) +
           (formatScore   * 0.20) +
           (aiAgreementScore * 0.15) +
           (consistencyScore * 0.10)
```

**Gap:**
- No formula for computing `entityScore` from per-entity confidence values
- No minimum per-entity confidence threshold for inclusion in output
- No explanation of how Stage 2 outputs feed Stage 4 inputs
- No aggregation rule (average, weighted, min, etc.)

**Impact:**
- Sprint 6 implementer will need to reverse-engineer entity-to-document confidence mapping
- Scoring may be inconsistent or arbitrary without explicit rules

**Recommendation:** Define:
1. Minimum per-entity confidence threshold (e.g., `>= 0.4`)
2. Entity-to-entityScore aggregation formula
3. Mapping between Stage 2 output and Stage 4 input fields

---

## Evidence 3: Entity Deduplication Strategy Underspecified

### Finding
Code Review Finding #3 (Medium): "Entity Deduplication Strategy Underspecified"

### File References
- `SPRINT-4-PLAN.md` Section 7.3, Section 15

### Evidence

**Risk table (Section 15) mentions deduplication:**
```markdown
| Entity overlap (e.g., skill in project description) | Medium | Medium | Deduplication by normalized name + section priority |
```

**Section 7.3 heuristic rules do NOT mention deduplication:**
- Person extraction rules: 5 bullet points, no dedup
- Experience extraction rules: 4 bullet points, no dedup
- Education extraction rules: 4 bullet points, no dedup
- Skill extraction rules: 4 bullet points, mentions "deduplicate and normalize casing"
- Project extraction rules: 3 bullet points, no dedup
- Certification extraction rules: 3 bullet points, no dedup
- Achievement extraction rules: 2 bullet points, no dedup
- Language extraction rules: 2 bullet points, no dedup

**Gap:**
- No normalization rules specified (case folding, whitespace, punctuation)
- No section priority order defined
- No merge strategy (keep highest confidence, keep first, keep all with reference)
- No deduplication key definition
- No global vs per-section deduplication scope

**Impact:**
- Same skill appearing in SKILLS section and PROJECTS tech stack will be stored twice
- Same person name in HEADER and SUMMARY will be stored twice
- Entity counts inflated, affecting confidence scoring

**Recommendation:** Add Section 7.3.1 with explicit deduplication rules.

---

## Evidence 4: ResumeEntityExtracted Event Payload Undefined

### Finding
Code Review Finding #4 (Medium): "ResumeEntityExtracted Event Payload Undefined"

### File References
- `SPRINT-4-PLAN.md` Section 1, Section 6

### Evidence

**Plan Section 1 mentions events:**
```markdown
Events:
ResumeEntityExtracted
ResumeEntityExtractionFailed
```

**Plan Section 6 data flow mentions publishing:**
```markdown
5. Publish ResumeEntityExtracted (success) or ResumeEntityExtractionFailed (failure)
```

**No payload definition exists anywhere in the plan.**

**Compare with existing event patterns in codebase:**
- `ResumeSectionDetected` payload defined in `SPRINT-3-PLAN.md`:
  - `processingId`, `sectionsDetected`, `strategy`, `aiFallbackUsed`, `timestamp`, `correlationId`
- `ResumeClassified` payload defined in `UaipEvents.ts` + `SPRINT-2-PLAN.md`:
  - `processingId`, `documentCategory`, `confidenceScore`, `signals`, `reason`, `timestamp`

**Gap:**
- No payload fields specified for `ResumeEntityExtracted`
- No payload fields specified for `ResumeEntityExtractionFailed`
- No `correlationId` field mentioned
- No summary statistics (min/max/average confidence, below-threshold count)
- No `entityTypes` array to indicate which entity types were found

**Impact:**
- Sprint 5 (`ResumeAIEnhancer`) and Sprint 6 (`ResumeConfidenceScorer`) implementers have no contract to build against
- Event consumers may break if payload shape changes during implementation
- Test writers cannot verify payload completeness
- DIC integration (Sprint 7) cannot determine what data is available from the event

**Recommendation:** Add explicit payload definitions to plan.

---

## Evidence 5: No Explicit Section Priority for Entity Overlap

### Finding
Code Review Finding #5 (Low): "No Explicit Section Priority for Entity Overlap"

### File References
- `SPRINT-4-PLAN.md` Section 7.3

### Evidence

**Risk table (Section 15):**
```markdown
Deduplication by normalized name + section priority
```

**No section priority order defined in plan.**

**Impact:** Deduplication tie-breaking may vary across implementations.

---

## Evidence 6: No Explicit Minimum Per-Entity Confidence Threshold

### Finding
Code Review Finding #6 (Low): "No Explicit Minimum Per-Entity Confidence Threshold"

### File References
- `SPRINT-4-PLAN.md` Section 7.4

### Evidence

**Confidence ranges defined:**
```markdown
- heuristic match: 0.7-0.9
- AI fallback: 0.5-0.7
- low-confidence: flag for manual review
```

**No minimum threshold for inclusion in output.** An entity with confidence 0.1 would be included.

**Impact:** Low-confidence noise may pollute `rawCandidateFields`.

---

## Evidence 7: Missing AI Prompt Contract

### Finding
Code Review Finding #7 (Low): "Missing AI Prompt Contract"

### File References
- `SPRINT-4-PLAN.md` Section 7.4

### Evidence

**Plan states:**
```
AI fallback prompt includes:
- Section text
- Expected entity types for that section
- Existing extracted entities (if any)
- Request: structured JSON output with confidence per entity
```

**No prompt template or expected JSON response schema provided.**

**Impact:** Implementation may produce inconsistent AI responses across models/providers.

---

## Verification Against Special Focus Questions

### Q1: Is ResumeEntity schema sufficient for Sprint 7 canonical writes?

**Evidence:** Architecture v1.4 Section 5.1 defines the canonical mapping, but Sprint 4 plan does not validate compatibility or reference this mapping. Finding #1 (High).

### Q2: Is there a clear boundary between confidence per entity and overall document confidence?

**Evidence:** No. Plan defines per-entity confidence; architecture defines document confidence formula. No bridge between them. Finding #2 (Medium).

### Q3: Is entity deduplication strategy specified enough?

**Evidence:** Risk table mentions deduplication conceptually, but no implementation rules exist. Finding #3 (Medium).

### Q4: Is ResumeEntityExtracted event payload complete for downstream stages?

**Evidence:** No. Event names defined but payloads not specified. Finding #4 (Medium).

---

## Summary Table

| # | Finding | Severity | File | Lines | Block Implementation? |
|---|---------|----------|------|-------|----------------------|
| 1 | Entity-to-canonical mapping undefined | High | SPRINT-4-PLAN.md, RESUME-PARSER-ARCHITECTURE.md | Section 7.2, 5.1 | Yes |
| 2 | Confidence boundary undefined | Medium | SPRINT-4-PLAN.md, RESUME-PARSER-ARCHITECTURE.md | Section 7.4, 4 | No |
| 3 | Deduplication underspecified | Medium | SPRINT-4-PLAN.md | Section 7.3, 15 | No |
| 4 | Event payloads undefined | Medium | SPRINT-4-PLAN.md | Section 1, 6 | No |
| 5 | Section priority undefined | Low | SPRINT-4-PLAN.md | Section 7.3 | No |
| 6 | Minimum confidence threshold missing | Low | SPRINT-4-PLAN.md | Section 7.4 | No |
| 7 | AI prompt contract missing | Low | SPRINT-4-PLAN.md | Section 7.4 | No |

---

## Conclusion

Sprint 4 plan is structurally sound and aligned with existing architecture, but 4 findings must be resolved before implementation to avoid downstream ambiguity in Sprint 5, 6, and 7.

**Verdict:** APPROVED WITH FINDINGS

---

*End of Sprint 4 Plan Review Evidence*
*Generated: 2026-07-24*
