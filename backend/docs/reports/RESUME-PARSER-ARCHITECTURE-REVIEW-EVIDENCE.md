# Resume Parser Architecture Review — Evidence Report
## Date: 2026-07-24

---

## 1. Evidence: Artifacts Reviewed

| Artifact | Path | Purpose |
|----------|------|---------|
| Architecture Document | `backend/RESUME-PARSER-ARCHITECTURE.md` | Primary artifact under review |
| Evidence Report | `backend/RESUME-PARSER-EVIDENCE-REPORT.md` | Supporting design evidence |
| Pipeline Orchestrator | `backend/src/services/pipeline-orchestrator.ts` | Verified OCR sequencing logic |
| Event Bus | `backend/src/events/UaipEvents.ts` | Verified OCR_COMPLETED / OCR_FAILED events |
| Document Classifier | `backend/src/services/classification/DocumentClassifier.ts` | Verified classification stage |
| Parser Service | `backend/src/services/parsing/ParserService.ts` | Verified parser selection and raw text extraction |
| AI Failover Provider | `backend/src/core/ai/failover.provider.ts` | Verified fallback chain behavior |
| Knowledge Record Model | `backend/src/models/KnowledgeRecord.ts` | Verified mixed-type candidateFields |
| Uaip Upload Model | `backend/src/models/UaipUpload.ts` | Verified fileHash deduplication field |
| UAIP Config | `backend/src/shared/application/uaipConfig.ts` | Verified SUPPORTED_CATEGORIES includes RESUME |
| DIC Controller | `backend/src/modules/documentIntelligence/documentIntelligence.controller.ts` | Verified review workflow endpoints |
| DIC Types | `backend/src/modules/documentIntelligence/documentIntelligence.types.ts` | Verified DicReviewStatus enum |
| Storage Service | `backend/src/services/storageService.ts` | Verified Cloudinary/Firebase upload patterns |
| Resume Routes | `backend/src/routes/resumeRoutes.ts` | Verified existing multer config |
| Confidence Scorer | `backend/src/services/confidenceScorer.service.ts` | Verified existing confidence pattern |
| Backend Package | `backend/package.json` | Verified pdf-parse, pizzip, mammoth, tesseract.js present |
| Index / Server Bootstrap | `backend/src/index.ts` | Verified KnowledgeQueueService existence |
| Event Enums | `backend/src/events/UaipEvents.ts` | Verified UaipEvent, UaipEventPayload definitions |
| Evidence Report (Design) | `backend/RESUME-PARSER-EVIDENCE-REPORT.md` | Reviewed design claims against codebase |

**Total source files reviewed:** 18

---

## 2. Evidence: Issue Verification

### Critical Issue 1 — Synchronous Event-Handler Anti-Pattern
- **Source:** `RESUME-PARSER-ARCHITECTURE.md`, Section 2.1, lines 77–82; Section 8 (Sequence Diagram), lines 491–499.
- **Codebase evidence:** `pipeline-orchestrator.ts` lines 91–98 show the generic pipeline already uses async `OCRService.waitForOcr()`. No equivalent async decomposition is proposed for resume stages.
- **Why critical:** Blocks event bus on AI latency; contradicts the async pattern already established in the codebase.

### Critical Issue 2 — Missing OCR-Aware Sequencing for Scanned Resumes
- **Source:** `RESUME-PARSER-ARCHITECTURE.md`, Section 3 (Stage 0), lines 88–101; Section 8, lines 483–491.
- **Codebase evidence:** `pipeline-orchestrator.ts` lines 85–99 perform OCR *before* `Parsed` event publication. `UaipEvents.ts` lines 7–8 define `OCR_COMPLETED` and `OCR_FAILED`. The architecture does not reference these events for resume-specific continuation.
- **Why critical:** Scanned PDFs would receive no OCR text in section/entity extraction stages, making the parser useless for a common resume format.

### Critical Issue 3 — Confidence Score Penalties Under-Specified
- **Source:** `RESUME-PARSER-ARCHITECTURE.md`, Section 4.2 (Table), lines 226–231; Section 4.4 (Formula), lines 196–208.
- **Codebase evidence:** `confidenceScorer.service.ts` lines 20–23 show the existing pattern caps confidence at `0.5` when errors exist. The new architecture mentions `-0.15` and `-0.10` penalties but provides no equivalent casing logic.
- **Why critical:** Implementers may skip penalties, causing `AUTO_APPROVED` on rule-based extractions that merely happened to use AI fallback, poisoning canonical records.

### High Issue 4 — No Resume-Stage Retry or Dead-Letter Queue
- **Source:** `RESUME-PARSER-ARCHITECTURE.md`, Section 10 (Error Handling), lines 526–535.
- **Codebase evidence:** `pipeline-orchestrator.ts` lines 126–143 update `UaipUpload.status = 'FAILED'` on error. No equivalent `ResumeParseResult` status update is defined.
- **Why high:** Resume stage failures are invisible; no retry, no alerting, no dead-letter queue.

### High Issue 5 — File Content Validation Gap
- **Source:** `RESUME-PARSER-ARCHITECTURE.md`, Section 7.1, lines 427–442; Section 10, line 531.
- **Codebase evidence:** `resumeRoutes.ts` lines 18–23 configure `multer.memoryStorage()` with size limit only. No content-type validation or magic-byte check exists in the proposed flow.
- **Why high:** Security risk; upload acceptance is based on metadata, not content integrity.

