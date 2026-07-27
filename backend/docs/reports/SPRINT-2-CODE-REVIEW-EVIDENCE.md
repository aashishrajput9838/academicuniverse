# Sprint 2 Code Review — Evidence Report
## Resume Parser — Classification & Queue Migration

**Date:** 2026-07-24  
**Reviewer:** Kilo  
**Artifact under review:** Sprint 2 implementation  
**Scope:** Evidence only. No code modifications.

---

## 1. Review Scope

| Review Dimension | Scope |
|-----------------|-------|
| Architecture compliance | `RESUME-PARSER-ARCHITECTURE.md` v1.2 vs implementation |
| Statelessness | `ResumeClassifier` dependency graph |
| Event-driven design | `ResumeClassificationEventListener` subscriptions and side effects |
| Queue migration | Controller queue usage; `KnowledgeJobRepository` integration |
| KnowledgeDispatcher | `case 'resume':` handler and stub contract |
| Idempotency | `confidenceScore > 0` check |
| Error handling | Try/catch blocks; failure event publication |
| Multi-tenant safety | `organizationId` scoping in queries |
| Test quality | Coverage of classifier, listener, controller |
| Performance | Stateless service; no DB round-trips in classifier |
| Maintainability | Separation of concerns; ownership clarity |
| Production readiness | Missing items for merge |

---

## 2. Evidence: High Issues

### 2.1 Initial `reviewStatus` Causes False `FAILED` Response

**Severity:** High  
**File:** `src/controllers/resumeParserController.ts:170`, `src/controllers/resumeParserController.ts:253`

**Evidence:**

1. **Line 170** initializes `ResumeParseResult`:
   ```ts
   reviewStatus: 'NEEDS_REINDEX',
   ```

2. **Line 253** in `getParseStatus` maps to `FAILED`:
   ```ts
   status: result.reviewStatus === 'NEEDS_REINDEX' ? 'FAILED' : 'SUCCESS',
   ```

3. **Timeline of failure:**
   - T=0ms: Client uploads resume → Controller creates `ResumeParseResult` with `reviewStatus: 'NEEDS_REINDEX'`
   - T=0ms: Controller returns `201 Created`
   - T=1ms: Client polls `GET /api/resume/parse-status/:processingId`
   - T=1ms: Response body: `{ "status": "FAILED", "reviewStatus": "NEEDS_REINDEX" }`
   - T=5000ms: `ResumeClassificationEventListener` finally runs (after generic pipeline + potential OCR)
   - T=5000ms: `reviewStatus` updated to `'PENDING_REVIEW'` or `'NEEDS_REINDEX'`

4. **Architecture violation:**
   - Architecture v1.2 Section 8.2 specifies `status: "SUCCESS"` for the response schema.
   - The controller returns `FAILED` before any async processing has started.

**Impact:** Users see a failed upload immediately after submission, likely triggering unnecessary re-uploads or support tickets.

**Recommendation:** Change line 170 from `reviewStatus: 'NEEDS_REINDEX'` to `reviewStatus: 'PENDING_REVIEW'` (which maps to `SUCCESS` in the current mapping). The listener will overwrite this within milliseconds in production. For v1, this is sufficient because the listener always updates `ResumeParseResult` shortly after the upload endpoint returns.

**Must fix before merge:** Yes

---

## 3. Evidence: Medium Issues

### 3.1 ResumeClassifier Does Not Wrap DocumentClassifier

**Severity:** Medium  
**File:** `src/services/resume/resumeClassifier.service.ts:1`

**Evidence:**

1. **Sprint 2 Plan Section 3** states:
   > "Wraps `DocumentClassifier.classify()`, applies resume signals (filename 0.6, MIME 0.3, content heuristic 0.1)"

2. **Implementation** (`resumeClassifier.service.ts`):
   - Line 1: Only imports `DocumentCategory` type from `../classification/DocumentClassifier`
   - Lines 22-51: Contains its own signal detection logic (filename regex, MIME set, content heuristic)
   - Does **not** call `DocumentClassifier.classify()`

3. **Deviation:** The plan's design intent was to layer resume signals on top of the existing `DocumentClassifier`. Instead, the implementation is an independent classifier that reimplements MIME detection and content heuristics.

**Impact:** Functional correctness is not affected, but:
- `DocumentClassifier`'s signals (language, isScanned, parserStrategy) are ignored
- If `DocumentClassifier` is updated in the future, `ResumeClassifier` may diverge
- Plan documentation is now inaccurate

**Must fix before merge:** No  
**Recommendation:** Update the Sprint 2 plan to reflect the independent classifier design, OR refactor the listener to read `KnowledgeRecord` first and only invoke `ResumeClassifier` as a boost layer for `UNKNOWN` results.

---

### 3.2 Listener Does Not Leverage Existing DocumentClassifier Result

**Severity:** Medium  
**File:** `src/services/resume/resumeClassificationEventListener.ts:70-76`

**Evidence:**

1. **Listener always calls `ResumeClassifier.classify()`** (line 70):
   ```ts
   const result = this.classifier.classify({
     rawText: rawContent,
     fileName,
     mimeType,
   });
   ```

