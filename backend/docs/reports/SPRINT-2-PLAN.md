# Sprint 2 Implementation Plan
## Resume Parser — ResumeClassifier
**Sprint:** 2  
**Date:** 2026-07-24  
**Status:** PLANNING — Ready for Implementation  
**Architecture Baseline:** `RESUME-PARSER-ARCHITECTURE.md` v1.2  
**Commit Baseline:** `8b6b40c`

---

## 1. Sprint Goal

Achieve **resume-specific document classification** by building `ResumeClassifier`, integrating it with the existing `DocumentClassifier` and `KnowledgeQueueService`, and replacing the Sprint 1 `ResumeQueueService` temporary layer with the generalized queue infrastructure.

**Outcome:** When a resume is uploaded and the generic pipeline extracts raw text, the resume-specific classification stage runs asynchronously and writes `documentCategory: 'RESUME'`, confidence signals, and initial `ResumeParseResult` metadata.

---

## 2. Existing Code to Reuse

| Component | File | Reuse Strategy |
|-----------|------|----------------|
| `DocumentClassifier` | `src/services/classification/DocumentClassifier.ts` | Call `classify()` as the base classifier; `ResumeClassifier` wraps it and adds resume-specific signals |
| `KnowledgeQueueService` | `src/shared/services/knowledgeQueue.service.ts` | Used directly by `ResumeParserController` to enqueue resume classification jobs |
| `KnowledgeJobRepository` | `src/shared/repositories/knowledgeJob.repository.ts` | Create/find pending resume jobs |
| `KnowledgeDispatcher` | `src/shared/services/knowledgeDispatcher.service.ts` | Add `case 'resume':` branch to invoke `ResumeService.merge()` |
| `UaipEvent` enum | `src/events/UaipEvents.ts` | Add 4 new resume events (`ResumeClassified`, `ResumeClassificationFailed`, `ResumeStageRetry`, `ResumeParseDeadLetter`) |
| `ResumeParseResult` | `src/models/ResumeParseResult.ts` | Update `confidenceScore`, `primaryTargetModule`, `secondaryTargetModules`, `reviewStatus` |
| `ResumeParserController` | `src/controllers/resumeParserController.ts` | Replace `resumeQueueService.enqueue()` with `knowledgeQueueService.enqueue()` directly |
| `StorageService` | `src/services/storageService.ts` | Reuse `uploadResumeFile()` — no changes |
| `UaipUpload` | `src/models/UaipUpload.ts` | Reuse status tracking — no changes |
| `FailoverAIProvider` | `src/core/ai/failover.provider.ts` | Reuse for Stage 2 AI re-classification fallback (Sprint 2+) |

---

## 3. Files to Create

| File | Purpose |
|------|---------|
| `src/services/resume/resumeClassifier.service.ts` | **Stateless** classification service: pure input → output. Independent classifier using resume-specific signals (filename 0.6, MIME 0.3, content heuristic 0.1). No DB writes, no event publishing, no queue interaction. |
| `src/services/resume/resumeClassificationEventListener.ts` | Event listener subscribing to `UaipEvent.Parsed` and `UaipEvent.OCR_COMPLETED`. Orchestrates: calls `ResumeClassifier`, updates `ResumeParseResult`, publishes resume events, handles retries. |
| `src/__tests__/resumeClassifier.service.test.ts` | Unit tests for `ResumeClassifier` |
| `src/__tests__/resumeClassificationEventListener.test.ts` | Integration tests for the event listener + queue interaction |

**Note:** `resumeQueueAdapter` is **not created** in Sprint 2. The controller will use `KnowledgeQueueService` directly. An adapter is only created if it performs meaningful translation/business logic. Forwarding-only is not sufficient justification.

---

## 4. Files to Modify

| File | Changes |
|------|---------|
| `src/events/UaipEvents.ts` | Add `ResumeClassified`, `ResumeClassificationFailed`, `ResumeStageRetry`, `ResumeParseDeadLetter` to enum; extend `UaipEventPayload` if needed |
| `src/shared/services/knowledgeDispatcher.service.ts` | Add `case 'resume':` branch that invokes `ResumeService.merge()` (which will be created in Sprint 2, but the dispatcher case is the migration gate). For Sprint 2, this case can be a stub that just creates an audit entry. |
| `src/controllers/resumeParserController.ts` | Replace `resumeQueueService.enqueue()` with `knowledgeQueueService.enqueue()` directly; remove `ResumeQueueService` import |
| `backend/RESUME-PARSER-ARCHITECTURE.md` | Update changelog to v1.3; queue migration notes confirm direct `KnowledgeQueueService` usage |

