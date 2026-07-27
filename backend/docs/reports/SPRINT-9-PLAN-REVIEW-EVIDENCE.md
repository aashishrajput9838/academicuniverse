# Sprint 9 Plan Review Evidence

## 1. Evidence Sources

### Source Files Inspected
- `backend/src/events/UaipEvents.ts` — Event enum and payload definitions
- `backend/src/services/resume/dicIntegration.service.ts` — `handleReviewAction` implementation
- `backend/src/services/resume/canonicalWrite.service.ts` — `ResumePersonSuggestion` creation patterns
- `backend/src/controllers/resumeParserController.ts` — Parse upload validation and buffer handling
- `backend/src/controllers/reviewController.ts` — Existing review HTTP endpoints
- `backend/src/routes/reviewRoutes.ts` — Review route registration and middleware
- `backend/src/routes/resumeParserRoutes.ts` — Multer configuration and existing guardrails
- `backend/src/middleware/auth.ts` — `authenticateUser` and `authorize` middleware
- `backend/src/models/ResumePersonSuggestion.ts` — Schema, indexes, status enum
- `backend/src/services/ocr/DocumentExtractionEngine.ts` — `pdf-to-img` usage pattern
- `backend/src/shared/services/knowledgeDispatcher.service.ts` — MQ consumer call sites
- `backend/src/__tests__/benchmarks/resumePipeline.benchmark.test.ts` — Benchmark scope and hardware profile
- `backend/PROJECT-INDEX.md` — Sprint 8 completion and v0.8.0 status
- `backend/RELEASE-v0.8.0.md` — Known limitations and next steps

---

## 2. Detailed Finding Evidence

### H1 — Missing Authorization Model for `override-person`

**Evidence:**
- `reviewRoutes.ts:17` applies `authenticateUser, enforceOrgIsolation` to all review routes.
- `reviewRoutes.ts:24-78` shows comment-based access control (`Accessible by: STUDENT (own), FACULTY, ADMIN`) but no actual `authorize()` middleware is applied to any route.
- `reviewController.ts:163-193` (`getRoutingInfo`) similarly has no role check beyond auth + org isolation.

**Implication:** New `POST /review/:processingId/override-person` would inherit no role restriction by default. Any authenticated user in the org could override person matches.

**Fix Evidence:**
- `auth.ts:59-98` shows the existing `authorize(...permissions)` middleware that checks `req.user.permissions`.
- Controller pattern should be: `router.post('/:processingId/override-person', authorize('REVIEW_RESUME', 'OVERRIDE_PERSON_MATCH'), overridePerson);`

---

### H2 — Missing `ResumePersonSuggestionUpdated` Event

**Evidence:**
- `UaipEvents.ts:3-44` defines the full enum. Searched for `ResumePersonSuggestionUpdated` and `ResumePersonSuggestion` across `src/events/` — zero matches outside test mocks.
- `dicIntegration.service.ts:152-199` publishes `ResumeDICRouted` and `ResumeDICRoutingFailed` but never touches `ResumePersonSuggestion`.
- `UaipEvents.ts:46-99` `UaipEventPayload` has no fields for `suggestedPersonId`, `matchBasis`, or `reviewerId` in a person-suggestion context.

**Implication:** Plan to "Add event `ResumePersonSuggestionUpdated`" will fail at compile time or runtime if added without updating the enum.

**Fix Evidence:**
- Enum location: `UaipEvents.ts:10-43`
- Payload extension point: `UaipEvents.ts:75-98` (existing `personId`, `correlationId` fields can be reused)

---

### H3 — Rate Limiter Multi-Instance Risk

**Evidence:**
- `src/middleware/` glob returned: `requestId.ts`, `performanceMonitor.ts`, `errorHandler.ts`, `auth.ts`, `index.ts`. No rate limiter exists.
- `package.json` not yet inspected for `express-rate-limit` dependency. Plan says "No new npm dependencies" — this constrains implementation.

**Implication:** If implemented with `express-rate-limit` + `MemoryStore`, each server instance tracks its own counter. Behind a load balancer, a user could send 5 requests to instance A and 5 to instance B, bypassing the limit.

**Fix Evidence:**
- If external store is disallowed, use `RateLimitAttempt` MongoDB collection with TTL index:
  ```
  { organizationId, createdAt } with expireAfterSeconds: 900
  ```
- This is multi-instance safe and requires no new dependency.

---

### H4 — M1 Implementation Path Unclear

**Evidence:**
- `dicIntegration.service.ts:132-203` — `handleReviewAction` is a method on `DicIntegrationService`, exported as singleton at `dicIntegration.service.ts:225`.
- `knowledgeDispatcher.service.ts` calls `dicIntegrationService.handleReviewAction(...)` in the MQ consumer path (verified via grep results showing calls at line 891 and M1 service lines 61, 81, 99, 119, 152, 168, 182, 192).
- `reviewController.ts` calls `reviewService.approve()` / `reject()` / `rollback()` — there is no call to `dicIntegrationService.handleReviewAction` from the review HTTP path.

**Implication:** Reviewer HTTP override cannot flow through `handleReviewAction` without either:
(a) Calling it from `reviewService.approve`, or
(b) Inlining the logic in `reviewService`.

