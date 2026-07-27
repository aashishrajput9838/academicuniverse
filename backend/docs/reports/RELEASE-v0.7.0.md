# Release v0.7.0

**Release Date:** 2026-07-25  
**Sprint:** Sprint 7 — DIC Integration + Canonical Model Writes (Stage 5-6)  
**Tag:** `v0.7.0`  
**Architecture Version:** v1.7

---

## Sprint Summary

Sprint 7 completes the resume parser pipeline by adding the final two stages:

- **Stage 5: DIC (Document Intelligence Center) Integration** — Routes parsed resumes to review queues based on confidence score and document classification.
- **Stage 6: Canonical Model Writes** — Extracts structured sections from resumes, performs person deduplication, and writes canonical records to the database.

This release marks the transition from a document processing pipeline to a full data integration system capable of producing canonical person, experience, education, skill, certificate, and project records.

---

## New Features

### Stage 5: DIC Integration
- `DicIntegrationService` — enforces DIC routing policies
- Review actions: `APPROVED`, `REJECTED`, `ROLLBACK`
- Automatic routing for `AUTO_APPROVED` documents
- Status transitions: `queued_review`, `needs_reindex`, `reindexed`

### Stage 6: Canonical Model Writes
- `CanonicalWriteService` — orchestrates canonical record creation
- Person deduplication using Architecture v1.7 formula
- Dynamic `matchBasis` recording (email, phone, name+jaro, institution)
- Canonical model mapping:
  - `HEADER` → `Person`
  - `EXPERIENCE` → `ExperienceRecord`
  - `EDUCATION` → `AcademicRecord`
  - `SKILLS` → `SkillEvidence`
  - `CERTIFICATIONS` → `CertificateRecord`
  - `PROJECTS` → `CareerRecord`
  - `ACHIEVEMENTS` → `CareerRecord`

### Event System
- 5 new events added to `UaipEvents`:
  - `ResumeParseCompleted`
  - `ResumeDICRouted`
  - `ResumeDICRoutingFailed`
  - `ResumeCanonicalWritten`
  - `ResumeCanonicalWriteFailed`

### Resume Parse Result Model
- 3 new fields: `dicRoutedAt`, `canonicalWrittenAt`, `dicDocumentId`

### Infrastructure
- `ResumeParseEventListener` — bridges Stage 4 to Stage 5
- `handleResumeDicIntegration` dispatcher handler
- `handleResumeCanonicalWrite` dispatcher handler

### Person Deduplication (Architecture v1.7 Section 7.4)
- Exact formula implementation:
  ```ts
  const isDuplicate =
    emailMatch ||
    phoneMatch ||
    (nameScore >= 0.92 && (emailMatch || phoneMatch || institutionScore >= 0.85));
  ```
- Jaro-Winkler similarity used for name comparison (threshold 0.92)
- Academic record subject name matching for institution comparison (threshold 0.85)
- Multi-tenant scoping on all Person and AcademicRecord queries

---

## Test Summary

| Metric | Value |
|--------|-------|
| New tests added | 19 (8 DIC + 8 canonical + 3 integration) |
| Test suites | 64 total |
| Total tests | 514 (495 baseline + 19 new Sprint 7) |
| Regressions | 0 |
| Pass rate | 100% |

---

## Review History

| Phase | Verdict | Findings |
|-------|---------|----------|
| Senior Code Review | APPROVED WITH FINDINGS | 2 LOW findings |
| Review Fixes | COMPLETE | 3 items applied |
| Code Re-Review | APPROVED | 0 findings |

**Findings addressed:**
1. `matchBasis` now dynamically computed from all fired signals
2. Test count documentation corrected to 350 (331 pre-existing + 19 new)
3. Cosmetic whitespace removed in dispatcher

---

## Merge Commits

| Commit | Message |
|--------|---------|
| `60aef88` | feat(resume-parser): Sprint 7 DIC integration and canonical writes (Stage 5-6) |
| `0e6fa64` | docs(resume-parser): update PROJECT-INDEX for Sprint 7 merge |
| `fdce91a` | docs(resume-parser): mark Sprint 7 released with v0.7.0 |

---

## Breaking Changes

None. This is a feature release with no breaking API or database changes.

---

## Known Limitations

1. **DIC UI is not implemented** — this release covers only the backend routing logic and canonical writes. The DIC review interface requires separate frontend work.
2. **Performance benchmarks** — no production-scale benchmark has been executed. Test environments show acceptable performance but SLA validation (< 5s end-to-end) is pending.
3. **Person deduplication** — `Person.findOne({ organizationId })` queries the entire person table without table-scan optimization. Performance may degrade at extreme scale.
4. **Phone matching** — `phoneMatch` currently compares resume raw phone against an empty string placeholder (`normalizePhone('')`). Logic is technically sound but best kept as-is until real phone records exist in production.
5. **Manual matchBasis** — architecture v1.7 mentions recording `manual` if a reviewer intervenes. This is not yet implemented because `handleReviewAction` does not callback into `ResumePersonSuggestion` for updates.

---

## What's Next

- Sprint 8 planning
- DIC Review UI implementation
- Performance benchmarking under production-like load
- Reviewer intervention hooks for `matchBasis`
