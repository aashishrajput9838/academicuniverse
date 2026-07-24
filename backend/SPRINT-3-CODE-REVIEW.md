# Sprint 3 Implementation — Senior Engineering Code Review
## Resume Parser — ResumeSectionDetector

**Date:** 2026-07-24  
**Reviewer:** Kilo  
**Artifact under review:** Sprint 3 implementation (6 files)  
**Scope:** Code review only. No modifications performed.

---

## Executive Summary

| Dimension | Verdict |
|-----------|---------|
| Scope compliance | Mostly compliant; 1 plan/implementation gap |
| Architecture compliance | ⚠️ Stage 1 handler incomplete |
| ResumeSectionDetector correctness | Good; heuristic logic sound, minor gaps |
| Statelessness | Strong; zero side effects |
| KnowledgeDispatcher stage routing | Good; permanent pattern established |
| OCR gate correctness | ⚠️ Semantically incorrect fallback |
| AI fallback semantics | Good; same-attempt fallback, graceful degradation |
| Retry/idempotency | ⚠️ Section detection stage not idempotent |
| Multi-tenant isolation | Strong; embedded model inherits org scoping |
| Event-driven flow | ⚠️ Missing section-detection events from dispatcher |
| Error handling | Adequate; try/catch with failure event |
| Tests | Good coverage; some edge cases missing |
| Performance | Acceptable; no benchmarks yet |
| Maintainability | Clean separation; clear ownership |
| Production readiness | Not yet; stage handler incomplete |

**Overall Verdict:** APPROVED WITH FIXES

**2 High issues** must be fixed before merge. **3 Medium issues** should be fixed before merge. **4 Low issues** are acceptable for v1 but should be tracked.

---

## Critical Issues

None found.

---

## High Issues

### 1. Section Detection Stage Does Not Actually Detect Sections
- **Severity:** High
- **File:** `src/shared/services/knowledgeDispatcher.service.ts:277-297`
- **Explanation:** The `handleResumeSectionDetection` method only creates an `AuditEntry` and returns. It does not invoke `ResumeSectionDetector.detect()`, does not update `ResumeParseResult` with sections, and does not publish `ResumeSectionDetected` or `ResumeSectionDetectionFailed` events. When the queue dequeues a `ResumeSectionDetectorJob`, the dispatcher logs an audit entry, the job is marked `COMPLETED`, and no section detection work is performed.
- **Impact:** Stage 1 is non-functional. Jobs are processed but produce no output. `ResumeParseResult.sectionsDetected` remains 0, `candidateFields.sections` remains empty, and downstream stages (entity extraction, AI enhancement) have no sections to operate on.
- **Recommendation:** Implement the actual stage handler:
  ```ts
  private async handleResumeSectionDetection(params: {...}): Promise<void> {
    const detector = new ResumeSectionDetector(this.aiProvider);
    const rawContent = (data as any)?.rawContent || '';
    const result = await detector.detect({ rawText: rawContent, mimeType: (data as any)?.mimeType });
    
    await ResumeParseResult.findOneAndUpdate(
      { processingId: sourceDocumentId },
      { sectionsDetected: result.sections.length, sectionDetectionStrategy: result.strategy, 'candidateFields.sections': result.sections }
    );
    
    if (result.sections.length > 0) {
      await eventBus.publish(UaipEvent.ResumeSectionDetected, { ... });
    } else {
      await eventBus.publish(UaipEvent.ResumeSectionDetectionFailed, { ... });
    }
  }
  ```
- **Must fix before merge:** Yes

### 2. Missing ResumeParseResult Update and Event Publication
- **Severity:** High
- **File:** `src/shared/services/knowledgeDispatcher.service.ts:277-297` + `src/services/resume/resumeClassificationEventListener.ts`
- **Explanation:** Even if `ResumeSectionDetector.detect()` were called, the implementation has no code to:
  1. Update `ResumeParseResult.sectionsDetected`
  2. Update `ResumeParseResult.sectionDetectionStrategy`
  3. Update `ResumeParseResult.candidateFields.sections`
  4. Publish `ResumeSectionDetected` or `ResumeSectionDetectionFailed`
  
  The listener enqueues the job but never handles the result. The dispatcher handler doesn't process the result.
- **Impact:** Section detection results are lost. The pipeline cannot progress to entity extraction because no section boundaries exist.
- **Recommendation:** Add the update + publish logic to `handleResumeSectionDetection` as shown in finding #1.
- **Must fix before merge:** Yes

---

## Medium Issues

### 3. OCR Gate Uses rawContent as OCR Text Proxy
- **Severity:** Medium
- **File:** `src/services/resume/resumeClassificationEventListener.ts:133`
- **Explanation:** The OCR gate checks:
  ```ts
  const ocrText = payload.ocrText || knowledgeRecord?.rawContent || '';
  if (isScanned && !ocrText) return;
  ```
  `knowledgeRecord.rawContent` is the parsed text from the generic parser, not OCR text. For scanned PDFs, `rawContent` is typically empty before OCR, so the check happens to work. But the semantic meaning is wrong: `rawContent` is not OCR text.
