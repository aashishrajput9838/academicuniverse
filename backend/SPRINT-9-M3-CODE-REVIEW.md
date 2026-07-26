# Sprint 9 M3 Code Review

**Reviewer:** Senior Staff Engineer  
**Date:** 2026-07-26  
**Commit:** `5814fb5`  
**Milestone:** M3 — Rate Limiting & Production Hardening  
**Verdict:** NEEDS FIXES BEFORE MERGE

---

## Executive Summary

M3 implementation correctly adds MongoDB-backed rate limiting, async PDF page streaming, and DOCX size validation. However, 4 MEDIUM findings and 3 LOW findings must be resolved before merge. No HIGH findings were identified. The most critical issue is the non-atomic rate-limit check-then-increment pattern, which allows concurrent request bypass under load.

---

## Findings

### HIGH

| ID | Finding | File | Line | Impact |
|----|---------|------|------|--------|
| — | None | — | — | — |

### MEDIUM

| ID | Finding | File | Line | Impact |
|----|---------|------|------|--------|
| M1 | Rate limit check-then-increment is non-atomic | `rateLimit.ts` | 23-38 | Concurrent requests from same org can bypass the 10-upload limit |
| M2 | DOCX size check validates compressed buffer, not unzipped size | `resumeParserController.ts` | 94 | Does not satisfy plan requirement of "unzipped size check"; a 51MB compressed DOCX can unzip to >100MB |
| M3 | `isDocxMagic` exported from controller file | `resumeParserController.ts` | 25 | Utility leakage; violates separation of concerns and bloats controller module |
| M4 | `getImagesToProcess` materializes all pages into memory | `DocumentExtractionEngine.ts` | 159-163 | Async generator benefit is negated; memory optimization does not extend to downstream consumer |

### LOW

| ID | Finding | File | Line | Impact |
|----|---------|------|------|--------|
| L1 | `RateLimitAttempt.windowStart` semantic is confusing | `RateLimitAttempt.ts` | 15 | Field name implies fixed time-window boundary, but value moves forward on creation |
| L2 | Missing TTL cleanup verification test | `rateLimit.middleware.test.ts` | — | No test verifies expired records are ignored by the middleware |
| L3 | Missing concurrent rate-limit behavior test | `rateLimit.middleware.test.ts` | — | No test verifies limit holds under parallel requests |

---

## Detailed Findings & Recommendations

### M1 — Non-Atomic Rate Limit Check-Then-Increment

**Observation:** `rateLimit` first does `findOne` to check `attempts >= maxAttempts`, then does `findOneAndUpdate` to increment. Between these two operations, a concurrent request can pass the check and also increment, causing the effective limit to exceed `maxAttempts`.

**Why it matters:** A malicious or accidental burst of parallel requests from the same org can exceed the intended rate limit. Under high concurrency, the effective limit becomes `maxAttempts + concurrentRequests`.

**Recommendation:** Replace the check-then-increment sequence with an atomic `findOneAndUpdate` that increments and returns the updated document in one round-trip:
```typescript
const record = await RateLimitAttempt.findOneAndUpdate(
  {
    organizationId,
    endpoint: options.endpoint,
    windowStart: { $gte: windowStart },
  },
  {
    $inc: { attempts: 1 },
    $setOnInsert: { organizationId, endpoint, windowStart: now, lastAttemptAt: now },
    $set: { lastAttemptAt: now },
  },
  { new: true, upsert: true, setDefaultsOnInsert: true }
);

if (record.attempts > options.maxAttempts) {
  // return 429
}
```

Also handle the case where `findOneAndUpdate` returns `null` (should not happen with upsert, but defensive coding is warranted).

### M2 — DOCX Size Check Uses Compressed Buffer Length

**Observation:** The plan explicitly requires "DOCX unzipped size check (cap at 50MB)." The implementation checks `buffer.length > 50 * 1024 * 1024`, where `buffer` is the compressed upload received from multer. DOCX is a ZIP archive; compressed size is typically smaller than unzipped size, so a 51MB compressed file can easily unzip to >100MB.

**Why it matters:** The implementation does not satisfy the frozen plan acceptance criterion. Large malicious DOCX files can bypass the intended 50MB unzipped cap.

**Recommendation:** Either:
1. Add lightweight ZIP central-directory parsing to estimate unzipped size before accepting the file, or
2. Document the check as a "compressed size guardrail" and treat the true unzipped size validation as a downstream pipeline safeguard, or
3. Reject DOCX files where compressed size already approaches 50MB, accepting that this is a conservative proxy.

If option 1 is not feasible in M3, document it in the evidence as a known limitation and schedule true unzipped-size validation for M4 or a follow-up sprint.

