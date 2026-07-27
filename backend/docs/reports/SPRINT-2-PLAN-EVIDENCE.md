# Sprint 2 Plan — Evidence Report
## Date: 2026-07-24

---

## 1. Evidence: Source of Truth

| Artifact | Path | Role |
|----------|------|------|
| Architecture v1.2 | `backend/RESUME-PARSER-ARCHITECTURE.md` | Baseline architecture |
| Sprint 1 Completion | `backend/SPRINT-1-COMPLETION-REPORT.md` | Confirms baseline frozen |
| DocumentClassifier | `backend/src/services/classification/DocumentClassifier.ts` | Existing classifier to wrap |
| KnowledgeQueueService | `backend/src/shared/services/knowledgeQueue.service.ts` | Target queue infrastructure |
| KnowledgeDispatcher | `backend/src/shared/services/knowledgeDispatcher.service.ts` | Dispatcher requiring `resume` domain |
| UaipEvents | `backend/src/events/UaipEvents.ts` | Event enum to extend |
| ResumeParseResult | `backend/src/models/ResumeParseResult.ts` | Target model for classification output |
| ResumeParserController | `backend/src/controllers/resumeParserController.ts` | Controller using deprecated `ResumeQueueService` |

---

## 2. Evidence: Scope Constraints

Sprint 2 plan explicitly excludes the following per user requirements:

| Excluded Item | Evidence |
|---------------|----------|
| Section detection | `SPRINT-2-PLAN.md` Section 14: "❌ ResumeSectionDetector" |
| Entity extraction | `SPRINT-2-PLAN.md` Section 14: "❌ ResumeEntityExtractor" |
| AI enhancement | `SPRINT-2-PLAN.md` Section 14: "❌ ResumeAIEnhancer" |
| OCR logic changes | `SPRINT-2-PLAN.md` Section 14: "❌ OCR logic changes" |
| Confidence scoring | `SPRINT-2-PLAN.md` Section 14: "❌ ResumeConfidenceScorer" |
| DIC integration | `SPRINT-2-PLAN.md` Section 14: "❌ DIC integration" |
| Canonical model writes | `SPRINT-2-PLAN.md` Section 14: "❌ Canonical model writes" |

---

## 3. Evidence: Alignment with Architecture v1.2

### 3.1 ResumeClassifier Definition

**Architecture v1.2 Section 3 (Stage 0):**
> "New class: `src/services/resume/resumeClassifier.service.ts` — Single responsibility: boost classification confidence for resumes."
> "Weighted signals: Filename 0.6, MIME 0.3, Content heuristic 0.1"
> "If confidence < 0.5, label UNKNOWN and let Stage 2 AI re-classify"

**Sprint 2 Plan Section 1, 6, 10:**
- Creates `src/services/resume/resumeClassifier.service.ts`
- Defines weighted signals exactly as architecture specifies
- Defines confidence < 0.5 → UNKNOWN → Stage 2 AI recovery path

### 3.2 Queue Infrastructure

**Architecture v1.2 Section 2.1:**
> "Enqueues resume stages as discrete ResumeStageJobs through KnowledgeQueueService with per-stage retry."
> "Sprint 1 pragmatics: A dedicated ResumeQueueService + ResumeJob model is used as a temporary compatibility layer... Migrating to KnowledgeQueueService requires extending KnowledgeDispatcher with a resume domain handler. This migration is planned for Sprint 2."

**Sprint 2 Plan Section 7:**
- Controller uses `KnowledgeQueueService` directly (no adapter)
- Extends `KnowledgeDispatcher` with `case 'resume':`
- Keeps `ResumeQueueService` and `ResumeJob` as deprecated (not deleted)

### 3.3 Events

**Architecture v1.2 Section 5.2:**
> "ResumeStageRetry — Before each retry"
> "ResumeStageFailed — After final retry exhaustion"
> "ResumeParseDeadLetter — When all stages fail"

**Sprint 2 Plan Section 4:**
- Adds `ResumeClassified`, `ResumeClassificationFailed`, `ResumeStageRetry`, `ResumeParseDeadLetter` to `UaipEvents`

### 3.4 Data Flow

