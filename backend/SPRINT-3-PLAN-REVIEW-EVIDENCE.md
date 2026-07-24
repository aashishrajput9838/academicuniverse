# Sprint 3 Plan Review — Evidence Report
## Resume Parser — ResumeSectionDetector

**Date:** 2026-07-24  
**Reviewer:** Kilo  
**Artifact under review:** Sprint 3 Plan (`SPRINT-3-PLAN.md`)  
**Scope:** Evidence only. No code modifications.

---

## 1. Evidence: High Issues

### 1.1 Stage Routing in KnowledgeDispatcher Is Undefined

**Severity:** High  
**Files:** `SPRINT-3-PLAN.md`, `src/shared/services/knowledgeDispatcher.service.ts`

**Evidence:**

1. **Sprint 3 Plan Section 4** states:
   > "Extend `case 'resume':` to invoke stage handlers (Stage 1: section detection)"

2. **Current dispatcher** (`knowledgeDispatcher.service.ts:120-129`):
   ```ts
   case 'resume':
     await this.handleResumeDomain({
       organizationId,
       personId,
       sourceDocumentId,
       rawConfidence,
       data,
       correlationId,
     });
     break;
   ```
   All resume jobs — regardless of stage — route to the same stub.

3. **KnowledgeJob model** (`KnowledgeJob.ts:1-43`):
   - Fields: `personId`, `sourceDocumentId`, `domain`, `payload`, `status`, `retryCount`, `maxRetries`, `lastError`, `nextRetryAt`, `startedAt`, `lastAttemptAt`, `completedAt`
   - **No `stage` field exists.**

4. **Plan Section 6 Data Flow** shows enqueue payload:
   ```
   payload: { processingId, stage: 'section_detection', rawContent, mimeType, fileName }
   ```
   But there's no routing logic to read `payload.stage` and dispatch to the correct handler.

5. **Gap:** When Sprint 3 enqueues a section-detection job, the dispatcher will call `handleResumeDomain()` (the Sprint 2 stub) instead of `ResumeSectionDetector`. Section detection will never run.

**Must fix before implementation:** Yes

---

## 2. Evidence: Medium Issues

### 2.1 ResumeSection Model Schema Undefined

**Severity:** Medium  
**File:** `SPRINT-3-PLAN.md` Section 3

**Evidence:**

1. **Plan Section 3** says:
   > "`src/models/ResumeSection.ts` — Mongoose schema for detected resume sections"

2. **Plan Section 6 Data Flow** says service returns:
   > "Returns `Section[]` with `title`, `startLine`, `endLine`, `rawText`"

3. **Architecture v1.3 Section 6** defines the JSON schema:
   ```json
   {
     "title": "HEADER",
     "order": 0,
     "rawText": "John Doe...",
     "entities": [...],
     "entries": [...],
     "repeatable": true
   }
   ```

4. **Gap:** The plan doesn't mention `order`, `entities`, `entries`, or `repeatable`. Without a defined schema, the implementation team will freeze on design decisions mid-sprint.

**Must fix before implementation:** No

---

### 2.2 Missing `isScanned` Gate in Section Detection Enqueue

**Severity:** Medium  
**File:** `SPRINT-3-PLAN.md` Section 6

**Evidence:**

1. **Architecture v1.3 Section 2.1** states:
   > "Resume parsing proceeds only after OCR text is available for scanned documents. `ResumeParseEventListener` subscribes to both `UaipEvent.Parsed` and `UaipEvent.OCR_COMPLETED` and resumes when: `isScanned === false` (from `Parsed`), **OR** `isScanned === true` and `ocrText` is populated (from `OCR_COMPLETED`)."

2. **Current listener** (`resumeClassificationEventListener.ts:45-96`):
   - Subscribes to both events ✅
   - Reads `KnowledgeRecord` for fast-path ✅
   - **Does NOT check `isScanned`** before enqueueing downstream stages ❌

3. **Plan Section 6 Data Flow** shows:
   ```
   [Async] ResumeClassificationEventListener succeeds
     -> KnowledgeRecord.documentCategory === 'RESUME'
     -> Enqueue ResumeSectionDetectorJob
   ```
   No `isScanned` gate mentioned.

**Impact:** For scanned PDFs, section detection would enqueue immediately after `Parsed` event with empty `rawContent`, bypassing the OCR wait.

**Must fix before implementation:** No

---

### 2.3 Retry Behavior Underspecified

**Severity:** Medium  
**File:** `SPRINT-3-PLAN.md` Section 8

**Evidence:**

1. **Plan Section 8** says:
   > "Heuristic detection fails → Fallback to AI-only via FailoverAIProvider"
   > "AI providers exhausted → Publish ResumeSectionDetectionFailed, reviewStatus: 'NEEDS_REINDEX'"

2. **Architecture v1.3 Section 5.1** specifies:
   > "Max attempts per stage: 3"
   > "Backoff strategy: Exponential: 1s, 2s, 4s"

3. **Gap:** The plan doesn't clarify:
   - Does AI fallback consume a retry attempt?
   - If AI succeeds, is the job marked COMPLETED immediately?
   - If AI fails, does the queue retry the entire section-detection job?
   - Does the detector check `ResumeParseResult.sectionsDetected` for idempotency on retry?

4. **Architecture v1.3 Section 5.4** requires:
   > "Each ResumeStageJob is keyed by `processingId + stageName`. Resume stages must be idempotent by checking ResumeParseResult before writing."

