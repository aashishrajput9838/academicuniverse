# Resume Parser Architecture Review
## Senior Architecture Review — Academic Universe Backend
**Date:** 2026-07-24  
**Reviewer:** Kilo  
**Artifact under review:** `backend/RESUME-PARSER-ARCHITECTURE.md`  
**Scope:** Design review only. No implementation changes.

---

## Review Summary

| Perspective | Verdict |
|-------------|---------|
| Scalability | Mostly sound; one blocking anti-pattern |
| Maintainability | Good; clear service boundaries |
| Reuse of existing infrastructure | Strong; minor gaps in OCR event integration |
| Event-driven consistency | Needs correction around async sequencing |
| Multi-tenant safety | Adequate; missing org-boundary checks |
| AI cost optimization | Present but naive; no caching |
| Failure recovery | Weak; missing retry/dead-letter for resume stages |
| Security | Major gap in content validation |
| Performance | Acceptable for v1; memory risk on large PDFs |
| Future extensibility | Acceptable for v1; some hardcoded assumptions |

**Overall Verdict:** APPROVED WITH CHANGES

Seven issues must be resolved before implementation. Three are Critical, four are High. The remaining issues are Medium/Low and can be addressed iteratively post-MVP.

---

## Critical Issues

### 1. Synchronous Event-Handler Anti-Pattern
- **Severity:** Critical
- **Explanation:** `ResumeParseEventListener` executes all four stages (section detection, entity extraction, AI enhancement, confidence scoring) synchronously inside the event handler. Gemini calls alone can take 3–5 seconds. If the event bus subscriber blocks, it holds the handler and risks backpressure or missed events from other pipeline stages.
- **Recommendation:** Decompose resume processing into async stages using the existing `KnowledgeQueueService` (`src/shared/services/knowledgeQueue.service.ts`) or publish intermediate events (`ResumeSectionsDetected`, `ResumeEntitiesExtracted`) that the listener consumes asynchronously. The controller should return `201 Created` immediately after upload, and resume stages should run in the background.
- **Must fix before implementation:** Yes

### 2. Missing OCR-Aware Sequencing for Scanned Resumes
- **Severity:** Critical
- **Explanation:** The sequence diagram shows `ResumeClassifier` running before `PipelineOrchestrator` and `ParserService`. In the generic pipeline, OCR happens *before* parsing for scanned PDFs (see `pipeline-orchestrator.ts` lines 85–99). If `ResumeClassifier` and `ResumeSectionDetector` run pre-OCR on a scanned PDF, they receive no usable text. The architecture states "reuses existing OCRService" but provides no event path or sequencing for resume-specific processing after OCR completes.
- **Recommendation:** Either (a) move resume-specific classification/section detection to run *after* OCR in the pipeline, or (b) subscribe `ResumeParseEventListener` to `UaipEvent.OCR_COMPLETED` in addition to `UaipEvent.Parsed`, and gate section/entity extraction on OCR text availability.
- **Must fix before implementation:** Yes

### 3. Confidence Score Penalties Are Under-Specified
- **Severity:** Critical
- **Explanation:** Section 4.2 lists penalties (`-0.15` for AI fallback, `-0.10` for AI-only section detection, `-0.20` for missing HEADER) but Section 4.4 (score formula) shows only maximum component scores. There is no defined precedence or casing logic for these penalties. If implementers omit penalties, high-quality rule-based extractions that happen to use AI fallback will receive `AUTO_APPROVED` incorrectly, polluting canonical records.
- **Recommendation:** Move penalties into the scoring formula. Example: `final = rawScore - (failedOver ? 0.15 : 0) - (aiOnlyDetection ? 0.10 : 0)`. Define clear casing: penalties are multiplicative caps, not just additives. Add unit tests for boundary cases (e.g., `0.88` heuristic score + `-0.15` AI fallback = `0.73` → `PENDING_REVIEW`, not `AUTO_APPROVED`).
- **Must fix before implementation:** Yes

---

## High Issues

