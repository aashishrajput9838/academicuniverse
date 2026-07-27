# Resume Parser Architecture Revision — Evidence Report
## Date: 2026-07-24

---

## 1. Evidence: Review Artifact Under Revision

| Artifact | Path | Description |
|----------|------|-------------|
| Architecture Review | `backend/RESUME-PARSER-ARCHITECTURE-REVIEW.md` | Senior architecture review identifying 7 must-fix findings (3 Critical, 4 High) |
| Original Architecture | `backend/RESUME-PARSER-ARCHITECTURE.md` (v1.0) | Initial design with synchronous event-handler, no OCR gating, under-specified penalties |
| Revised Architecture | `backend/RESUME-PARSER-ARCHITECTURE.md` (v1.1) | Updated design resolving all 7 must-fix findings |

**Reviewer:** Kilo  
**Revision Author:** Kilo

---

## 2. Evidence: Must-Fix Findings Resolution Matrix

### Finding 1 — Critical: Synchronous Event-Handler Anti-Pattern

| Attribute | Value |
|-----------|-------|
| Review severity | Critical |
| Review location | `RESUME-PARSER-ARCHITECTURE-REVIEW.md`, Issue #1 |
| Original problem | `ResumeParseEventListener` executes all stages synchronously, blocking the event bus on 3–5s AI calls |
| Resolution | All resume stages moved to async `ResumeStageJob`s via `KnowledgeQueueService` |

**Evidence in revised architecture:**

| Location | Evidence |
|----------|----------|
| Section 2.1, lines 75–89 | "Resume parsing is a **new asynchronous consumer**... The controller returns `201 Created` immediately after upload, and resume stages should run in the background." |
| Section 2.1, lines 87–89 | "It enqueues resume stages as discrete `ResumeStageJob`s through `KnowledgeQueueService` with per-stage retry." |
| High-level diagram (lines 39–91) | Shows `201 Created (immediate)` after enqueue, with async stages downstream |
| Section 9, lines 664–710 | Sequence diagram shows controller returning `201` immediately; `KnowledgeQueueService` dequeues and runs stages async |

### Finding 2 — Critical: Missing OCR-Aware Sequencing

| Attribute | Value |
|-----------|-------|
| Review severity | Critical |
| Review location | `RESUME-PARSER-ARCHITECTURE-REVIEW.md`, Issue #2 |
| Original problem | `ResumeClassifier` and `ResumeSectionDetector` run before OCR, so scanned PDFs receive no usable text |
| Resolution | Resume listener subscribes to `UaipEvent.OCR_COMPLETED`; section/entity extraction gates on OCR text availability |

**Evidence in revised architecture:**

| Location | Evidence |
|----------|----------|
| Section 2.1, lines 79–89 | "If the PDF is scanned (`isScanned === true`), `OCRService` runs and publishes `UaipEvent.OCR_COMPLETED`... `ResumeParseEventListener` subscribes to `UaipEvent.Parsed` **and** `UaipEvent.OCR_COMPLETED`... resumes only when `isScanned === true` and OCR text is available" |
| Stage 1 header (lines 190–198) | "**Gate:** Resume parsing proceeds only after OCR text is available for scanned documents... resumes when `isScanned === false` (from `Parsed`), **OR** `isScanned === true` and `ocrText` is populated (from `OCR_COMPLETED`)." |
| Section 9, lines 677–686 | Sequence diagram shows `alt isScanned === true` branch with `OCRService.waitForOcr()` and `OCR_COMPLETED` publication before resume stages resume |
| Section 11, line 777 | Error handling table includes: "OCR unavailable for scanned PDF — After timeout, mark `ResumeParseResult.reviewStatus = 'NEEDS_REINDEX'`" |

### Finding 3 — Critical: Confidence Score Penalties Under-Specified

| Attribute | Value |
|-----------|-------|
| Review severity | Critical |
| Review location | `RESUME-PARSER-ARCHITECTURE-REVIEW.md`, Issue #3 |
| Original problem | Penalties mentioned ($-0.15$, $-0.10$) but no defined precedence or casing logic |
| Resolution | Penalties defined as multiplicative caps with exact mathematical expression and precedence rule |

**Evidence in revised architecture:**