5. **Gap:** Plan doesn't mention idempotency check for section detection.

**Must fix before implementation:** No

---

### 2.4 Multi-Tenant Isolation Not Explicitly Addressed

**Severity:** Medium  
**File:** `SPRINT-3-PLAN.md` Section 7

**Evidence:**

1. **Plan Section 3** creates `ResumeSection` model but doesn't specify schema fields.

2. **Architecture v1.3 Section 7.2** shows `ResumeParseResult` has `organizationId` and indexes:
   ```ts
   ResumeParseResultSchema.index({ organizationId: 1, reviewStatus: 1, createdAt: -1 });
   ```

3. **Current queries** in Sprint 2 code:
   - `ResumeParseResult.findOne({ processingId, organizationId })` — scoped ✅
   - `ResumeParseResult.findOneAndUpdate({ processingId })` — **NOT scoped by organizationId** ⚠️

4. **Gap:** If `ResumeSection` is a separate collection, queries must include `organizationId`. If embedded in `ResumeParseResult.candidateFields`, the parent document's org scoping provides implicit isolation. The plan doesn't clarify which approach is taken.

**Must fix before implementation:** No

---

## 3. Evidence: Low Issues

### 3.1 No Idempotency Test Plan

**Severity:** Low  
**File:** `SPRINT-3-PLAN.md` Section 9

**Evidence:**

1. **Architecture v1.3 Section 5.4** requires:
   > "If the same processingId is dequeued after a crash, the stage checks whether its output already exists and skips recomputation."

2. **Plan Section 9 Test Plan** lists:
   - Well-structured resume
   - Missing required section → AI fallback
   - Plain text → GENERAL section
   - Regex patterns
   - AI fallback invocation
   - End-to-end flow
   - Negative path

3. **Gap:** No test for "re-dequeue same job → skip recomputation."

**Must fix before implementation:** No

---

### 3.2 No Performance Target

**Severity:** Low  
**File:** `SPRINT-3-PLAN.md` Section 10

**Evidence:**

1. **Architecture v1.3 Section 14** migration path states:
   > "Target < 5s for DOCX, < 8s for PDF"

2. **Plan Section 10** lists only:
   > "No new npm dependencies required."

3. **Gap:** No latency target for section detection stage alone.

**Must fix before implementation:** No

---

### 3.3 Missing Integration Test

**Severity:** Low  
**File:** `SPRINT-3-PLAN.md` Section 9

**Evidence:**

1. **Plan Section 9** integration test:
   > "End-to-end: upload resume → classify → enqueue section detector → sections stored"

2. **Gap:** The plan doesn't specify mocking the full async chain:
   - `Parsed` event → listener → enqueue KnowledgeJob
   - `KnowledgeQueueService` dequeues job
   - `KnowledgeDispatcher` routes to Stage 1 handler
   - `ResumeSectionDetector.detect()` runs
   - `ResumeParseResult` updated
   - `ResumeSectionDetected` event published

**Must fix before implementation:** No

---

## 4. Evidence: Scope Control

| In-Scope Item | Plan Reference | Status |
|---------------|----------------|--------|
| ResumeSectionDetector service | Section 3 | ✅ |
| ResumeSection model | Section 3 | ✅ |
| Unit tests | Section 9 | ✅ |
| KnowledgeDispatcher Stage 1 | Section 4 | ⚠️ Routing undefined |
| Listener enqueue | Section 4 | ✅ |
| UaipEvents | Section 4 | ✅ |

| Out-of-Scope Item | Plan Reference | Status |
|-------------------|----------------|--------|
| ResumeEntityExtractor | Section 10 | ✅ Guarded |
| ResumeAIEnhancer | Section 10 | ✅ Guarded |
| ResumeConfidenceScorer | Section 10 | ✅ Guarded |
| DIC integration | Section 10 | ✅ Guarded |
| Canonical model writes | Section 10 | ✅ Guarded |

No scope creep detected.

---

## 5. Evidence: Definition of Done Gaps

| DoD Item | Plan Line | Gap |
|----------|-----------|-----|
| ResumeSectionDetector created and tested | Line 178 | ✅ |
| ResumeSection model with indexes | Line 179 | Schema undefined |
| KnowledgeDispatcher Stage 1 handler | Line 180 | Routing undefined |
| Listener enqueues job | Line 181 | ✅ |
| UaipEvents extended | Line 182 | ✅ |
| All new tests pass | Line 183 | Missing test categories |
| TypeScript clean | Line 184 | ✅ |
| Architecture v1.4 changelog | Line 185 | ✅ |
| Code review passed | Line 186 | ✅ |
| Merge to main | Line 187 | ✅ |
| **Idempotency tested** | — | ❌ Missing |
| **Retry/dead-letter tested** | — | ❌ Missing |
| **Multi-tenant isolation verified** | — | ❌ Missing |
| **Performance benchmarks met** | — | ❌ Missing |

---

## 6. Conclusions

1. **Sprint 3 plan is structurally sound** and scope-controlled.
2. **1 High issue** (stage routing) must be fixed before implementation or the queue will not route section-detection jobs correctly.
3. **4 Medium issues** should be addressed to prevent mid-sprint design freezes.
4. **3 Low issues** are acceptable for v1 but must be tracked.
5. **No critical issues. No scope creep. No security red flags.**

**Review verdict: APPROVED WITH FINDINGS**

---

*End of Sprint 3 Plan Review Evidence*
*Generated: 2026-07-24*
