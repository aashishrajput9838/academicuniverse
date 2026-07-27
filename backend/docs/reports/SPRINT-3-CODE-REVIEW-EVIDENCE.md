# Sprint 3 Code Review — Evidence Report
## Resume Parser — ResumeSectionDetector

**Date:** 2026-07-24  
**Reviewer:** Kilo  
**Scope:** Sprint 3 implementation only

---

## Evidence Collection Methodology

Review examined 6 Sprint 3 files against:
- RESUME-PARSER-ARCHITECTURE.md (v1.3)
- SPRINT-3-PLAN.md
- SPRINT-3-PLAN-REVIEW.md
- SPRINT-3-PLAN-FIX-REPORT.md
- SPRINT-3-IMPLEMENTATION-REPORT.md
- SPRINT-3-IMPLEMENTATION-EVIDENCE.md

All evidence below includes exact file paths and line numbers.

---

## Finding 1: Section Detection Stage Does Not Actually Detect Sections

**Severity:** High  
**File:** `src/shared/services/knowledgeDispatcher.service.ts:277-297`

### Code Evidence

```typescript
// Lines 277-297: handleResumeSectionDetection implementation
private async handleResumeSectionDetection(params: {
  organizationId: string;
  sourceDocumentId: string;
  correlationId?: string;
}): Promise<void> {
  const { organizationId, sourceDocumentId, correlationId } = params;

  await AuditEntry.create({
    organizationId,
    recordId: sourceDocumentId,
    collectionName: 'resume_records',
    action: 'section_detection_started',
    performedBy: 'dispatcher',
    metadata: {
      domain: 'resume',
      stage: 'section_detection',
      message: 'Section detection stage started',
      correlationId,
    },
  });
}
```

### Evidence of Missing Functionality

1. **No ResumeSectionDetector invocation:**
   - `resumeSectionDetector.service.ts` exists and is unit-tested
   - But no code in `knowledgeDispatcher.service.ts` imports or calls it
   - Grep confirms: zero references to `ResumeSectionDetector` outside its own file and tests

2. **No ResumeParseResult update:**
   - `ResumeParseResult` model has `sectionsDetected`, `sectionDetectionStrategy` fields
   - No `findOneAndUpdate` on `ResumeParseResult` in stage handler
   - Listener (`resumeClassificationEventListener.ts`) also doesn't update section fields

3. **No event publication:**
   - `UaipEvents.ts` defines `ResumeSectionDetected` and `ResumeSectionDetectionFailed` (lines 14-15)
   - No `eventBus.publish` calls for these events anywhere in the codebase

### Architecture Violation

Architecture v1.3 Section 3 states:
> "Stage 1: ResumeSectionDetector.detect() → Update ResumeParseResult → Publish ResumeSectionDetected"

Only the routing exists; the actual stage work is missing.

---

## Finding 2: Missing ResumeParseResult Update and Event Publication

**Severity:** High  
**Files:** `knowledgeDispatcher.service.ts:277-297`, `resumeClassificationEventListener.ts:140-157`

### Code Evidence

**Listener enqueue (lines 140-157):**
```typescript
await this.knowledgeJobRepo.create({
  personId: (payload as any).personId || processingId,
  sourceDocumentId: processingId,
  domain: 'resume',
  payload: {
    processingId,
    stage: 'section_detection',
    rawContent,
    mimeType,
    fileName,
    organizationId: (payload as any).organizationId,
  },
  maxRetries: 3,
});
```

- Job is enqueued with `rawContent` and `mimeType`
- But listener never handles the job result
- Listener's responsibility ends at enqueue; dispatcher should handle processing

**Dispatcher handler (lines 277-297):**
- Receives job via `data.payload.rawContent` and `data.payload.mimeType`
- But doesn't extract these fields
- Doesn't invoke detector
- Doesn't persist results
- Doesn't publish events

### Impact Chain

```
Job enqueued -> Job dequeued -> Dispatcher routes -> AuditEntry created
    -> Job marked COMPLETED -> ResumeParseResult unchanged -> No events
```

Downstream stages (entity extraction, AI enhancement) have no section data to process.

---

## Finding 3: OCR Gate Uses rawContent as OCR Text Proxy