---

## 5. Public API Changes

**None.**

The existing endpoints (`POST /api/resume/parse-upload`, `GET /api/resume/parse-status/:processingId`) remain unchanged. All resume classification happens asynchronously in the queue/event layer. No new HTTP endpoints are introduced in Sprint 2.

---

## 6. Data Flow

```
Client -> POST /api/resume/parse-upload
  -> Controller validates + stores + creates UaipUpload + ResumeParseResult
  -> Controller enqueues KnowledgeJob via KnowledgeQueueService directly
  -> Controller returns 201 with processingId

[Async] KnowledgeQueueService polls KnowledgeJob
  -> PipelineOrchestrator.processUpload() runs generic classify + parse
  -> UaipEvent.Parsed published

[Async] ResumeClassificationEventListener catches Parsed/OCR_COMPLETED
  -> Fast path: if KnowledgeRecord.documentCategory === 'RESUME', reuse existing classification
  -> Else, call ResumeClassifier.classify(rawContent, fileName, mimeType)
     -> Independent stateless classifier
     -> Applies resume-specific signals:
        - filename regex (0.6)
        - mime type (0.3)
        - content heuristic (0.1)
     -> Returns { documentCategory, confidenceScore, signals, reason }
  -> Listener decides next action:
     - If confidence < 0.5: publish ResumeClassificationFailed, update ResumeParseResult.reviewStatus = 'NEEDS_REINDEX'
     - If confidence >= 0.5: update ResumeParseResult with RESUME category, publish ResumeClassified
  -> Listener updates ResumeParseResult:
     - documentCategory: 'RESUME'
     - confidenceScore: <value>
     - primaryTargetModule: 'ExperienceRecord' (or other)
     - secondaryTargetModules: [...]
     - reviewStatus: 'PENDING_REVIEW' (classification alone is not enough for auto-approval)
```

**Key principle:** `ResumeClassifier` is a **pure stateless service**. Input → Output. No DB writes, no event publishing, no queue interaction. The listener owns all side effects. The listener first checks `KnowledgeRecord.documentCategory` to avoid redundant classification.

---

## 7. Queue Flow

### Sprint 2 Migration: ResumeJob → KnowledgeJob

1. **Controller enqueue change (direct usage):**
   - Old: `resumeQueueService.enqueue()` → creates `ResumeJob`
   - New: `knowledgeQueueService.enqueue()` directly → creates `KnowledgeJob` with `domain: 'resume'`, `sourceDocumentId: processingId`
   - **No adapter layer.** Controller calls `KnowledgeQueueService` directly. Only add an adapter if translation logic becomes non-trivial.

2. **KnowledgeQueueService polling:**
   - Already polls `KnowledgeJob` every 30s
   - Will pick up resume jobs automatically once `KnowledgeDispatcher` supports `domain: 'resume'`

3. **KnowledgeDispatcher routing:**
   - New `case 'resume':` branch
   - For Sprint 2, the branch calls a stub `ResumeService.merge()` that simply creates an `AuditEntry` and marks the job `COMPLETED`
   - This establishes the pipeline without writing to canonical models (which is Sprint 7)

4. **Retry/backoff:**
   - Reuses existing `KnowledgeQueueService` exponential backoff: 30s, 2m, 10m
   - Resume stages will inherit this backoff; architecture specifies tighter backoff (1s, 2s, 4s) but that is for Stage 1–4 processing jobs, not the initial classification enqueue

5. **ResumeQueueService deprecation:**
   - Keep the file and model in place (do not delete per user policy)
   - Remove all usages; controller now uses `KnowledgeQueueService` directly
   - Add `// DEPRECATED: replaced by direct KnowledgeQueueService usage in Sprint 2` comments

---

## 8. Error Handling