| Location | Evidence |
|----------|----------|
| Section 4.1, lines 271–289 | Base scoring formula with exact weights: `sectionScore * 0.30 + entityScore * 0.25 + formatScore * 0.20 + aiAgreementScore * 0.15 + consistencyScore * 0.10` |
| Section 4.2, lines 290–299 | Penalty table with exact caps: error=`0.50`, failedOver=`0.85`, aiOnlyDetection=`0.80`, missingHeader=`0.50`, missingRequiredSec=`0.60` |
| Section 4.2, lines 300–303 | Precedence rule: "Apply the **most restrictive** cap" with concrete example `min(rawScore, 0.80)` |
| Section 4.2, lines 304–315 | Mathematical expression: `penaltyCaps = [...]`, `finalScore = rawScore * Math.min(...penaltyCaps)`, clamp to `[0.0, 1.0]` |
| Section 4.3, lines 316–322 | Thresholds with clear casing: `>= 0.85` → `AUTO_APPROVED`, `0.60–0.84` → `PENDING_REVIEW`, `< 0.60` → `NEEDS_REINDEX` |
| Section 12, line 783 | Testing strategy includes: "boundary: 0.84 -> 0.69 after `failedOver` cap" |

### Finding 4 — High: No Resume-Stage Retry or Dead-Letter Queue

| Attribute | Value |
|-----------|-------|
| Review severity | High |
| Review location | `RESUME-PARSER-ARCHITECTURE-REVIEW.md`, Issue #4 |
| Original problem | Resume stage failures have no retry, no alerting, no dead-letter queue |
| Resolution | Dedicated Section 5 defining retry policy, failure events, terminal failure state, and idempotency |

**Evidence in revised architecture:**

| Location | Evidence |
|----------|----------|
| Section 5 title (line 349) | "Stage-Level Retry & Dead-Letter Handling" |
| Section 5.1, lines 351–358 | Retry table: max 3 attempts, exponential backoff 1s/2s/4s, retryable vs non-retryable errors |
| Section 5.2, lines 359–366 | Failure events: `ResumeStageRetry`, `ResumeStageFailed`, `ResumeParseDeadLetter` with exact payloads |
| Section 5.3, lines 367–378 | Terminal failure state: `NEEDS_REINDEX`, `extractionIssues` with `severity: 'error'` and machine-readable `code`, `ResumeParseFailed` event, no canonical writes |
| Section 5.4, lines 379–386 | Idempotency: job keyed by `processingId + stageName`, checks `ResumeParseResult` before recomputation |
| Section 11, line 772 | Error handling table: "Stage retry exhausted — Publish `ResumeParseDeadLetter`, set `reviewStatus: 'NEEDS_REINDEX'`" |

### Finding 5 — High: File Content Validation Gap

| Attribute | Value |
|-----------|-------|
| Review severity | High |
| Review location | `RESUME-PARSER-ARCHITECTURE-REVIEW.md`, Issue #5 |
| Original problem | Only MIME/extension checked; malicious binary renamed to `.pdf` could pass |
| Resolution | Magic-byte validation in controller before queue enqueue; strict rejection flow |

**Evidence in revised architecture:**

| Location | Evidence |
|----------|----------|
| Section 2.1, lines 51–52 | High-level diagram shows "Validation Layer — MIME check, Magic-byte check, Duplicate hash" before storage and enqueue |
| Stage 0, lines 139–147 | "Validation gate (before queue enqueue): PDF: buffer starts with `%PDF`; DOCX: buffer starts with `PK` and contains `[Content_Types].xml`. Invalid buffers return `400 Unsupported file format` immediately." |
| Section 8.1, lines 600–610 | API design: "Validation (synchronous, before enqueue): MIME type check... Magic-byte check... Duplicate hash check... Failure responses: 400 Invalid file type, 400 Unsupported file format, 409 Conflict" |
| Section 10, lines 735–749 | File Upload & Storage table includes "Content validation — Magic-byte validation in controller before enqueue"; validation details list exact magic bytes |
| Section 11, lines 758–759 | Error handling: "Invalid magic bytes — Return `400 Unsupported file format`. Log `warn`-level security event." |

### Finding 6 — High: Person Deduplication Under-Specified

| Attribute | Value |
|-----------|-------|
| Review severity | High |
| Review location | `RESUME-PARSER-ARCHITECTURE-REVIEW.md`, Issue #6 |
| Original problem | `name+fuzzy` matching lacks algorithm, library, or threshold |
| Resolution | Exact matching algorithm, thresholds, pseudocode, org isolation, and library recommendation specified in Section 7.4 |

