# Sprint 3 Plan
## Resume Parser — ResumeSectionDetector
**Sprint:** 3  
**Date:** 2026-07-24  
**Status:** PLANNING — Ready for Implementation  
**Architecture Baseline:** `RESUME-PARSER-ARCHITECTURE.md` v1.3  
**Commit Baseline:** `aa601d3`

---

## 1. Sprint Goal

Implement **resume section detection** by building `ResumeSectionDetector`, the first async stage in the resume-specific parsing pipeline. This service partitions raw extracted text into semantically meaningful sections and serves as the foundation for all downstream stages (entity extraction, AI enhancement, confidence scoring).

**Outcome:** After generic parsing produces raw text, `ResumeClassificationEventListener` enqueues `ResumeSectionDetectorJob` through `KnowledgeQueueService`. The detector returns an ordered list of sections with boundaries and metadata.

---

## 2. Existing Code to Reuse

| Component | File | Reuse Strategy |
|-----------|------|--------------|
| `ResumeClassificationEventListener` | `src/services/resume/resumeClassificationEventListener.ts` | Already triggers Stage 1 enqueue |
| `KnowledgeQueueService` | `src/shared/services/knowledgeQueue.service.ts` | Enqueue/dequeue `ResumeSectionDetectorJob` |
| `KnowledgeJobRepository` | `src/shared/repositories/knowledgeJob.repository.ts` | Create pending section-detector jobs |
| `KnowledgeDispatcher` | `src/shared/services/knowledgeDispatcher.service.ts` | Extend `case 'resume':` with Stage 1 handler |
| `ResumeParseResult` | `src/models/ResumeParseResult.ts` | Store detected sections, strategy, confidence |
| `ResumeClassifier` | `src/services/resume/resumeClassifier.service.ts` | Classification already complete; Stage 1 gates on it |
| `EventBus` / `UaipEvent` | `src/events/EventBus.ts`, `src/events/UaipEvents.ts` | Publish `ResumeSectionDetected` or `ResumeStageFailed` |
| `PipelineOrchestrator` | `src/services/pipeline-orchestrator.ts` | Generic pipeline unchanged; resumes after `Parsed`/`OCR_COMPLETED` |

---

## 3. Files to Create

| File | Purpose |
|------|---------|
| `src/services/resume/resumeSectionDetector.service.ts` | Stateless section detection service: heuristic rules + AI fallback trigger. Returns `Section[]` with `title`, `startLine`, `endLine`, `rawText`. |
| `src/models/ResumeSection.ts` | Mongoose schema for detected resume sections |
| `src/__tests__/resumeSectionDetector.service.test.ts` | Unit tests for section detection logic |

---

## 4. Files to Modify

| File | Changes |
|------|---------|
| `src/shared/services/knowledgeDispatcher.service.ts` | Extend `case 'resume':` to invoke stage handlers (Stage 1: section detection) |
| `src/services/resume/resumeClassificationEventListener.ts` | Enqueue `ResumeSectionDetectorJob` via `KnowledgeJobRepository` after successful classification |
| `src/events/UaipEvents.ts` | Add section-detector events: `ResumeSectionDetected`, `ResumeSectionDetectionFailed` |
| `backend/RESUME-PARSER-ARCHITECTURE.md` | Update changelog to v1.4 |

---

## 5. Public API Changes

**None.**

All changes are internal to the async pipeline. The existing endpoints (`POST /api/resume/parse-upload`, `GET /api/resume/parse-status/:processingId`) remain unchanged.

---

## 6. Data Flow

```
[Async] ResumeClassificationEventListener succeeds
  -> KnowledgeRecord.documentCategory === 'RESUME'
  -> Enqueue ResumeSectionDetectorJob via KnowledgeJobRepository
     domain: 'resume'
     payload: { processingId, stage: 'section_detection', rawContent, mimeType, fileName }

[Async] KnowledgeQueueService dequeues ResumeSectionDetectorJob
  -> KnowledgeDispatcher case 'resume' -> Stage 1 handler
  -> ResumeSectionDetector.detect(rawContent, mimeType)
     -> Apply heuristic rules:
        - Heading style detection (DOCX)
        - Font size / bold heuristic
        - Regex line detection
        - Layout cues (all-caps, bullets)
        - Spacing heuristic
     -> Check required sections:
        HEADER, EXPERIENCE, EDUCATION, SKILLS
     -> If ANY required section missing:
        invoke AI fallback via FailoverAIProvider
     -> Returns Section[]
  -> Update ResumeParseResult:
     - sectionsDetected: <count>
     - sectionDetectionStrategy: 'heuristic' | 'heuristic+ai' | 'ai-only'
     - candidateFields.sections: [...]
     - reviewStatus: 'PENDING_REVIEW'
  -> Publish ResumeSectionDetected or ResumeSectionDetectionFailed
```

