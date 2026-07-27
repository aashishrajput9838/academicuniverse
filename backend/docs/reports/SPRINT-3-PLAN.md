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
| `KnowledgeDispatcher` | `src/shared/services/knowledgeDispatcher.service.ts` | Route `case 'resume'` by `payload.stage` |
| `ResumeParseResult` | `src/models/ResumeParseResult.ts` | Store detected sections, strategy, confidence |
| `ResumeClassifier` | `src/services/resume/resumeClassifier.service.ts` | Classification already complete; Stage 1 gates on it |
| `EventBus` / `UaipEvent` | `src/events/EventBus.ts`, `src/events/UaipEvents.ts` | Publish `ResumeSectionDetected` or `ResumeStageFailed` |
| `PipelineOrchestrator` | `src/services/pipeline-orchestrator.ts` | Generic pipeline unchanged; resumes after `Parsed`/`OCR_COMPLETED` |

---

## 3. Files to Create

| File | Purpose |
|------|---------|
| `src/services/resume/resumeSectionDetector.service.ts` | Stateless section detection service: heuristic rules + AI fallback trigger. Returns `Section[]`. |
| `src/models/ResumeSection.ts` | Mongoose schema for detected resume sections |
| `src/__tests__/resumeSectionDetector.service.test.ts` | Unit tests for section detection logic |

---

## 4. Files to Modify

| File | Changes |
|------|---------|
| `src/shared/services/knowledgeDispatcher.service.ts` | Extend `case 'resume':` with `switch(payload.stage)` routing |
| `src/services/resume/resumeClassificationEventListener.ts` | Enqueue `ResumeSectionDetectorJob` after classification; add `isScanned` OCR gate |
| `src/events/UaipEvents.ts` | Add section-detector events |
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
  -> OCR gate:
     if KnowledgeRecord.isScanned === true && !payload.ocrText => return; wait for OCR_COMPLETED
  -> Enqueue ResumeSectionDetectorJob via KnowledgeJobRepository
     domain: 'resume'
     payload: {
       processingId,
       stage: 'section_detection',
       rawContent,
       mimeType,
       fileName,
       organizationId
     }

[Async] KnowledgeQueueService dequeues ResumeSectionDetectorJob
  -> KnowledgeDispatcher case 'resume'
     -> switch(payload.stage)
        -> case 'section_detection': ResumeSectionDetector.detect(rawContent, mimeType)
        -> case 'entity_extraction': ResumeEntityExtractor.extract(...)
        -> case 'ai_enhancement': ResumeAIEnhancer.enhance(...)
        -> case 'confidence_scoring': ResumeConfidenceScorer.score(...)
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
        NOTE: AI fallback is inside the SAME attempt, not a queue retry
     -> Returns Section[]
  -> Update ResumeParseResult:
     - sectionsDetected: <count>
     - sectionDetectionStrategy: 'heuristic' | 'heuristic+ai' | 'ai-only'
     - candidateFields.sections: [...]
     - reviewStatus: 'PENDING_REVIEW'
  -> Publish ResumeSectionDetected or ResumeSectionDetectionFailed
```

### Stage Routing Architecture (Permanent for Sprint 3-7)

```
KnowledgeJob.payload.stage values:
  - 'section_detection'
  - 'entity_extraction'
  - 'ai_enhancement'
  - 'confidence_scoring'

KnowledgeDispatcher routes:
  case 'resume':
    switch (payload.stage) {
      case 'section_detection': await stage1SectionDetector.handle(params); break;
      case 'entity_extraction': await stage2EntityExtractor.handle(params); break;
      case 'ai_enhancement': await stage3AiEnhancer.handle(params); break;
      case 'confidence_scoring': await stage4ConfidenceScorer.handle(params); break;
      default: throw new Error(`Unknown resume stage: ${payload.stage}`);
    }