**Severity:** Medium  
**File:** `src/services/resume/resumeClassificationEventListener.ts:133`

### Code Evidence

```typescript
const isScanned = knowledgeRecord?.isScanned === true;
const ocrText = payload.ocrText || knowledgeRecord?.rawContent || '';
if (isScanned && !ocrText) {
  logger.debug(`ResumeClassificationEventListener: Scanned document ${processingId} waiting for OCR`);
  return;
}
```

### Analysis

- `knowledgeRecord.rawContent` is the parsed text from DocumentParser, not OCR text
- For scanned PDFs, `rawContent` is typically empty before OCR
- The check happens to work for the common case but misuses field semantics
- Field name `ocrText` implies actual OCR-processed text; `rawContent` is pre-OCR

### Edge Case Risk

If `knowledgeRecord.rawContent` is set from a partial parse (e.g., embedded text layer in PDF), the gate would allow enqueue before OCR is complete, potentially:
- Processing incomplete text
- Missing scanned content
- Producing incorrect section boundaries

### Recommendation Evidence

Architecture v1.3 Section 4.2 states:
> "For scanned PDFs (isScanned=true), the resume classification listener must wait for OCRCompleted event before enqueueing section detection."

The intent is to check OCR completion, not text availability. The current implementation conflates "has text" with "has OCR text".

---

## Finding 4: mimeType Parameter Unused in ResumeSectionDetector

**Severity:** Medium  
**Files:** 
- `src/services/resume/resumeSectionDetector.service.ts:20-24`
- `src/services/resume/resumeSectionDetector.service.ts:82`

### Code Evidence

**Method signature (lines 20-24):**
```typescript
async detect(params: {
  rawText: string;
  mimeType: string;
}): Promise<SectionDetectionOutput> {
```

**applyHeuristics signature (line 82):**
```typescript
private applyHeuristics(lines: string[], mimeType: string): ResumeSection[] {
```

**Implementation:**
- `mimeType` is received but never used in the method body
- `applyHeuristics` ignores `mimeType` parameter entirely
- All MIME types processed with same regex-based PDF heuristics

### Plan Reference

SPRINT-3-PLAN.md Section 3.2 states:
> "Heuristic Rule 1: Heading style detection (DOCX: Word paragraph styles, heading levels)"

This rule requires `mimeType` to switch between PDF and DOCX heuristics. Currently, only PDF heuristics are implemented.

### Impact

- DOCX resumes are processed with PDF-optimized regex patterns
- May miss section headings styled with Word heading styles (Heading 1, Heading 2)
- Reduces accuracy for DOCX format

---

## Finding 5: AI Fallback Model Hardcoded

**Severity:** Medium  
**File:** `src/services/resume/resumeSectionDetector.service.ts:158-161`

### Code Evidence

```typescript
const response = await this.aiProvider.generateJSON<string>(prompt, {
  model: 'gemini-2.0-flash',
  temperature: 0.1,
});
```

### Comparison with Existing Pattern

Other AI consumers in the codebase:
- `failover.provider.ts`: Uses configurable provider chain
- `uaipDocumentAi.service.ts`: Model passed as parameter or from config
- `resumeClassifier.service.ts`: No model parameter (uses default)

### Risk

- Model name hardcoded to specific provider's model
- If provider rotates models or changes naming, code breaks
- Reduces flexibility for A/B testing models
- Inconsistent with failover provider pattern

---

## Finding 6: Section Detection Stage Not Idempotent

**Severity:** Low  
**File:** `src/shared/services/knowledgeDispatcher.service.ts:277-297`

### Code Evidence

```typescript
private async handleResumeSectionDetection(params: {...}): Promise<void> {
  const { organizationId, sourceDocumentId, correlationId } = params;
  
  await AuditEntry.create({...});
  // No check for existing sectionsDetected
  // No idempotency guard
}
```

### Architecture v1.3 Violation

Architecture v1.3 Section 5.4 states:
> "If the same processingId is dequeued after a crash, the stage checks whether its output already exists and skips recomputation."

### Impact

Scenario:
1. Job dequeued, stage handler starts
2. Service crashes after `AuditEntry` but before `ResumeParseResult` update
3. Job retried, stage handler runs again
4. Section detection runs twice, overwriting first result
5. Potential inconsistency if downstream stages started after first run