2. **PipelineOrchestrator** already ran `DocumentClassifier.classify()` before publishing `UaipEvent.Parsed`. The result is stored in `KnowledgeRecord` with `documentCategory` and `confidenceScore`.

3. **Listener does not check `KnowledgeRecord.documentCategory`**: It ignores the existing classification and reclassifies from scratch.

**Impact:** If `DocumentClassifier` already identified a resume with high confidence, the listener redundantly recomputes. In cases where `DocumentClassifier` says `TRANSCRIPT` and `ResumeClassifier` says `RESUME`, the listener overwrites the generic classification without showing precedence.

**Must fix before merge:** No  
**Recommendation:** Add a fast-path check:
```ts
const knowledgeRecord = await KnowledgeRecordModel.findOne({ processingId }).lean().exec();
if (knowledgeRecord?.documentCategory === 'RESUME') {
  // Skip ResumeClassifier; use existing classification
  return this.updateResumeParseResult(processingId, 'RESUME', knowledgeRecord.confidenceScore);
}
```

---

### 3.3 `getParseStatus` Status Mapping Too Broad

**Severity:** Medium  
**File:** `src/controllers/resumeParserController.ts:253`

**Evidence:**

1. **Line 253**:
   ```ts
   status: result.reviewStatus === 'NEEDS_REINDEX' ? 'FAILED' : 'SUCCESS',
   ```

2. **Architecture v1.2 Section 7.2** defines `reviewStatus` enum:
   ```
   'AUTO_APPROVED' | 'PENDING_REVIEW' | 'NEEDS_REINDEX'
   ```

3. **Future risk:** If `'REJECTED'` or any other terminal state is added later, it will incorrectly map to `'SUCCESS'`.

**Impact:** When review workflow expands (DIC rejection), rejected resumes will show as `SUCCESS` to clients.

**Must fix before merge:** No  
**Recommendation:**
```ts
const statusMap: Record<string, 'SUCCESS' | 'FAILED' | 'PENDING'> = {
  'AUTO_APPROVED': 'SUCCESS',
  'PENDING_REVIEW': 'PENDING',
  'NEEDS_REINDEX': 'FAILED',
};
status: statusMap[result.reviewStatus] ?? 'PENDING',
```

---

## 4. Evidence: Low Issues

### 4.1 Event Payloads Lack `organizationId`

**Severity:** Low  
**File:** `src/services/pipeline-orchestrator.ts` (inherited)

**Evidence:**

1. `UaipEventPayload` interface (`src/events/UaipEvents.ts:33-86`) supports `organizationId?: string` (line 52).
2. `PipelineOrchestrator` publishes `Parsed` and `OCR_COMPLETED` events without including `organizationId`.
3. `ResumeClassificationEventListener` must query by `processingId` alone.

**Impact:** Cannot filter events by org at the listener level. Mitigated by non-guessable UUID `processingId`.

**Must fix before merge:** No

---

### 4.2 ResumeClassifier Ignores DocumentClassifier Signals

**Severity:** Low  
**File:** `src/services/resume/resumeClassifier.service.ts`

**Evidence:**

1. `DocumentClassifier.classify()` returns `language`, `isScanned`, `parserStrategy`.
2. `ResumeClassifier.classify()` only receives `rawText`, `fileName`, `mimeType`. It never receives `isScanned` or `language`.
3. Architecture v1.2 Section 3.2 mentions `isScanned` gating: resume processing resumes only after OCR text is available for scanned documents. This is handled by the listener subscribing to both events, not the classifier.

**Impact:** Minimal. The classifier correctly identifies resumes; `isScanned` gating happens at the event-subscription layer.

**Must fix before merge:** No

---

### 4.3 Hardcoded `estimatedCompletionMs`

**Severity:** Low  
**File:** `src/controllers/resumeParserController.ts:213`

**Evidence:**

1. Line 213: `estimatedCompletionMs: 5000`
2. No configuration or dynamic calculation exists.

**Impact:** Minor UX inaccuracy. For a 5-page PDF requiring OCR, actual time may be 15-30s.

**Must fix before merge:** No

---

### 4.4 No Rate Limiting

**Severity:** Low  
**File:** `src/routes/resumeParserRoutes.ts` (inferred)

**Evidence:**

1. Upload endpoint triggers Cloudinary storage + 3 MongoDB writes + 1 queue job per request.
2. No `express-rate-limit` middleware configured for resume routes.

**Impact:** Low for internal beta. Becomes relevant for public launch.

**Must fix before merge:** No

---

## 5. Evidence: Architecture Compliance

### 5.1 Statelessness

**File:** `src/services/resume/resumeClassifier.service.ts`

| Check | Evidence | Status |
|-------|----------|--------|
| No `eventBus` import | Service only imports `DocumentCategory` type | ✅ Pass |
| No DB model import | No `Model` imports | ✅ Pass |
| No queue dependency | No `KnowledgeQueueService` or `KnowledgeJobRepository` | ✅ Pass |
| Method signature | `classify(params: { rawText, fileName, mimeType })` — pure input/output | ✅ Pass |
| Side-effect test | `resumeClassifier.service.test.ts` verifies identical input produces identical output across multiple calls | ✅ Pass |