### M3 — `isDocxMagic` Exported from Controller

**Observation:** `isDocxMagic` and `isPdfMagic` are pure validation utilities. They are now exported from `resumeParserController.ts`, which means any module can import validation logic from a controller file.

**Why it matters:** This couples validation logic to the controller layer. If the controller changes or is split, these utilities become orphaned. It also bloats the controller's public API.

**Recommendation:** Move `isPdfMagic` and `isDocxMagic` to a shared validation utility, e.g., `src/utils/fileValidation.ts`, and import them into the controller.

### M4 — Async Generator Benefit Negated by Materialization

**Observation:** `renderPdfPages` now yields pages lazily, but `getImagesToProcess` immediately iterates the generator and accumulates all pages into an array before returning. The downstream `processImages` still iterates the full array synchronously.

**Why it matters:** The memory optimization is incomplete. For a 100-page PDF at 300 DPI, all rendered images are still held in memory simultaneously. The generator pattern only helps if consumers process pages lazily.

**Recommendation:** This is acceptable for M3 scope if the next milestone (M4 or future) refactors `processImages` to consume pages lazily. Document this as a known interim state in the evidence file. Do not merge without the explicit note that memory optimization is partial.

---

## L1 — Confusing `windowStart` Semantic

**Observation:** `RateLimitAttempt.windowStart` is set to `now` on creation, but queried as a threshold (`$gte: windowStart`). The field name suggests a fixed time window, but its value slides forward.

**Why it matters:** Future operators debugging rate-limit behavior may misinterpret the field. It also means there is no true "window 1", "window 2" bucketing.

**Recommendation:** Rename the field to `createdAt` or add a comment clarifying that it represents the record creation time, not a fixed window boundary.

### L2 — Missing TTL Expiration Test

**Observation:** No test verifies that a `RateLimitAttempt` record older than the TTL window is ignored by the middleware.

**Why it matters:** If the TTL index misbehaves or is not created, old records could accumulate and cause unexpected rate-limiting behavior.

**Recommendation:** Add a test that mocks `findOne` with a record whose `windowStart` is older than `windowMinutes`, asserting the request is allowed and a new record is created.

### L3 — Missing Concurrent Behavior Test

**Observation:** No test sends multiple parallel requests through the middleware to verify the limit holds.

**Why it matters:** The non-atomic implementation (M1) would pass naive sequential tests but fail under concurrency.

**Recommendation:** Add a parallel-request test that fires `maxAttempts + 1` simultaneous requests and asserts exactly one receives `429`.

---

## Architecture v1.7 Compliance

| Requirement | Status | Notes |
|-------------|--------|-------|
| No breaking API changes | PASS | `/parse-upload` and `/parse-status` behavior unchanged for compliant clients |
| Existing service interfaces unchanged | PASS | `IDocumentExtractionEngine` interface preserved |
| No new canonical models | PASS | `RateLimitAttempt` is an operational/security collection, not a new domain model |
| Auth + org isolation preserved | PASS | Rate limiting applied after `authenticateUser` and `enforceOrgIsolation` |
| Multi-tenant safety | PASS | Limits scoped per `organizationId` |
| No new npm dependencies | PASS | Uses only existing Mongoose driver |

---

## Test Quality Assessment

| Test | Coverage | Gap |
|------|----------|-----|
| `rateLimit` under limit | Good | — |
| `rateLimit` exceeded | Good | — |
| `rateLimit` missing org context | Good | — |
| DOCX magic validation | Good | — |
| DOCX size threshold | Good | — |
| PDF upload success | Good | — |
| Async generator mock | Good | — |
| Rate limit TTL expiration | GAP | Missing |
| Concurrent rate-limit behavior | GAP | Missing |
| `isDocxMagic` edge cases | Partial | Only valid/invalid magic tested |

---

## Production Readiness Assessment

| Area | Status | Gap |
|------|--------|-----|
| Correctness | CONDITIONAL | Race condition in rate-limit increment must be fixed |
| Observability | PASS | Logs on magic-byte failure, size failure, rate-limit error |
| Error handling | PASS | Catches DB errors and passes to Express error handler |
| Graceful degradation | PASS | Rate-limit DB failure falls through to `next(error)` rather than blocking all traffic |
| Security | PASS | Rate limit scoped to org; magic-byte validation prevents naive bypass |
| Memory | CONDITIONAL | Async generator benefit only partial; needs follow-up |
| Performance | PASS | Single DB query per rate-limited request under normal operation |
| Monitoring | GAP | No metrics or counters for rate-limit hits/misses |

---

SPRINT 9 M3 CODE REVIEW COMPLETE

VERDICT: NEEDS FIXES BEFORE MERGE

READY FOR REVIEW FIXES