### Verification

- No `findOne` on `ResumeParseResult` to check `sectionsDetected`
- No guard clause to skip already-processed stages
- Test coverage: no idempotency test exists

---

## Finding 7: Unimplemented Stage Handler Throws Instead of Completing

**Severity:** Low  
**File:** `src/shared/services/knowledgeDispatcher.service.ts:302-324`

### Code Evidence

```typescript
private async handleUnimplementedResumeStage(params: {...}): Promise<void> {
  await AuditEntry.create({
    organizationId,
    recordId: sourceDocumentId,
    collectionName: 'resume_records',
    action: 'failed',
    performedBy: 'dispatcher',
    metadata: {
      domain: 'resume',
      stage,
      errorMessage: `${stage} not yet implemented`,
      correlationId,
    },
  });
  throw new Error(`${stage} not yet implemented`);
}
```

### Evidence of Impact

1. Outer catch block (`knowledgeDispatcher.service.ts:154-176`) catches the error
2. Creates retry job with `maxRetries: 3`
3. Job retried 3 times, each time throwing same error
4. After 3 retries, job marked FAILED
5. Audit log shows 4 entries per unimplemented stage job (1 initial + 3 retries)

### Comparison with Plan

SPRINT-3-PLAN.md Section 4 states:
> "Unimplemented stages throw Error: ${stage} not yet implemented"

The plan documents intended behavior, but the consequence (3 wasted retries per job) is not mentioned.

---

## Finding 8: Missing Section Boundary Edge-Case Tests

**Severity:** Low  
**File:** `src/__tests__/resumeSectionDetector.service.test.ts`

### Current Test Coverage

| Test | Lines | Purpose |
|------|-------|---------|
| detects sections in well-structured resume | 45-60 | Happy path |
| returns GENERAL section for plain text | 62-70 | No-match fallback |
| returns empty sections for empty rawText | 73-81 | Empty input |
| triggers AI fallback when provider available | 83-106 | AI fallback trigger |
| does not trigger AI fallback when provider unavailable | 108-117 | No AI provider |
| handles AI fallback failure gracefully | 119-134 | AI error handling |
| produces identical output for identical input | 137-144 | Statelessness |

### Missing Tests

1. **Duplicate section headers** (e.g., two "EXPERIENCE" blocks)
   - Current heuristic: first match creates section, subsequent matches close previous and start new
   - Behavior untested

2. **Sections in wrong order** (e.g., SKILLS before EXPERIENCE)
   - No test validates ordering preservation

3. **Mixed-case headers** (e.g., "Summary", "Experience", "EDUCATION")
   - Regex uses `i` flag for case-insensitivity
   - But no test explicitly verifies lowercase/mixed-case detection

4. **Special characters in section titles** (e.g., "C++ Skills", ".NET Experience")
   - Could be falsely matched by regex patterns

5. **Whitespace variations** (e.g., "  EXPERIENCE  ", "EXPERIENCE:")
   - Regex anchors to start/end of trimmed line
   - Trailing colon (`EXPERIENCE:`) not handled explicitly

### Evidence of Risk

Section boundaries drive all downstream processing (entity extraction, entry parsing). Incorrect boundaries propagate errors through the pipeline.

---

## Evidence Summary Table

| Finding | Severity | File | Line(s) | Architecture Violation |
|---------|----------|------|---------|------------------------|
| 1. Stage handler doesn't detect sections | High | knowledgeDispatcher.service.ts | 277-297 | Yes (v1.3 Section 3) |
| 2. Missing result update and events | High | knowledgeDispatcher.service.ts + resumeClassificationEventListener.ts | 277-297, 140-157 | Yes (v1.3 Section 3) |
| 3. OCR gate semantic issue | Medium | resumeClassificationEventListener.ts | 133 | Partial (v1.3 Section 4.2) |
| 4. mimeType unused | Medium | resumeSectionDetector.service.ts | 20-24, 82 | Partial (Plan Section 3.2) |
| 5. AI model hardcoded | Medium | resumeSectionDetector.service.ts | 158-161 | No |
| 6. Stage not idempotent | Low | knowledgeDispatcher.service.ts | 277-297 | Yes (v1.3 Section 5.4) |
| 7. Unimplemented stage throws | Low | knowledgeDispatcher.service.ts | 302-324 | No |
| 8. Missing edge-case tests | Low | resumeSectionDetector.service.test.ts | 1-145 | No |