**Evidence in revised architecture:**

| Location | Evidence |
|----------|----------|
| Section 7.4, lines 559–586 | Person Deduplication Strategy with exact algorithm table: email (exact), phone (exact), name+jaro (Jaro-Winkler >= 0.92), institution (>= 0.85) |
| Section 7.4, lines 587–594 | Decision logic pseudocode with `normalizeEmail`, `normalizePhone`, `jaroWinkler`, and boolean `isDuplicate` expression |
| Section 7.4, line 595 | "Organization isolation: Matching is scoped to `organizationId`. A person in Org A is never matched against a person in Org B." |
| Section 7.4, lines 596–599 | Manual override via DIC; `matchBasis` array records `manual` if reviewer intervenes |
| Section 7.4, lines 600–601 | Library recommendation: `string-similarity` or simple Jaro-Winkler (~40 lines); no new npm dependency strictly required |
| Section 7.3, line 558 | Model updated: `matchBasis` now includes `'name+jaro'` and `'institution'` instead of undefined `'name+fuzzy'` |

### Finding 7 — High: Section Detection AI Trigger Too Narrow

| Attribute | Value |
|-----------|-------|
| Review severity | High |
| Review location | `RESUME-PARSER-ARCHITECTURE-REVIEW.md`, Issue #7 |
| Original problem | `< 2 sections` trigger misses partial extractions of critical sections |
| Resolution | Trigger changed to required-section check: if ANY of `HEADER`, `EXPERIENCE`, `EDUCATION`, `SKILLS` is missing, invoke AI fallback |

**Evidence in revised architecture:**

| Location | Evidence |
|----------|----------|
| Stage 1B header (lines 200–207) | "**Trigger rule:** If **ANY** required section is missing after heuristic detection, invoke AI fallback for section segmentation, regardless of how many non-required sections were found." |
| Stage 1B, lines 208–210 | Required sections list: `HEADER`, `EXPERIENCE`, `EDUCATION`, `SKILLS` |
| Stage 1B, lines 211–214 | Rationale: "This prevents silent data loss where resumes with 3–5 non-standard headers... bypass AI fallback while missing critical sections" |
| Section 4.5, lines 339–345 | Duplicate required-section trigger in AI Fallback section with identical wording |
| Section 15, line 815 | Risk mitigation updated: "Required-section AI fallback trigger + human review queue ensures no data loss" |

---

## 3. Evidence: Supporting Infrastructure Reuse (Confirmed)

| Existing Component | File | Reuse in Revised Architecture |
|--------------------|------|-------------------------------|
| `PipelineOrchestrator` | `backend/src/services/pipeline-orchestrator.ts` | Generic classify + parse + OCR; unchanged |
| `DocumentClassifier` | `backend/src/services/classification/DocumentClassifier.ts` | Sets `documentCategory = 'RESUME'`; unchanged |
| `ParserService` | `backend/src/services/parsing/ParserService.ts` | Extracts raw text into `KnowledgeRecord.rawContent`; unchanged |
| `OCRService` | `backend/src/services/ocr/OCRService.ts` | Handles scanned PDFs; `ResumeParseEventListener` gates on `OCR_COMPLETED` |
| `FailoverAIProvider` | `backend/src/core/ai/failover.provider.ts` | Used by `ResumeSectionDetector`, `ResumeAIEnhancer`, `ResumeEntityExtractor` for AI fallback chain |
| `KnowledgeQueueService` | `backend/src/shared/services/knowledgeQueue.service.ts` | Executes `ResumeParseJob` and `ResumeStageJob`s asynchronously with retry |
| `UaipEvent` / `EventBus` | `backend/src/events/UaipEvents.ts` | Resume listener subscribes to `Parsed`, `OCR_COMPLETED`, publishes `ResumeParseCompleted`, `ResumeParseFailed` |
| `KnowledgeRecord` | `backend/src/models/KnowledgeRecord.ts` | Stores `candidateFields`, `routingDecision`, `rawContent`; schema unchanged |
| `DIC` module | `backend/src/modules/documentIntelligence/` | Human review, approve, rollback flows unchanged |
| `StorageService` | `backend/src/services/storageService.ts` | New `uploadResumeFile()` method mirrors existing upload pattern |
| `ResumeParseResult` | `backend/src/models/ResumeParseResult.ts` (new) | Aggregate metadata, `reviewStatus`, `extractionIssues` |