### 4. No Resume-Stage Retry or Dead-Letter Queue
- **Severity:** High
- **Explanation:** The generic pipeline has `PipelineOrchestrator` which catches errors and updates `UaipUpload.status = 'FAILED'`. The resume listener operates on `KnowledgeRecord` and `ResumeParseResult` with no equivalent error boundary. If `ResumeEntityExtractor` throws on a malformed section, the event handler fails silently or retries blindly. There is no resume-stage dead-letter queue, no max-retry count, and no alerting.
- **Recommendation:** Wrap each resume stage in its own try/catch. On failure, update `ResumeParseResult.reviewStatus = 'NEEDS_REINDEX'`, log `extractionIssues`, and publish a `ResumeParseFailed` event. Consider reusing the existing `KnowledgeQueueService` for stage-level retries with exponential backoff.
- **Must fix before implementation:** Yes

### 5. File Content Validation Gap (Security)
- **Severity:** High
- **Explanation:** The architecture validates MIME type and file extension only. A user could upload a malicious binary renamed to `.pdf` or `.docx`. `multer` stores the buffer without inspecting magic bytes. While the downstream parsers (`pdf-parse`, `PizZip`) will likely throw on non-conforming files, the error path returns `500` or generic `FAILED` status without a security-relevant log.
- **Recommendation:** Add magic-byte validation in the controller before parsing:
  - PDF: starts with `%PDF`
  - DOCX: starts with `PK` (ZIP header) and contains `[Content_Types].xml`
  Reject non-matching buffers with `400 Unsupported file format` and log a `warn`-level security event.
- **Must fix before implementation:** Yes

### 6. Person Deduplication Is Under-Specified
- **Severity:** High
- **Explanation:** `ResumePersonSuggestion` declares `matchBasis: ('email' | 'phone' | 'name+fuzzy' | 'manual')`, but no fuzzy-matching library, algorithm, or threshold is specified. For Indian university resumes, email/phone are often absent or inconsistent. Without a concrete fuzzy-matching strategy (e.g., `string-similarity` with Jaro-Winkler, or Levenshtein distance >= 0.85), `isNewPerson` will frequently return `true`, creating duplicate `Person` records.
- **Recommendation:** Specify the fuzzy-matching library and threshold. Example: use `string-similarity` with Jaro-Winkler; mark `isNewPerson = false` when `nameSimilarity >= 0.92` AND `(emailMatch OR phoneMatch OR institutionMatch)`. Add an `institutionMatch` basis since resumes typically include college names.
- **Must fix before implementation:** Yes

### 7. AI Fallback Trigger Is Too Narrow for Section Detection
- **Severity:** High
- **Explanation:** Section detection falls back to AI only when heuristics yield `< 2` sections with confidence `< 0.4`. Modern resumes often have 3–5 non-standard headers (e.g., "Highlights", "Core Competencies", "Technical Proficiency", "Certifications", "Leadership"). These may partially match heuristics (2–3 sections found) but still miss critical sections like `SKILLS` or `CERTIFICATIONS`. The current threshold prevents AI fallback, leaving entities unextracted.
- **Recommendation:** Replace the section-count trigger with a required-section check: if ANY of `HEADER`, `EXPERIENCE`, `EDUCATION`, `SKILLS` is missing, trigger AI fallback regardless of total section count. This ensures business-critical data isn't silently dropped.
- **Must fix before implementation:** Yes

---

## Medium Issues

### 8. No AI Result Caching
- **Severity:** Medium
- **Explanation:** Every upload triggers fresh Gemini calls for classification, section detection, and enhancement, even if the same resume (or byte-identical file) was uploaded previously. This wastes AI quota and increases latency.
- **Recommendation:** Cache `ResumeParseResult.rawCandidateFields` keyed by `SHA256(fileBuffer)`. If a duplicate is detected (per-org), return the cached result within 30 days. Cache AI responses for identical section text snippets using a content-hash map in Redis or MongoDB.
- **Must fix before implementation:** No (add in v1.1)