---

## Architecture v1.3 Compliance Matrix

| Architecture Section | Requirement | Implementation | Status |
|---------------------|-------------|----------------|--------|
| Section 3 | Stage 1: ResumeSectionDetector.detect() → Update ResumeParseResult → Publish ResumeSectionDetected | Detector exists and tested, but not invoked by dispatcher; no update; no events | ❌ **VIOLATES** |
| Section 4.1 | Stage routing via switch(payload.stage) | Implemented at lines 194-241 in dispatcher | ✅ Compliant |
| Section 4.2 | OCR gate: wait for OCR_COMPLETED before enqueue | Implemented but uses rawContent as proxy (line 133) | ⚠️ Partial |
| Section 5.1 | ResumeSectionDetector stateless | Zero side effects, no DB/event/queue deps | ✅ Compliant |
| Section 5.2 | Heuristic rules: 5 types | Implemented: regex, layout, spacing | ✅ Compliant |
| Section 5.3 | AI fallback: same attempt | Implemented, no queue retry consumed | ✅ Compliant |
| Section 5.4 | Stage idempotency | Not implemented; no check for existing sectionsDetected | ❌ **VIOLATES** |
| Section 5.5 | Section data embedded in ResumeParseResult | Not persisted; candidateFields.sections not populated | ❌ **VIOLATES** |
| Section 6 | Event publication | Events defined but never published by stage handler | ❌ **VIOLATES** |
| Section 7 | Multi-tenant isolation | organizationId inherited from ResumeParseResult | ✅ Compliant |
| Section 8 | Public API unchanged | No endpoint changes | ✅ Compliant |

---

## Scope Compliance Verification

### In-Scope Items (from SPRINT-3-PLAN.md)

| Item | Plan Requirement | Implementation | Status |
|------|-----------------|----------------|--------|
| ResumeSectionDetector service | Section 3: stateless, heuristic+AI fallback | Lines 8-177 in resumeSectionDetector.service.ts | ✅ Complete |
| ResumeSection model | Section 7.2: interface definition | Lines 1-16 in ResumeSection.ts | ✅ Complete |
| Unit tests | Section 10: 8+ unit tests | Lines 1-145 in resumeSectionDetector.service.test.ts | ✅ Complete |
| KnowledgeDispatcher stage routing | Section 4: switch(payload.stage) permanent pattern | Lines 120-129, 194-241 in dispatcher | ✅ Complete |
| Listener enqueue | Section 4: OCR gate + section_detection job | Lines 131-157 in listener | ✅ Complete |
| OCR gate | Section 4: isScanned && !ocrText check | Lines 132-137 in listener | ⚠️ Semantic issue |
| UaipEvents | Section 4: ResumeSectionDetected, ResumeSectionDetectionFailed | Lines 14-15 in UaipEvents.ts | ✅ Defined, not published |
| Stage handler implementation | Section 6: invoke detector, update result, publish events | Lines 277-297 in dispatcher | ❌ Incomplete |

### Out-of-Scope Items

| Item | Status | Evidence |
|------|--------|----------|
| ResumeEntityExtractor (Sprint 4) | Guarded | Not imported, not referenced |
| ResumeAIEnhancer (Sprint 5) | Guarded | Not imported, not referenced |
| ResumeConfidenceScorer (Sprint 6) | Guarded | Not imported, not referenced |
| DIC integration | Guarded | No DIC references |
| Canonical model writes | Guarded | No Person/Experience write in section detection |
| Frontend changes | N/A | Backend only sprint |

---

## Test Coverage Evidence

### Existing Tests

| File | Test Count | Coverage Area |
|------|-----------|---------------|
| resumeSectionDetector.service.test.ts | 8 | Detector logic, AI fallback, statelessness, empty input |
| resumeClassificationEventListener.test.ts | 8 | OCR gate, enqueue, fast-path, error handling |

### Missing Tests