```

This routing remains permanent through Sprint 7.

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

### 7.2 ResumeSection Schema

```ts
export interface ResumeSection {
  title: string;          // e.g., "EXPERIENCE", "EDUCATION"
  order: number;          // 0-based sequence in document
  startLine: number;      // 0-based line index
  endLine: number;        // exclusive
  rawText: string;        // full text of section
  entities?: any[];       // populated by Stage 2
  entries?: any[];        // populated by Stage 2/3
  repeatable?: boolean;   // true for EXPERIENCE, EDUCATION, PROJECTS
}
```

### 7.3 Required-Section AI Fallback Trigger

Required sections: `HEADER`, `EXPERIENCE`, `EDUCATION`, `SKILLS`

If **ANY** required section is missing after heuristic detection, invoke AI fallback for section segmentation regardless of how many non-required sections were found.

**AI fallback is inside the SAME queue attempt.** It does not consume a retry. If AI providers exhaust, the stage fails immediately and the queue may retry the whole job.

---

## 8. Error Handling

| Failure Mode | Behavior |
|--------------|----------|
| `rawContent` missing | Publish `ResumeSectionDetectionFailed`, set `reviewStatus: 'NEEDS_REINDEX'` |
| `isScanned` && no OCR text | Do not enqueue; wait for `OCR_COMPLETED` event |
| Heuristic detection fails | Fallback to AI-only via `FailoverAIProvider` (same attempt) |
| AI providers exhausted | Publish `ResumeStageFailed` with `terminal: true`, then `ResumeSectionDetectionFailed`, set `reviewStatus: 'NEEDS_REINDEX'` |
| No sections detected | Publish `ResumeStageFailed`, mark for manual review |
| Queue retry | Detector checks `ResumeParseResult.sectionsDetected` for idempotency; if already set, skip recomputation |

### Retry Semantics

- Backoff: 1s, 2s, 4s
- Max attempts: 3
- AI fallback is NOT a retry — it's part of the same attempt
- If the entire stage fails after all retries, `ResumeParseDeadLetter` is published

---

## 9. Multi-Tenant Safety

- `ResumeSection` is **embedded** in `ResumeParseResult.candidateFields.sections[]`
- No separate collection needed
- Org isolation inherited from parent `ResumeParseResult.organizationId`
- All future queries continue to scope by `processingId` + `organizationId`

---

## 10. Test Plan

### Unit Tests

| Test | Target |
|------|--------|
| `ResumeSectionDetector.detect()` with well-structured resume | Returns 6-10 sections |
| `ResumeSectionDetector.detect()` with missing required section | Triggers AI fallback (same attempt) |
| `ResumeSectionDetector.detect()` with plain text (no headings) | Returns single `GENERAL` section |
| Regex patterns match known headers | Each regex tested against positive/negative cases |
| AI fallback invoked when required section missing | Mock `FailoverAIProvider` and assert call |
| Idempotency: re-dequeue same job | `ResumeParseResult.sectionsDetected` unchanged; detector skips |
| Retry/dead-letter: stage failure after max attempts | `ResumeStageFailed` published; `NEEDS_REINDEX` set |

### Integration Tests

| Test | Target |
|------|--------|
| End-to-end: upload resume → classify → enqueue section detector → dispatcher routes → sections stored | Full async flow through mocked event bus + dispatcher |
| End-to-end: scanned resume → wait for OCR → enqueue section detector | OCR gate test |
| Multi-tenant isolation: org A cannot access org B sections | Verify `organizationId` scoping in queries |
| Performance: section detection < 5s for 5-page resume | Latency benchmark |

---

## 11. Out-of-Scope Guardrails

The following are **explicitly excluded** from Sprint 3 and must not be implemented:

- ❌ `ResumeEntityExtractor`
- ❌ `ResumeAIEnhancer`
- ❌ `ResumeConfidenceScorer`
- ❌ DIC integration
- ❌ Canonical model writes (`Person`, `ExperienceRecord`, etc.)
- ❌ Frontend changes
- ❌ ResumeSectionDetector performance optimization (batch processing, caching)

---

## 12. Dependencies

**No new npm dependencies required.** Uses existing `FailoverAIProvider` and regex utilities.

---

## 13. Definition of Done

- [ ] `ResumeSectionDetector` service created and unit tested
- [ ] `ResumeSection` schema defined and embedded in `ResumeParseResult.candidateFields`
- [ ] `KnowledgeDispatcher` `case 'resume':` routes by `payload.stage`
- [ ] `ResumeClassificationEventListener` enqueues section-detector job with stage routing
- [ ] `isScanned` OCR gate implemented in listener
- [ ] Retry semantics documented and implemented
- [ ] `UaipEvents` extended with section-detector events
- [ ] Idempotency test passes
- [ ] Retry/dead-letter test passes
- [ ] Multi-tenant isolation test passes
- [ ] Performance target met (< 5s)
- [ ] All new tests pass
- [ ] TypeScript compiles cleanly
- [ ] Architecture v1.4 changelog updated
- [ ] Code review passed
- [ ] Merge to `main`

---

## 14. Stage Routing Reference (Sprint 3-7)

```
payload.stage values:
  'section_detection'   -> ResumeSectionDetector
  'entity_extraction'   -> ResumeEntityExtractor
  'ai_enhancement'      -> ResumeAIEnhancer
  'confidence_scoring'  -> ResumeConfidenceScorer

KnowledgeDispatcher routing:
  case 'resume':
    switch (payload.stage) {
      case 'section_detection':  // Sprint 3
      case 'entity_extraction':  // Sprint 4
      case 'ai_enhancement':     // Sprint 5
      case 'confidence_scoring': // Sprint 6
    }
```

This routing pattern is permanent for Sprint 3 through Sprint 7.

---

*Sprint 3 plan finalized on 2026-07-24.*