| Failure Mode | Behavior |
|--------------|----------|
| `DocumentClassifier` throws | Catch in `ResumeClassifier`, publish `ResumeClassificationFailed`, set `ResumeParseResult.reviewStatus = 'NEEDS_REINDEX'`, log error |
| Confidence < 0.5 | Publish `ResumeClassificationFailed` with reason `LOW_CONFIDENCE`, set `reviewStatus = 'PENDING_REVIEW'` (not auto-rejected — Stage 2 AI may recover) |
| Queue job fails (network) | `KnowledgeQueueService` retries with backoff (30s, 2m, 10m); after max retries, job marked `FAILED` |
| `KnowledgeDispatcher` unknown domain (`resume` not added) | Job fails, audit entry created, retry scheduled; this is a gating risk — must be resolved before testing |
| `ResumeParseResult` not found during listener | Publish `ResumeClassificationFailed`, exit gracefully; do not crash listener |

---

## 9. Test Plan

### Unit Tests

| Test | Target |
|------|--------|
| `ResumeClassifier.classify()` with known resume filename + PDF MIME | Should return `documentCategory: 'RESUME'`, confidence > 0.5 |
| `ResumeClassifier.classify()` with unknown filename + TXT MIME | Should return `documentCategory: 'UNKNOWN'`, confidence low |
| `ResumeClassifier` applies weighted signals correctly | Filename 0.6, MIME 0.3, content 0.1 — verify sum and threshold |
| `ResumeClassificationEventListener` fast path | If `KnowledgeRecord.documentCategory === 'RESUME'`, skip `ResumeClassifier` and reuse existing classification |
| `ResumeClassificationEventListener` ignores non-resume documents | No ResumeParseResult update when `documentCategory !== 'RESUME'` |
| `ResumeClassificationEventListener` handles `Parsed` event | Updates ResumeParseResult correctly |
| `ResumeClassificationEventListener` handles `OCR_COMPLETED` event | Updates ResumeParseResult correctly for scanned docs |
| `ResumeClassificationEventListener` idempotency | Skips re-classification if `ResumeParseResult.confidenceScore > 0` |
| `KnowledgeDispatcher` with `domain: 'resume'` | Calls audit + completes job without error |
| `ResumeParserController` initial reviewStatus | Creates `ResumeParseResult` with `reviewStatus: 'PENDING_REVIEW'` to avoid false FAILED response |
| `getParseStatus` explicit mapping | Maps `AUTO_APPROVED/APPROVED → SUCCESS`, `PENDING_REVIEW → PENDING`, `NEEDS_REINDEX/REJECTED → FAILED` |

### Integration Tests

| Test | Target |
|------|--------|
| End-to-end: upload resume → generic pipeline → ResumeClassifier → ResumeParseResult updated | Full async flow through mocked event bus |
| End-to-end: upload non-resume → generic pipeline → ResumeClassifier → no resume metadata updated | Negative path |
| Confidence boundary: 0.49 → `PENDING_REVIEW`; 0.50 → `RESUME` category | Threshold behavior |

### Contract Tests

| Test | Target |
|------|--------|
| `ResumeClassifier` output shape | Matches architecture Stage 0 output schema |
| `ResumeParseResult` after classification | Fields `documentCategory`, `confidenceScore`, `primaryTargetModule`, `reviewStatus` populated correctly |

---

## 10. Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| `KnowledgeDispatcher` migration blocks all resume queue jobs | High | Add `case 'resume':` stub in Sprint 2 Day 1; make it a no-op audit + complete so queue flows |
| `ResumeClassifier` confidence weights produce false positives (e.g., PDF named `resume.pdf` but is actually a certificate) | Medium | Content heuristic (0.1 weight) checks for section-like headings; low weight on filename reduces blast radius |
| Event listener double-fires on both `Parsed` and `OCR_COMPLETED` for scanned docs | Medium | Use `processingId` idempotency check; skip if `ResumeParseResult.confidenceScore` already set |
| `ResumeClassifier` accidentally becomes stateful | Medium | Enforce no DB/event/queue dependencies in code review; unit tests verify pure function behavior |
| `DocumentClassifier` future changes break `ResumeClassifier` wrapper | Low | `ResumeClassifier` depends on `DocumentClassifier` interface, not implementation; add interface test |

---

## 11. Definition of Done