- **Impact:** For scanned PDFs that somehow have `rawContent` set (e.g., from a partial parse), the gate would incorrectly allow enqueue before OCR is actually complete.
- **Recommendation:** Change to explicit OCR check:
  ```ts
  const hasOcrText = !!payload.ocrText;
  if (isScanned && !hasOcrText) return;
  ```
- **Must fix before merge:** No

### 4. `mimeType` Parameter Unused in ResumeSectionDetector
- **Severity:** Medium
- **File:** `src/services/resume/resumeSectionDetector.service.ts:20-24, 82`
- **Explanation:** `detect()` accepts `mimeType` but `applyHeuristics()` ignores it. The plan mentions DOCX-specific heuristics (heading styles, font sizes) that would require `mimeType` to switch behavior. Currently, all MIME types are processed with PDF-style regex heuristics.
- **Impact:** DOCX resumes don't benefit from DOCX-specific heading detection. The heuristic accuracy for DOCX files is lower than planned.
- **Recommendation:** Either implement DOCX-specific heuristics when `mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'`, or document that DOCX heuristics are deferred to a future sprint and remove the unused parameter.
- **Must fix before merge:** No

### 5. AI Fallback Model Hardcoded
- **Severity:** Medium
- **File:** `src/services/resume/resumeSectionDetector.service.ts:158`
- **Explanation:** The AI fallback call hardcodes `model: 'gemini-2.0-flash'`. If this model is unavailable or the project switches providers, the code breaks. The existing `FailoverAIProvider` and `UaipDocumentAiService` use configurable models or defaults.
- **Impact:** Tightly couples section detection to a single AI model. Reduces flexibility for provider rotation.
- **Recommendation:** Accept a model parameter in `detect()` with a default, or use a shared AI config/constant.
- **Must fix before merge:** No

---

## Low Issues

### 6. Section Detection Stage Not Idempotent
- **Severity:** Low
- **File:** `src/shared/services/knowledgeDispatcher.service.ts:277-297`
- **Explanation:** Architecture v1.3 Section 5.4 requires stage idempotency: "If the same processingId is dequeued after a crash, the stage checks whether its output already exists and skips recomputation." The current `handleResumeSectionDetection` does not check `ResumeParseResult.sectionsDetected` before processing.
- **Impact:** If a job is retried after a crash, section detection runs again and overwrites previous results. This violates the idempotency requirement.
- **Recommendation:** Add idempotency check:
  ```ts
  const existing = await ResumeParseResult.findOne({ processingId }).lean().exec();
  if (existing && existing.sectionsDetected > 0) {
    return; // already processed
  }
  ```
- **Must fix before merge:** No

### 7. No Performance Benchmark for Section Detection
- **Severity:** Low
- **File:** `SPRINT-3-PLAN.md` Section 10 + implementation
- **Explanation:** The plan specifies a `< 5s` performance target for section detection, but no benchmark implementation or test exists.
- **Impact:** Cannot verify SLA compliance in CI.
- **Recommendation:** Add a performance test or benchmark script in a future sprint.
- **Must fix before merge:** No

### 8. Unimplemented Stage Handler Throws Instead of Completing
- **Severity:** Low
- **File:** `src/shared/services/knowledgeDispatcher.service.ts:302-324`
- **Explanation:** `handleUnimplementedResumeStage` throws `Error: ${stage} not yet implemented`. This causes the outer catch block to create a retry job. The job will be retried 3 times and then marked FAILED. For stages that aren't implemented yet, this creates unnecessary retry noise.
- **Impact:** Queue will retry unimplemented stages 3 times before dead-lettering. Wastes resources and pollutes audit logs.
- **Recommendation:** Consider publishing `ResumeParseDeadLetter` directly for unimplemented stages, or document that retry behavior is intentional.
- **Must fix before merge:** No

### 9. Missing Section Boundary Edge-Case Tests
- **Severity:** Low
- **File:** `src/__tests__/resumeSectionDetector.service.test.ts`
- **Explanation:** Tests cover well-structured resumes, plain text, empty input, and AI fallback. Missing tests for:
  - Resume with duplicate section headers (e.g., two "EXPERIENCE" blocks)
  - Resume with sections in wrong order
  - Resume with mixed-case headers
  - Resume with special characters in section titles
- **Impact:** Edge cases may produce incorrect section boundaries in production.
- **Recommendation:** Add edge-case tests in a future sprint.
- **Must fix before merge:** No

---

## Architecture Compliance Verification

| Architecture Requirement | Implementation | Status |
|--------------------------|----------------|--------|
| ResumeSectionDetector stateless | Zero side effects | ✅ Compliant |
| Heuristic rules implemented | Regex + layout + spacing | ✅ Compliant |
| Required-section AI fallback | Missing ANY of 4 sections triggers AI | ✅ Compliant |
| AI fallback inside same attempt | Not a queue retry | ✅ Compliant |
| Stage routing permanent pattern | `switch(payload.stage)` | ✅ Compliant |
| OCR gate for scanned docs | `isScanned && !ocrText` check | ⚠️ Semantic issue with rawContent fallback |
| Idempotency via ResumeParseResult check | ❌ Not implemented | **VIOLATES** |
| Section data embedded | In `ResumeParseResult.candidateFields` | ✅ Planned but not persisted |
| organizationId scoping | Inherited from parent | ✅ Compliant |
| Event publication on stage completion | ❌ Not implemented | **VIOLATES** |
| Public API unchanged | Same endpoints | ✅ Compliant |