### 5.2 Event-Driven Design

**File:** `src/services/resume/resumeClassificationEventListener.ts`

| Check | Evidence | Status |
|-------|----------|--------|
| Subscribes to `Parsed` | Line 34: `eventBus.subscribe(UaipEvent.Parsed, ...)` | ✅ Pass |
| Subscribes to `OCR_COMPLETED` | Line 38: `eventBus.subscribe(UaipEvent.OCR_COMPLETED, ...)` | ✅ Pass |
| Side effects in listener | Lines 85-134: DB updates, event publishes | ✅ Pass |
| Classifier has no side effects | `ResumeClassifier` imported but only called, no DB/event/queue ops inside it | ✅ Pass |

### 5.3 Queue Migration

**File:** `src/controllers/resumeParserController.ts`

| Check | Evidence | Status |
|-------|----------|--------|
| No `resumeQueueService` import | Removed | ✅ Pass |
| Direct `KnowledgeJobRepository` usage | Line 189: `knowledgeJobRepo.create({...})` | ✅ Pass |
| No `resumeQueueAdapter` created | File does not exist | ✅ Pass |

### 5.4 KnowledgeDispatcher Stub

**File:** `src/shared/services/knowledgeDispatcher.service.ts`

| Check | Evidence | Status |
|-------|----------|--------|
| `case 'resume':` present | Line 120-129 | ✅ Pass |
| Stub marked clearly | Comment: `// STUB: Sprint 7` | ✅ Pass |
| Job completes successfully | No throw; reaches end of switch | ✅ Pass |
| Audit trail created | `AuditEntry.create()` with `action: 'stubbed'` | ✅ Pass |

### 5.5 Idempotency

**File:** `src/services/resume/resumeClassificationEventListener.ts`

| Check | Evidence | Status |
|-------|----------|--------|
| Idempotency check | Line 64: `existing.confidenceScore > 0` | ✅ Pass |
| Skip re-classification | Returns early if already classified | ✅ Pass |

---

## 6. Evidence: Test Results

### 6.1 New Tests

| Test File | Tests | Result | Coverage |
|-----------|-------|--------|----------|
| `resumeClassifier.service.test.ts` | 8 | All PASS | Classification logic, statelessness, empty input, edge cases |
| `resumeClassificationEventListener.test.ts` | 8 | All PASS | Event handling, idempotency, fallback, error handling |

### 6.2 Full Suite

```
Test Suites: 55 passed, 55 total
Tests:       404 passed, 404 total
```

### 6.3 TypeScript Compilation

```
No TS errors in Sprint 2 files:
- src/services/resume/resumeClassifier.service.ts
- src/services/resume/resumeClassificationEventListener.ts
- src/events/UaipEvents.ts
- src/shared/services/knowledgeDispatcher.service.ts
- src/controllers/resumeParserController.ts
- src/index.ts
```

---

## 7. Evidence: Public API Stability

| Endpoint | Method | Request | Response | Changed? |
|----------|--------|---------|----------|----------|
| `/api/resume/parse-upload` | POST | multipart/form-data | 201 { processingId, fileName, mimeType, size, status, estimatedCompletionMs, resumeParseResultId } | ❌ No |
| `/api/resume/parse-status/:processingId` | GET | - | 200 { processingId, status, confidenceScore, reviewStatus, ... } | ❌ No |

All changes are internal. No new endpoints. No breaking changes to request/response schemas.

---

## 8. Evidence: Sprint 2 Plan Compliance

| Plan Item | Evidence | Status |
|-----------|----------|--------|
| ResumeClassifier created | `src/services/resume/resumeClassifier.service.ts` | ✅ |
| ResumeClassificationEventListener created | `src/services/resume/resumeClassificationEventListener.ts` | ✅ |
| KnowledgeDispatcher `case 'resume':` | `knowledgeDispatcher.service.ts:120-129` | ✅ |
| UaipEvents extended (4 events) | `UaipEvents.ts:10-13` | ✅ |
| Controller uses KnowledgeQueueService directly | `resumeParserController.ts:189` | ✅ |
| ResumeQueueService deprecated | File untouched, not imported | ✅ |
| All new tests pass | 404/404 passing | ✅ |
| TypeScript clean | Zero errors in Sprint 2 files | ✅ |

**Pending (non-code):**
- Architecture v1.3 changelog
- Code review
- Merge to `main`

---

## 9. Conclusions

1. **Sprint 2 implementation is functionally complete** and passes all tests.
2. **1 High issue** (`reviewStatus` initial state) must be fixed before merge.
3. **3 Medium issues** should be addressed before merge for plan consistency and future-proofing.
4. **4 Low issues** are acceptable technical debt for v1.
5. **No critical issues. No security breaches. No multi-tenant leaks.**
6. **Implementation is production-ready pending the High fix and final code review approval.**

**Review verdict: APPROVED WITH FIXES**

---

*End of Sprint 2 Code Review Evidence*
*Generated: 2026-07-24*