- [ ] `ResumeClassifier` service created and unit tested (stateless pure service)
- [ ] `ResumeClassificationEventListener` created and integration tested
- [ ] `KnowledgeDispatcher` has `case 'resume':` stub
- [ ] `UaipEvents` enum extended with 4 new resume events
- [ ] `ResumeParserController` uses `KnowledgeQueueService` directly (no adapter)
- [ ] `ResumeQueueService` and `ResumeJob` marked as deprecated (not deleted)
- [ ] All new tests pass (`18 existing + new classification tests`)
- [ ] TypeScript compiles cleanly
- [ ] Architecture v1.3 changelog updated
- [ ] Code review passed
- [ ] Merge to `main`

---

## 12. Self-Review: Architectural Risks

### Risk 1: KnowledgeDispatcher Tight Coupling
**Severity:** Medium  
**Description:** `KnowledgeDispatcher` is tightly coupled to `PersonResolver` and domain services. Adding a `resume` case means `ResumeService` must be created in Sprint 2, but the full `ResumeService.merge()` is deferred to Sprint 7. A stub is acceptable but introduces a half-initialized code path.  
**Mitigation:** The stub must be clearly marked `// STUB: Sprint 7` and must complete the job successfully (not leave it in `RETRYING`). This ensures the queue flows while signaling incomplete implementation.

### Risk 2: ResumeClassifier Confidence Threshold (< 0.5 → UNKNOWN)
**Severity:** Medium  
**Description:** The architecture says if confidence < 0.5, label `UNKNOWN` and let Stage 2 AI re-classify. But the existing `DocumentClassifier` already sets `documentCategory = 'UNKNOWN'` for unknown files. If `ResumeClassifier` calls `DocumentClassifier` first and gets `UNKNOWN` with confidence 0.0, the resume-specific signals might push it above 0.5. The interaction between base confidence and boosted confidence needs clear precedence.  
**Mitigation:** Define precedence explicitly in `ResumeClassifier`:  
1. If `DocumentClassifier` returns `documentCategory === 'RESUME'` with any confidence → accept it  
2. Else, compute resume signal boost and check threshold  
3. If boosted confidence >= 0.5 → set `RESUME`  
4. Else → set `UNKNOWN` and publish failure event for Stage 2 AI recovery

### Risk 3: Event Listener Idempotency
**Severity:** Medium  
**Description:** `ResumeClassificationEventListener` subscribes to both `UaipEvent.Parsed` and `UaipEvent.OCR_COMPLETED`. For scanned documents, both events may fire, causing the listener to run twice.  
**Mitigation:** Add a simple idempotency check at the top of the listener: if `ResumeParseResult.confidenceScore > 0`, skip re-classification.

### Risk 4: ResumeClassifier Statefulness Drift
**Severity:** Medium  
**Description:** Since `ResumeClassifier` is designed to be stateless, future contributors might accidentally add DB queries, event publishing, or queue interaction inside it, violating the Single Responsibility Principle.  
**Mitigation:** Enforce statelessness in code review checklist. Unit tests must verify `ResumeClassifier` has zero side effects (no DB calls, no event bus access). Keep the class as a pure function/service with explicit input/output types.

### Risk 5: Missing `ResumeParseResult` Updates
**Severity:** Low  
**Description:** The listener updates `ResumeParseResult` but the existing `ResumeParserController` also creates it with defaults. If the listener crashes before updating, the record stays at default values.  
**Mitigation:** The listener must be wrapped in try/catch with `ResumeClassificationFailed` event publication. This is already in the error handling plan.

---

## 13. Out-of-Scope Guardrails

The following are **explicitly excluded** from Sprint 2 and must not be implemented:

- ❌ `ResumeSectionDetector`
- ❌ `ResumeEntityExtractor`
- ❌ `ResumeAIEnhancer`
- ❌ `ResumeConfidenceScorer`
- ❌ DIC integration
- ❌ Canonical model writes (`Person`, `ExperienceRecord`, etc.)
- ❌ OCR logic changes
- ❌ Frontend changes
- ❌ Architecture document rewrite (only changelog update)

---

## 14. Dependencies

**No new npm dependencies required.** All dependencies (`mongoose`, `event bus`, `FailoverAIProvider`, `DocumentClassifier`) already exist in `backend/package.json`.

---

*Sprint 2 plan finalized on 2026-07-24.*