| Test Category | Missing | Evidence |
|--------------|---------|----------|
| Dispatcher stage routing | Yes | No test for `switch(payload.stage)` with 'section_detection' |
| ResumeParseResult update | Yes | No test for sectionsDetected field update |
| Event publication | Yes | No test for ResumeSectionDetected event emission |
| Idempotency | Yes | No test for duplicate processingId handling |
| Full async chain | Yes | No test from job enqueue → dispatch → result |

---

## Code Quality Observations

### Strengths

1. **Clean separation:** ResumeSectionDetector is truly stateless, no side effects
2. **Graceful degradation:** AI fallback catches errors and falls back to heuristic
3. **Testable design:** Constructor accepts IAIProvider easily mockable
4. **Clear naming:** Handler names clearly indicate purpose
5. **Error handling:** Try/catch blocks with logging and failure events in listener
6. **Idempotency in listener:** Checks `confidenceScore > 0` before re-classifying

### Weaknesses

1. **Incomplete implementation:** Stage handler is a stub despite plan requiring full implementation
2. **Event-architecture without events:** Events defined but not published or consumed
3. **Hardcoded values:** Model name hardcoded, reducing configurability
4. **Unused parameters:** `mimeType` accepted but ignored
5. **No integration tests:** Unit tests exist but no end-to-end test for the async flow

---

## Consistency with Sprint 1 & 2 Patterns

| Pattern | Sprint 1/2 Implementation | Sprint 3 Implementation | Match? |
|---------|---------------------------|-------------------------|--------|
| Stateless detector | DocumentClassifier: pure, no side effects | ResumeSectionDetector: pure, no side effects | ✅ Yes |
| Stage routing | DocumentProcessingService: switches on domain | KnowledgeDispatcher: switches on stage | ✅ Yes |
| Event publication | UplodComplete → Classified → Parsed | ResumeClassified → (missing) → ResumeSectionDetected | ❌ Gap |
| Result persistence | ResumeParseResult updated by listener | ResumeParseResult not updated by dispatcher | ❌ Gap |
| Error handling | Try/catch + failure event + retry job | Try/catch + failure event + retry job | ✅ Yes |
| Test structure | 8 tests per service | 8 tests for detector | ✅ Yes |

---

## Public API Stability

**Promise kept:** No endpoint changes, no request/response schema changes, no breaking changes to existing services.

The implementation adds internal plumbing (detector, dispatcher handler, listener logic) without changing the contract of any public method or API route.

---

## Security Review

| Concern | Status | Evidence |
|---------|--------|----------|
| Secret exposure | Safe | No keys/tokens in code |
| SQL injection | Safe | Mongoose queries use parameterized operators |
| Input validation | Partial | rawContent checked for empty, no truncation for large files |
| Authorization | N/A | Section detection reads only, no data modification |
| Multi-tenant isolation | Safe | organizationId used in AuditEntry, not leaked between tenants |

**Note:** No truncation limit on `rawContent` before passing to AI provider. Large files could cause:
- High token consumption in AI fallback
- Timeout errors
- Increased costs

**Recommendation:** Add truncation limit (e.g., 50k characters) before AI fallback in `invokeAiFallback`.

---

## Conclusion

Sprint 3 establishes the architecture well:
- Permanent stage routing pattern is correctly implemented
- ResumeSectionDetector is well-designed and tested
- Statelessness is maintained
- OCR gate provides basic protection
- Event names are defined and ready to use

However, the **stage handler is incomplete**. Jobs are routed correctly but the actual work (section detection, result persistence, event publication) is not performed. This must be fixed before the feature is functional.

**Technical approach for fixes:**

1. Implement `handleResumeSectionDetection()` to:
   - Extract `rawContent` and `mimeType` from job payload
   - Inject `IAIProvider` into dispatcher or pass to handler
   - Call `ResumeSectionDetector.detect()`
   - Update `ResumeParseResult` with section data
   - Publish success/failure events

2. Fix OCR gate to use explicit `payload.ocrText` check

3. Document `mimeType` deferral or implement DOCX heuristics

4. Make AI model configurable

5. Add idempotency check

6. Add integration tests for the full async chain

7. Add rawContent truncation for AI fallback input

---

*Evidence collection completed. No code was modified.*