Option (b) is preferable to avoid coupling review HTTP path to DIC MQ terminology.

---

### M1 — No Idempotency

**Evidence:**
- `reviewController.ts` patterns show no idempotency key handling in any endpoint.
- `ResumePersonSuggestion` schema (`ResumePersonSuggestion.ts:15-23`) has no `version` or `idempotencyKey` field.

**Fix Evidence:**
- Add `version: { type: Number, default: 1 }` to schema.
- Require `version` in request body; on successful update, increment.
- Reject with `409 Conflict` if `req.body.version !== currentVersion`.

---

### M2 — Optimistic Locking

**Evidence:**
- `ResumePersonSuggestion.ts:15-23` schema has no concurrency control.
- `reviewService.approve` in `reviewController.ts:97` calls service without version parameter.

**Fix Evidence:**
- Add `version` field (see M1 idempotency above).
- Controller should fetch current document, compare version, update with `$inc: { version: 1 }`.

---

### M3 — Audit Trail Gap

**Evidence:**
- `reviewController.ts` delegates to `reviewService.saveDraft`, `reject`, `approve`, `rollback`. None of these interact with `ResumePersonSuggestion`.
- No audit log collection or schema was found in `src/models/` related to person overrides.
- `handleReviewAction` only updates `ResumeParseResult.reviewStatus` and publishes events; it does not append to any audit trail.

**Fix Evidence:**
- New collection: `ReviewAuditLog` with fields: `processingId`, `action`, `actorId`, `previousValue`, `newValue`, `timestamp`.
- Insert from controller after successful override.

---

### M4 — Benchmark SLA Ambiguity

**Evidence:**
- `resumeParserController.ts:48` — `parseUpload` returns immediately with `processingId`. The actual work is async via `knowledgeJobRepo.create`.
- `resumePipeline.benchmark.test.ts:1-28` measures "per-stage latency" for individual service methods in unit tests with mocks.
- Plan says "Validate `< 5s` end-to-end SLA" but does not specify if this is API response, enqueue time, or full pipeline completion.

**Fix Evidence:**
- Define SLA as: "Time from `POST /resume/parse-upload` to `ResumeParseCompleted` event publish must be < 5s for PDFs < 10 pages in staging."
- Add a new benchmark or synthetic monitor that measures actual async pipeline completion in a staging-like environment.

---

### M5 — Redundant 10MB Guardrail

**Evidence:**
- `resumeParserRoutes.ts:8-13` explicitly sets:
  ```
  limits: { fileSize: 10 * 1024 * 1024 }
  ```
- Plan M3 says: "Add request-size validation (10MB guardrail)".

**Fix:** Rename plan item to "Verify and document existing 10MB multer guardrail" or remove redundancy.

---

### M6 — DOCX Memory Expansion

**Evidence:**
- `resumeParserController.ts:90-96` validates DOCX magic bytes but does not limit uncompressed size.
- ZIP/DOCX files can expand 5-10x in memory during extraction.
- Architecture v1.7 Section 16 lists "DOCX streaming" under backlog, implying it is not yet handled.

**Fix:** Add explicit unzipped size check if DOCX streaming is added. Otherwise document that DOCX files > 2MB compressed may cause memory pressure.

---

### L1 — Test Count Criterion

**Evidence:**
- Plan line 96: "Full suite remains green" — the 542+ number is not present in plan evidence or benchmark docs.
- Current test count varies by run; hardcoding a number encourages test-count gaming rather than coverage quality.

**Fix:** Replace with "Full regression suite remains green; zero dropped test cases."

---

### L2 — pdf-to-img Memory Pattern

**Evidence:**
- `DocumentExtractionEngine.ts:165-194` renders all PDF pages into an array literal before returning:
  ```
  const images = [];
  for await (const page of pages) { images.push(...); }
  return images;
  ```
- Plan M3 says "stream via `pdf-to-img` instead of loading full buffer" but the `pdf-to-img` usage in the codebase itself collects all pages.

**Fix:** For Sprint 9 partial scope, refactor `renderPdfPages` to yield pages one at a time via async generator, or process pages inline without storing the full array.

---

## 3. Missing Items Not in Original Plan

| Missing Item | Recommendation |
|--------------|----------------|
| No new npm dependencies | PASS if using MongoDB rate-limit store; FAIL if `express-rate-limit` + Redis is chosen |
| AI result caching by fileHash | Remains in v1.1 backlog; not blocking |
| Section alias registry collection | Remains in v2; not blocking |
| Person dedup fallback | Acceptable per RELEASE-v0.8.0.md |
| Dispatcher health hardcoded | Acceptable per RELEASE-v0.8.0.md |

---

## 4. Architecture v1.7 Compliance Summary

| Requirement | Status |
|-------------|--------|
| Backward compatible | PASS |
| No new canonical models | PASS |
| Auth + org isolation | PARTIAL — needs role guard additions |
| Event contracts | FAIL — new event not yet in enum |
| MongoDB indexes | PASS — no index changes required |
| Multi-tenant isolation | PARTIAL — endpoint needs org + role validation |

---

SPRINT 9 PLAN REVIEW EVIDENCE COMPLETE