### High Issue 6 — Person Deduplication Under-Specified
- **Source:** `RESUME-PARSER-ARCHITECTURE.md`, Section 6.3, lines 398–415.
- **Codebase evidence:** `SkillEvidence.ts` and `SkillAlias.ts` use `organizationId` scoping and `confidence` thresholds, but no fuzzy-matching library is referenced anywhere in `backend/package.json`. The architecture mentions `name+fuzzy` without algorithm details.
- **Why high:** Without concrete fuzzy matching, duplicate `Person` records will proliferate.

### High Issue 7 — Section Detection AI Trigger Too Narrow
- **Source:** `RESUME-PARSER-ARCHITECTURE.md`, Section 3.2, line 139; Section 5 (JSON Schema), lines 249–309.
- **Codebase evidence:** The proposed trigger is `< 2 sections OR confidence < 0.4`. No required-section validation is proposed before this trigger.
- **Why high:** Partial extraction of business-critical sections (EXPERIENCE, EDUCATION) without AI fallback leads to incomplete `candidateFields`.

### Medium Issue 8 — No AI Result Caching
- **Source:** `RESUME-PARSER-ARCHITECTURE.md`, Section 6 (Database Changes), lines 354–396.
- **Codebase evidence:** No cache fields exist in `ResumeParseResult` or `UaipUpload`. The `fileHash` field (line 58 in `UaipUpload`) is sparse-uniqued but never checked before AI processing.
- **Why medium:** Cost and latency impact, not correctness.

### Medium Issue 9 — Rate Limiting Missing
- **Source:** `RESUME-PARSER-ARCHITECTURE.md`, Section 7.1, lines 427–442.
- **Codebase evidence:** `resumeRoutes.ts` and `growthRoutes.ts` have no rate limiter middleware. The architecture adds a new AI-triggering endpoint without rate limiting.
- **Why medium:** Operational cost risk, not immediate correctness.

### Medium Issue 10 — Large PDF Memory Spike
- **Source:** `RESUME-PARSER-ARCHITECTURE.md`, Section 11 (Testing), lines 548; Section 12, lines 553–561.
- **Codebase evidence:** `pdf-parse` is already in `package.json` (line 52). `pdf-to-img` is also present (line 53). The architecture does not reference `pdf-to-img` for memory-bounded processing.
- **Why medium:** Performance risk on edge cases, not everyday operation.

### Low Issue 11 — Hardcoded Section Alias Registry
- **Source:** `RESUME-PARSER-ARCHITECTURE.md`, Section 3.1, lines 112–135; Section 6.4, line 419.
- **Codebase evidence:** No configurable alias store exists in `models/` or `shared/`. All section logic is in-service.
- **Why low:** Maintainability concern.

### Low Issue 12 — Tight Coupling to Canonical Model Schemas
- **Source:** `RESUME-PARSER-ARCHITECTURE.md`, Section 5.1, lines 327–340.
- **Codebase evidence:** `ExperienceRecord.ts`, `AcademicRecord.ts`, `CertificateRecord.ts` are written to only via event handlers (`CandidateApproved`). The resume parser does not write directly, but the routing table hardcodes model names.
- **Why low:** Stable dependency; can be abstracted later.

---

## 3. Evidence: Strengths Confirmed

| Strength | Evidence Source |
|----------|-----------------|
| Event-driven extension without touching generic pipeline | `pipeline-orchestrator.ts`, `UaipEvents.ts`, `documentIntelligence.types.ts` |
| Reuse of FailoverAIProvider | `failover.provider.ts` lines 58–132; `gemini.provider.ts`, `openrouter.provider.ts` |
| DIC human-in-the-loop integration | `documentIntelligence.controller.ts`, `documentIntelligence.service.ts`, `documentIntelligence.types.ts` |
| Multi-tenant safety in new models | `ResumeParseResult` and `ResumePersonSuggestion` both declare `organizationId` |
| Zero changes to canonical models | Architecture Section 6.4; verified by reading `Person.ts`, `ExperienceRecord.ts`, `AcademicRecord.ts`, `CertificateRecord.ts`, `CareerRecord.ts`, `SkillEvidence.ts` |
| No new npm dependencies | `backend/package.json` confirms `pdf-parse`, `pizzip`, `fast-xml-parser`, `mammoth`, `tesseract.js` already present |

---

## 4. Review Methodology

1. Read the architecture document end-to-end.
2. For every claim of reuse, verify the referenced file exists and matches the claimed behavior.
3. For every proposed component, check whether a similar component already exists (to avoid duplication).
4. Evaluate each perspective (scalability, maintainability, etc.) against concrete codebase evidence.
5. Classify issues by severity using: **Critical** = correctness or data-integrity failure; **High** = missing requirement for safe operation; **Medium** = operational risk or cost; **Low** = maintainability or future-proofing.
6. Do not propose full redesigns; only targeted corrections.

---

## 5. Files Generated by This Review

1. `backend/RESUME-PARSER-ARCHITECTURE-REVIEW.md` — Main review document
2. `backend/RESUME-PARSER-ARCHITECTURE-REVIEW-EVIDENCE.md` — This evidence report

---

*End of evidence report*