### 9. Rate Limiting Missing on New Endpoint
- **Severity:** Medium
- **Explanation:** `/api/resume/parse-upload` triggers AI calls. A single authenticated user could batch-upload 100 resumes and exhaust the organization's AI quota. The existing `growthRoutes.ts` and `aiRoutes.ts` also lack rate limiting, but resume parsing is particularly cost-sensitive.
- **Recommendation:** Add `express-rate-limit` with per-org sliding window: 10 uploads per hour per organization, with a configurable burst limit. Return `429` with `Retry-After` header.
- **Must fix before implementation:** No (can add in same sprint as endpoint hardening)

### 10. Large PDF Memory Spike
- **Severity:** Medium
- **Explanation:** `pdf-parse` loads the entire file buffer into memory. For 50+ page PDFs or image-heavy resumes, this can spike heap beyond container limits. The architecture asserts "< 8s for PDF" but doesn't address streaming or chunking.
- **Recommendation:** For PDFs > 20 pages or > 5MB, use `pdf-to-img` (already in `package.json`) to convert pages to images, then run OCR in parallel. This bounds memory per page and aligns with the existing OCR infrastructure.
- **Must fix before implementation:** No (acceptable for v1 with documented limitation)

---

## Low Issues

### 11. Hardcoded Section Alias Registry
- **Severity:** Low
- **Explanation:** The `SECTION_ALIASES` map is hardcoded. Departments or organizations may want custom section names (e.g., "Research Experience" vs "Publications"). Every new variant requires a code deploy.
- **Recommendation:** Store section aliases in a `ResumeSectionAlias` collection scoped by `organizationId`. Fall back to the hardcoded map for unknown orgs.
- **Must fix before implementation:** No

### 12. Tight Coupling to Canonical Model Schemas
- **Severity:** Low
- **Explanation:** The routing table hardcodes mapping to specific Mongoose models and fields. If `ExperienceRecord` adds a `location` field, the resume parser doesn't need changes, but if the model is renamed or split, routing breaks. No adapter or versioned mapper exists.
- **Recommendation:** Introduce a `ResumeRoutingModule` that maps section schemas to model versions. For v1, a simple constant map is acceptable.
- **Must fix before implementation:** No

### 13. No Streaming for DOCX
- **Severity:** Low
- **Explanation:** `DocxExtractionService` parses the entire DOCX XML in one `PizZip` load. For resumes with embedded images this is fine, but the service doesn't stream or lazily load tables.
- **Recommendation:** Document the 10MB upload limit as the guardrail. For v2, consider `mammoth` for text-only streaming extraction when placeholders/tables are absent.
- **Must fix before implementation:** No

---

## Strengths

1. **Event-driven extension without modifying the generic pipeline.** Reusing `UaipEvent.Parsed` and `KnowledgeRecord` keeps the change isolated.
2. **Strong reuse of existing AI failover infrastructure.** No new AI provider code is needed.
3. **Human-in-the-loop review via DIC.** Aligns with the existing review workflow (`PENDING_REVIEW` → `APPROVED` / `REJECTED`).
4. **Multi-tenant awareness in new models.** `organizationId` is present in both new collections.
5. **Zero changes to canonical models.** Preserves data integrity; only writes after DIC approval.

---

## Conclusions and Verdict

### Verdict: APPROVED WITH CHANGES

The architecture is fundamentally sound and well-aligned with the existing Academic Universe backend. The event-driven extension, reuse of `FailoverAIProvider`, and DIC integration are strong design choices.

However, **seven issues must be fixed before implementation**:

| # | Issue | Severity | Must Fix? |
|---|-------|----------|-----------|
| 1 | Synchronous event-handler blocking | Critical | Yes |
| 2 | Missing OCR-aware sequencing for scanned PDFs | Critical | Yes |
| 3 | Confidence score penalties under-specified | Critical | Yes |
| 4 | No resume-stage retry / dead-letter queue | High | Yes |
| 5 | File content validation gap | High | Yes |
| 6 | Person deduplication under-specified | High | Yes |
| 7 | Section detection AI trigger too narrow | High | Yes |

After these are resolved, the architecture is ready for implementation. The Medium and Low issues should be tracked in the backlog for v1.1 or v2.

**Recommended action:** Update the architecture document to address issues 1–7, then proceed to implementation scaffolding.

---

*Review completed. No implementation was performed.*