---

## 7. Section Detection Strategy

### 7.1 Heuristic Rules

1. **Heading style detection** (DOCX): Paragraph style matches `Heading1..6`, `Title`, `Subtitle`
2. **Font size / bold heuristic** (DOCX): `bold === true` and `fontSize >= 14` → candidate header
3. **Regex line detection** (PDF & DOCX):
   - `^(SUMMARY|PROFILE|OBJECTIVE|ABOUT ME)$i`
   - `^(EDUCATION|ACADEMIC|QUALIFICATION)S?$i`
   - `^(EXPERIENCE|EMPLOYMENT|WORK HISTORY)$i`
   - `^(PROJECTS?|MAJOR PROJECTS?)$i`
   - `^(SKILLS?|TECHNICAL SKILLS?|COMPETENCIES)$i`
   - `^(CERTIFICATIONS?|CERTIFICATES?|AWARDS?)$i`
   - `^(ACHIEVEMENTS?|HONORS?)$i`
   - `^(PUBLICATIONS?|RESEARCH)$i`
   - `^(LANGUAGES?|INTERESTS?|HOBBIES)$i`
   - `^(CONTACT|REFERENCES?)$i`
4. **Layout cues**: All-caps line with <= 5 words and trailing colon; line with only bullets above it
5. **Spacing heuristic**: Vertical gap > 1.5x average line spacing → possible boundary

### 7.2 Required-Section AI Fallback Trigger

Required sections: `HEADER`, `EXPERIENCE`, `EDUCATION`, `SKILLS`

If **ANY** required section is missing after heuristic detection, invoke AI fallback for section segmentation regardless of how many non-required sections were found.

---

## 8. Error Handling

| Failure Mode | Behavior |
|--------------|----------|
| `rawContent` missing | Publish `ResumeSectionDetectionFailed`, set `reviewStatus: 'NEEDS_REINDEX'` |
| Heuristic detection fails | Fallback to AI-only via `FailoverAIProvider` |
| AI providers exhausted | Publish `ResumeSectionDetectionFailed`, `reviewStatus: 'NEEDS_REINDEX'` |
| No sections detected | Publish `ResumeSectionDetectionFailed`, mark for manual review |

---

## 9. Test Plan

### Unit Tests

| Test | Target |
|------|--------|
| `ResumeSectionDetector.detect()` with well-structured resume | Returns 6-10 sections |
| `ResumeSectionDetector.detect()` with missing required section | Triggers AI fallback |
| `ResumeSectionDetector.detect()` with plain text (no headings) | Returns single `GENERAL` section |
| Regex patterns match known headers | Each regex tested against positive/negative cases |
| AI fallback invoked when required section missing | Mock `FailoverAIProvider` and assert call |

### Integration Tests

| Test | Target |
|------|--------|
| End-to-end: upload resume → classify → enqueue section detector → sections stored | Full async flow through mocked event bus |
| End-to-end: non-resume → no section detection enqueued | Negative path |

---

## 10. Out-of-Scope Guardrails

The following are **explicitly excluded** from Sprint 3 and must not be implemented:

- ❌ `ResumeEntityExtractor`
- ❌ `ResumeAIEnhancer`
- ❌ `ResumeConfidenceScorer`
- ❌ DIC integration
- ❌ Canonical model writes (`Person`, `ExperienceRecord`, etc.)
- ❌ Frontend changes
- ❌ ResumeSectionDetector performance optimization (batch processing, caching)

---

## 11. Dependencies

**No new npm dependencies required.** Uses existing `FailoverAIProvider` and regex utilities.

---

## 12. Definition of Done

- [ ] `ResumeSectionDetector` service created and unit tested
- [ ] `ResumeSection` model created with indexes
- [ ] `KnowledgeDispatcher` `case 'resume':` extended with Stage 1 handler
- [ ] `ResumeClassificationEventListener` enqueues section-detector job
- [ ] `UaipEvents` extended with section-detector events
- [ ] All new tests pass
- [ ] TypeScript compiles cleanly
- [ ] Architecture v1.4 changelog updated
- [ ] Code review passed
- [ ] Merge to `main`

---

*Sprint 3 plan finalized on 2026-07-24.*