---

## Scope Control Review

| In-Scope Item | Status |
|---------------|--------|
| ResumeSectionDetector service | ✅ Created |
| ResumeSection model | ✅ Created |
| Unit tests | ✅ Created |
| KnowledgeDispatcher Stage 1 handler | ⚠️ Routing works, but handler incomplete |
| Listener enqueue for section detector | ✅ Implemented |
| OCR gate | ✅ Implemented |
| Stage routing pattern | ✅ Permanent pattern established |
| UaipEvents extensions | ✅ Added |
| ResumeSectionDetector event publication | ❌ Not published by dispatcher |

| Out-of-Scope Item | Status |
|-------------------|--------|
| ResumeEntityExtractor | ✅ Guarded |
| ResumeAIEnhancer | ✅ Guarded |
| ResumeConfidenceScorer | ✅ Guarded |
| DIC integration | ✅ Guarded |
| Canonical model writes | ✅ Guarded |
| Frontend changes | ✅ Guarded |

No scope creep detected. Stage 1 handler is incomplete but not because of scope creep.

---

## Stage Handler Gap Analysis

### Current Behavior

```
ResumeSectionDetectorJob enqueued
  -> KnowledgeQueueService dequeues
  -> KnowledgeDispatcher routes to section_detection
  -> handleResumeSectionDetection() creates AuditEntry
  -> Job marked COMPLETED
  -> ResumeParseResult.sectionsDetected = 0 (unchanged)
  -> No events published
```

### Expected Behavior (per architecture v1.3 Section 3 + plan Section 6)

```
ResumeSectionDetectorJob enqueued
  -> KnowledgeQueueService dequeues
  -> KnowledgeDispatcher routes to section_detection
  -> handleResumeSectionDetection():
     1. Reads rawContent from job payload
     2. Calls ResumeSectionDetector.detect(rawContent, mimeType)
     3. Updates ResumeParseResult:
        - sectionsDetected = result.sections.length
        - sectionDetectionStrategy = result.strategy
        - candidateFields.sections = result.sections
     4. Publishes ResumeSectionDetected or ResumeSectionDetectionFailed
  -> Job marked COMPLETED
```

### Gap

The actual section detection processing, result persistence, and event publication are missing. The stage handler is a stub that logs and completes without doing work.

---

## Test Quality Review

| Test Category | Count | Quality |
|---------------|-------|---------|
| ResumeSectionDetector unit | 8 | Good: covers happy path, AI fallback, statelessness, empty input |
| ResumeClassificationEventListener unit | 8 | Good: covers OCR gate, enqueue, fast-path, error handling |
| ResumeParserController unit | Existing | Passing |
| ResumeClassifier unit | Existing | Passing |
| **Section detection end-to-end** | ❌ Missing | No test for full async chain through dispatcher |
| **Dispatcher stage routing** | ❌ Missing | No test for `switch(payload.stage)` behavior |
| **ResumeParseResult update** | ❌ Missing | No test for section detection persisting results |
| **Event publication** | ❌ Missing | No test for `ResumeSectionDetected` event |

---

## Technical Debt Introduced

| Debt Item | Severity | Description | Remediation Plan |
|-----------|----------|-------------|-----------------|
| Section detection handler incomplete | High | Dispatcher doesn't invoke detector or persist results | Fix before merge |
| Missing section-detection events | High | Events defined but never published by stage handler | Fix before merge |
| OCR gate semantic incorrectness | Medium | `rawContent` used as OCR text proxy | Fix in code review fixes |
| `mimeType` unused | Medium | DOCX heuristics not implemented | Document or implement |
| AI model hardcoded | Medium | `gemini-2.0-flash` hardcoded | Make configurable |
| No idempotency in stage handler | Low | Retry may cause duplicate work | Add in future sprint |
| No performance benchmark | Low | No automated SLA verification | Add in Sprint 4+ |

---

## Verdict

### APPROVED WITH FIXES

Sprint 3 implementation is well-structured, maintains statelessness, and establishes the permanent stage routing pattern. However, **2 High issues must be resolved before merge**:

1. **Section detection handler must invoke `ResumeSectionDetector.detect()`** — Currently the handler only logs an audit entry and returns. The actual section detection work is not performed.
2. **Section detection handler must update `ResumeParseResult` and publish events** — Results must be persisted and `ResumeSectionDetected`/`ResumeSectionDetectionFailed` events must be emitted.

**3 Medium issues should be fixed before merge:**
3. Fix OCR gate to use explicit `payload.ocrText` check instead of `rawContent` fallback
4. Address unused `mimeType` parameter (implement DOCX heuristics or document deferral)
5. Make AI fallback model configurable

**4 Low issues** are acceptable for v1 but must be tracked.

**No critical issues. No security breaches. No multi-tenant leaks.**

---

*Review completed. No code was modified.*