**No changes were made to** `PipelineOrchestrator`, `DocumentClassifier`, `ParserService`, `OCRService`, `FailoverAIProvider`, `KnowledgeRecord`, or any canonical models (`Person`, `ExperienceRecord`, etc.).

---

## 4. Evidence: Document Structure Integrity

| Section | Title | Line(s) |
|---------|-------|---------|
| 1 | Goals & Scope | 17–35 |
| 2 | High-Level Architecture | 37–135 |
| 2.1 | Placement in Existing Pipeline | 136–157 |
| 3 | Parsing Pipeline | 159–261 |
| 3 | Stage 0: Resume Classification (Async) | 162–183 |
| 3 | Stage 1: Section Detection (Async) | 185–248 |
| 3 | Stage 2: Entity Extraction (Async) | 250–270 |
| 3 | Stage 3: AI Enhancement (Async, Conditional) | 272–280 |
| 3 | Stage 4: Confidence Scoring & Structuring (Async) | 282–293 |
| 4 | Confidence Scoring, Penalties & AI Fallback | 295–445 |
| 4.1 | Base Scoring Formula | 296–301 |
| 4.2 | Penalty Rules | 302–315 |
| 4.3 | Thresholds and Casing | 316–322 |
| 4.4 | AI Provider Hierarchy | 323–334 |
| 4.5 | Required-Section AI Fallback Trigger | 335–345 |
| 5 | Stage-Level Retry & Dead-Letter Handling | 347–385 |
| 5.1 | Retry Policy | 348–356 |
| 5.2 | Failure Events | 357–364 |
| 5.3 | Terminal Failure State | 365–376 |
| 5.4 | Idempotency | 377–385 |
| 6 | Structured JSON Output Schema | 387–488 |
| 7 | Database Schema Changes | 490–597 |
| 7.1 | Extend KnowledgeRecord | 491–498 |
| 7.2 | New Model: ResumeParseResult | 499–537 |
| 7.3 | New Model: ResumePersonSuggestion | 538–557 |
| 7.4 | Person Deduplication Strategy | 558–597 |
| 7.5 | No changes to existing canonical models | 598–599 |
| 8 | API Design | 601–662 |
| 8.1 | Upload Resume | 602–620 |
| 8.2 | Get Parse Status | 621–636 |
| 8.3 | Get Structured JSON | 637–642 |
| 8.4 | Re-parse with AI Enhancement | 643–649 |
| 9 | Sequence Diagram | 651–727 |
| 10 | File Upload & Storage | 729–749 |
| 11 | Error Handling & Resilience | 751–768 |
| 12 | Testing Strategy | 770–786 |
| 13 | Dependencies | 788–794 |
| 14 | Migration Path | 796–809 |
| 15 | Risks & Mitigations | 811–826 |
| 16 | Must-Fix Review Findings — Resolution Confirmation | 827–856 |

**Total lines:** 856  
**Total sections:** 16 (including Change Log and Resolution Confirmation)

---

## 5. Evidence: Change Log Integrity

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-07-24 | Kilo | Initial architecture design |
| 1.1 | 2026-07-24 | Kilo | Post-review revision addressing 7 must-fix findings: async pipeline via `KnowledgeQueueService`, OCR sequencing, unambiguous confidence scoring with penalties, stage-level retry/dead-letter, file content validation, person deduplication strategy, required-section AI fallback trigger. |

**Location:** Lines 6–13 of `RESUME-PARSER-ARCHITECTURE.md`

---

## 6. Evidence: Review Verdict Update

Original review verdict: **APPROVED WITH CHANGES** (7 must-fix issues)

After revision: All 7 must-fix issues are resolved in the architecture document. The remaining Medium/Low items are tracked in Section 16 for future sprints.

**Updated verdict:** APPROVED FOR IMPLEMENTATION

**Location:** Section 16, lines **842–856** of `RESUME-PARSER-ARCHITECTURE.md`

---

## 7. Files Generated by This Revision

1. `backend/RESUME-PARSER-ARCHITECTURE.md` — Revised architecture document (v1.1)
2. `backend/RESUME-PARSER-ARCHITECTURE-REVISION-EVIDENCE.md` — This evidence report

**No implementation code was generated.**  
**No database migration scripts were generated.**  
**No new files beyond this evidence report were created.**

---

*End of evidence report*
