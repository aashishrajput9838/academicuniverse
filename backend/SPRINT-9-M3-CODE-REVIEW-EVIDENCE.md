# Sprint 9 M3 Code Review Evidence

**Date:** 2026-07-26  
**Milestone:** M3 — Rate Limiting & Production Hardening  
**Sprint:** 9 — DIC Review & Production Hardening  
**Reviewer:** Senior Staff Engineer  
**Commit Reviewed:** `5814fb5`

---

## 1. Evidence Sources

### Documents
- `backend/SPRINT-9-M3-IMPLEMENTATION-REPORT.md`
- `backend/SPRINT-9-M3-IMPLEMENTATION-EVIDENCE.md`
- `backend/SPRINT-9-PLAN-FREEZE.md`

### Commits
- `5814fb5` — M3 Implementation

### Files Reviewed
- `src/models/RateLimitAttempt.ts`
- `src/middleware/rateLimit.ts`
- `src/middleware/index.ts`
- `src/routes/resumeParserRoutes.ts`
- `src/services/ocr/DocumentExtractionEngine.ts`
- `src/controllers/resumeParserController.ts`
- `src/__tests__/rateLimit.middleware.test.ts`
- `src/__tests__/resumeParser.controller.test.ts`
- `src/services/ocr/__tests__/OCRService.test.ts`

---

## 2. Review Results

| Severity | Count | Status |
|----------|-------|--------|
| HIGH | 0 | — |
| MEDIUM | 4 | NEEDS FIXES |
| LOW | 3 | NEEDS FIXES |

### MEDIUM Findings Evidence

#### M1 — Non-Atomic Rate Limit Check-Then-Increment

**File:** `src/middleware/rateLimit.ts`  
**Lines:** 23-38

```typescript
const record = await RateLimitAttempt.findOne({ organizationId, endpoint, windowStart: { $gte: windowStart } });
if (record) {
  if (record.attempts >= options.maxAttempts) {
    return sendError(res, 429, ...);
  }
  await RateLimitAttempt.findOneAndUpdate({ _id: record._id }, { $inc: { attempts: 1 }, lastAttemptAt: now });
}
```

**Why it matters:** Between `findOne` and `findOneAndUpdate`, concurrent requests can both see `attempts < maxAttempts` and both increment, bypassing the limit. Under 10 concurrent requests, effective limit becomes `maxAttempts + concurrentRequests`.

#### M2 — DOCX Size Check Uses Compressed Buffer Length

**File:** `src/controllers/resumeParserController.ts`  
**Line:** 94

```typescript
if (buffer.length > 50 * 1024 * 1024) {
  return sendError(res, 413, 'DOCX file too large. Unzipped size may exceed 50MB limit.');
}
```

**Why it matters:** `buffer` is the compressed upload. DOCX is ZIP; compressed size is typically smaller than unzipped size. A 51MB compressed DOCX can unzip to >100MB, violating the frozen plan requirement of "unzipped size check (cap at 50MB)."

#### M3 — `isDocxMagic` Exported from Controller

**File:** `src/controllers/resumeParserController.ts`  
**Line:** 25

```typescript
export async function isDocxMagic(buffer: Buffer): Promise<boolean> {
```

**Why it matters:** Pure validation utility leaked into controller public API. Violates separation of concerns.

#### M4 — Async Generator Benefit Negated by Materialization

**File:** `src/services/ocr/DocumentExtractionEngine.ts`  
**Lines:** 159-163

```typescript
const images: Array<...> = [];
for await (const page of this.renderPdfPages(buffer)) {
  images.push(page);
}
return images;
```

**Why it matters:** All pages are still accumulated into memory before processing. For 100-page PDFs, memory optimization is incomplete.

---

### LOW Findings Evidence

#### L1 — Confusing `windowStart` Semantic

**File:** `src/models/RateLimitAttempt.ts`  
**Line:** 15

```typescript
windowStart: { type: Date, required: true, index: true },
```

**Issue:** Field set to `now` on creation, queried as `$gte: windowStart`. Name implies fixed time window, but value slides forward.

#### L2 — Missing TTL Expiration Test

**File:** `src/__tests__/rateLimit.middleware.test.ts`

**Evidence:** No test mocks a `RateLimitAttempt` record with `windowStart` older than `windowMinutes` and asserts the request is allowed.

#### L3 — Missing Concurrent Behavior Test

**File:** `src/__tests__/rateLimit.middleware.test.ts`

**Evidence:** No parallel-request test fires `maxAttempts + 1` simultaneous requests to verify the limit holds under concurrency.

---

## 3. Test Evidence

### Test Results

```
Test Suites: 3 passed, 3 total
Tests:       29 passed, 29 total
Snapshots:   0 total
Time:        3.665 s

Suites:
  src/__tests__/rateLimit.middleware.test.ts
  src/__tests__/resumeParser.controller.test.ts
  src/services/ocr/__tests__/OCRService.test.ts
```

### Test Gaps

| Test | Status |
|------|--------|
| Rate limit under limit | COVERED |
| Rate limit exceeded | COVERED |
| Rate limit missing org context | COVERED |
| DOCX magic validation | COVERED |
| DOCX size threshold | COVERED |
| PDF upload success | COVERED |
| Async generator mock | COVERED |
| TTL expiration behavior | MISSING |
| Concurrent rate-limit behavior | MISSING |

---

## 4. Architecture v1.7 Compliance Evidence

| Requirement | Status | Evidence |
|-------------|--------|----------|
| No breaking API changes | PASS | `/parse-upload` and `/parse-status` behavior unchanged |
| Existing service interfaces unchanged | PASS | `IDocumentExtractionEngine` interface preserved |
| No new canonical models | PASS | `RateLimitAttempt` is operational/security collection |
| Auth + org isolation preserved | PASS | Rate limiting applied after `authenticateUser` and `enforceOrgIsolation` |
| Multi-tenant safety | PASS | Limits scoped per `organizationId` |
| No new npm dependencies | PASS | Uses only existing Mongoose driver |

---

## 5. Production Readiness Evidence

| Area | Status | Evidence |
|------|--------|----------|
| Correctness | CONDITIONAL | Race condition in rate-limit increment (M1) |
| Observability | PASS | Logs on magic-byte failure, size failure, rate-limit error |
| Error handling | PASS | Catches DB errors and passes to Express error handler |
| Graceful degradation | PASS | Rate-limit DB failure falls through to `next(error)` |
| Security | PASS | Rate limit scoped to org; magic-byte validation prevents naive bypass |
| Memory | CONDITIONAL | Async generator benefit only partial (M4) |
| Performance | PASS | Single DB query per rate-limited request under normal operation |
| Monitoring | GAP | No metrics or counters for rate-limit hits/misses |

---

## 6. Commit Record

| Item | Value |
|------|-------|
| **Implementation Commit** | `5814fb5` |
| **Review Date** | 2026-07-26 |
| **Verdict** | NEEDS FIXES BEFORE MERGE |
| **Findings** | 4 MEDIUM, 3 LOW, 0 HIGH |

---

SPRINT 9 M3 CODE REVIEW EVIDENCE COMPLETE