**Architecture v1.2 Section 9 (Sequence Diagram):**
> Shows `ResumeParseEventListener` subscribing to `Parsed` + `OCR_COMPLETED`, then enqueuing resume stages via `KnowledgeQueueService`

**Sprint 2 Plan Section 6:**
- Defines `ResumeClassificationEventListener` catching `Parsed`/`OCR_COMPLETED`
- Calls `ResumeClassifier.classify()`
- Updates `ResumeParseResult` fields: `documentCategory`, `confidenceScore`, `primaryTargetModule`, `reviewStatus`

---

## 4. Evidence: File Changes

### 4.1 Files to Create (4)

| File | Evidence |
|------|----------|
| `src/services/resume/resumeClassifier.service.ts` | Plan Section 3 |
| `src/services/resume/resumeClassificationEventListener.ts` | Plan Section 3 |
| `src/__tests__/resumeClassifier.service.test.ts` | Plan Section 9 |
| `src/__tests__/resumeClassificationEventListener.test.ts` | Plan Section 9 |

**Note:** `resumeQueueAdapter` is **not created** in Sprint 2. The controller uses `KnowledgeQueueService` directly.

### 4.2 Files to Modify (4)

| File | Evidence |
|------|----------|
| `src/events/UaipEvents.ts` | Plan Section 4: 4 new events |
| `src/shared/services/knowledgeDispatcher.service.ts` | Plan Section 4: `case 'resume':` stub |
| `src/controllers/resumeParserController.ts` | Plan Section 4: replace `resumeQueueService.enqueue()` with `knowledgeQueueService.enqueue()` directly; remove `ResumeQueueService` import |
| `backend/RESUME-PARSER-ARCHITECTURE.md` | Plan Section 4: changelog v1.3 |

---

## 5. Evidence: No New Dependencies

Plan Section 14 states: "No new npm dependencies required." All dependencies already exist in `backend/package.json` (verified in Sprint 1).

---

## 6. Evidence: Self-Review Risks

| Risk | Severity | Mitigation in Plan |
|------|----------|--------------------|
| KnowledgeDispatcher tight coupling | Medium | Plan Section 12: stub clearly marked, completes job successfully |
| ResumeClassifier confidence precedence | Medium | Plan Section 12: explicit precedence rules defined |
| Event listener double-fire | Medium | Plan Section 12: idempotency check via `confidenceScore > 0` |
| ResumeClassifier statefulness drift | Medium | Plan Section 12: enforce statelessness in code review; no DB/event/queue dependencies |
| Missing ResumeParseResult updates | Low | Plan Section 8: try/catch with `ResumeClassificationFailed` event |

---

## 7. Evidence: Definition of Done

Plan Section 11 lists 11 explicit DoD items:
- [ ] ResumeClassifier service created and unit tested (stateless pure service)
- [ ] ResumeClassificationEventListener created and integration tested
- [ ] KnowledgeDispatcher has `case 'resume':` stub
- [ ] UaipEvents enum extended with 4 new resume events
- [ ] ResumeParserController uses `KnowledgeQueueService` directly (no adapter)
- [ ] ResumeQueueService and ResumeJob marked as deprecated (not deleted)
- [ ] All new tests pass (`18 existing + new classification tests`)
- [ ] TypeScript compiles cleanly
- [ ] Architecture v1.3 changelog updated
- [ ] Code review passed
- [ ] Merge to `main`

---

## 8. Evidence: No Scope Creep

Plan Section 14 explicitly lists 9 excluded items. These align with the user's "Explicitly exclude" requirements from the prompt.

---

## 9. Conclusions

1. **Sprint 2 plan is complete and ready for implementation.**
2. **Scope is strictly limited** to ResumeClassifier, DocumentClassifier integration, queue consumer integration, classification confidence, and classification tests.
3. **All excluded items** (section detection, entity extraction, AI enhancement, OCR, confidence scoring, DIC, canonical writes) are explicitly documented and guarded.
4. **Architectural risks are identified** with mitigations.
5. **No new dependencies** required.
6. **Definition of Done** is explicit and testable.

**Sprint 2 plan status: READY FOR IMPLEMENTATION**

---

*End of evidence report*
