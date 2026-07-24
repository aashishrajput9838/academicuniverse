# Resume Parser Evidence Report
## Date: 2026-07-24

---

## 1. Evidence of Existing Infrastructure Reuse

The architecture reuses the following existing backend assets to minimize new code and ensure consistency with the established codebase.

### 1.1 Event-Driven Pipeline
- **Existing:** `PipelineOrchestrator` (`src/services/pipeline-orchestrator.ts`) processes uploaded documents via an event bus (`UaipEvent`).
- **Reuse:** Resume parsing is injected as a new `ResumeParseEventListener` that subscribes to `UaipEvent.Parsed` when `documentCategory === 'RESUME'`. No changes are made to `PipelineOrchestrator` or `DocumentClassifier`.

### 1.2 AI Provider with Failover
- **Existing:** `FailoverAIProvider` (`src/core/ai/failover.provider.ts`) wraps primary (`GeminiProvider`) and fallback (`OpenRouterProvider`) with automatic failover on 429/503/quota errors.
- **Reuse:** Resume AI enhancement and section detection call `FailoverAIProvider.generateJSON()` and `generateContent()`. A tertiary `RuleEngine` is invoked programmatically when both AI providers are unavailable.

### 1.3 Document Parsers
- **Existing:** `PdfParser` (`src/services/parsing/pdfParser.ts`) uses `pdf-parse`.
- **Existing:** `DocxExtractionService` (`src/docxExtraction.service.ts`) extracts paragraphs, runs, and styles from DOCX.
- **Reuse:** The resume parser routes buffers through these existing parsers based on MIME type, exactly as `ParserService` does today.

### 1.4 OCR Pipeline
- **Existing:** `OCRService` (`src/services/ocr/OCRService.ts`) handles scanned images/PDFs.
- **Reuse:** If a PDF is flagged `isScanned` or OCR is required, the resume parser sets `status: 'NEEDS_OCR'` and re-enters the pipeline after OCR text is available.

### 1.5 Storage
- **Existing:** `StorageService` (`src/services/storageService.ts`) uploads to Cloudinary and Firebase Storage.
- **Reuse:** A new method `uploadResumeFile()` mirrors `uploadResumeTemplate()`, storing in `academicuniverse/resumes/{orgId}/`.

### 1.6 Document Intelligence Center (DIC)
- **Existing:** `documentIntelligenceRoutes.ts`, `documentIntelligence.controller.ts`, `documentIntelligence.service.ts`, `documentIntelligence.types.ts`.
- **Reuse:** Parsed resumes appear in the DIC list with `documentCategory: 'RESUME'`. Review/approve/rollback flows are identical to existing documents. No DIC schema changes are required.

### 1.7 Existing Canonical Models
- **Existing:** `Person`, `ExperienceRecord`, `AcademicRecord`, `CertificateRecord`, `CareerRecord`, `SkillEvidence`, `SkillAlias`.
- **Reuse:** The resume parser routes extracted entities to these models. It never writes to them directly; writes occur only after DIC approval via the existing event handlers (`AcademicRecordUpdated`, `CertificateApproved`, etc.).

---

## 2. Evidence of New Code Boundaries

| New File | Purpose | Replaces / Extends |
|----------|---------|-------------------|
| `src/services/resume/resumeClassifier.service.ts` | Boosts classification confidence for resumes | Extends `DocumentClassifier` |
| `src/services/resume/resumeSectionDetector.service.ts` | Heuristic + AI section detection | New — not in codebase today |
| `src/services/resume/resumeEntityExtractor.service.ts` | Per-section entity extraction | New — not in codebase today |
| `src/services/resume/resumeAIEnhancer.service.ts` | AI-enhanced re-extraction for low-confidence | New — wraps `FailoverAIProvider` |
| `src/services/resume/resumeConfidenceScorer.service.ts` | Multi-factor confidence scoring | New — not in codebase today |
| `src/services/resume/resumeParseEventListener.ts` | Event bus subscriber linking stages | New — not in codebase today |
| `src/controllers/resumeParserController.ts` | HTTP controller for upload/status/result | New — not in codebase today |
| `src/routes/resumeParserRoutes.ts` | Express router `/api/resume/*` | New — not in codebase today |
| `src/models/ResumeParseResult.ts` | Resume-specific metadata storage | New model |
| `src/models/ResumePersonSuggestion.ts` | Person deduplication suggestions | New model |

**Zero changes** to existing parsers, AI providers, DocumentClassifier, PipelineOrchestrator, or canonical models.

---

## 3. Evidence of Data Flow Integrity

### 3.1 Upload Uniqueness
- `UaipUpload.fileHash` (SHA-256) is computed at upload time. A unique sparse index `{ organizationId: 1, fileHash: 1 }` prevents duplicate uploads within the same tenant.

### 3.2 Organization Isolation
- Every new model (`ResumeParseResult`, `ResumePersonSuggestion`) includes `organizationId: Types.ObjectId`.
- Controllers read `organizationId` from `req.organizationId` (enforced by `enforceOrgIsolation` middleware).

### 3.3 Idempotency
- `ResumeParseEventListener` uses `processingId` as the idempotency key.
- `KnowledgeRecordModel.updateOne({ processingId }, ...)` is safe to retry.
- If an upload event is published twice, the second run finds `status: 'SUCCESS'` and skips (mirrors `PipelineOrchestrator` pattern).

### 3.4 No Orphaned Records
- `ResumeParseResult` references `processingId`.
- If an upload is soft-deleted via DIC, a cascade or scheduled job can mark `ResumeParseResult.status = 'DELETED'`.
- Canonical models (`ExperienceRecord`, etc.) are never written directly; they are only created on explicit DIC approval events.

---

## 4. Evidence of Confidence Scoring Logic

### 4.1 Component Scores

| Component | Max Score | Description |
|-----------|-----------|-------------|
| Section detection | 0.30 | Were required sections (HEADER, EXPERIENCE, EDUCATION, SKILLS) found? Were titles unique and ordered? |
| Entity completeness | 0.25 | Are required entities populated per section (name+email in HEADER; title+company in EXPERIENCE; degree+institution in EDUCATION)? |
| Format regularity | 0.20 | Do extracted values match expected regex patterns (email, phone, date, URL)? |
| AI agreement | 0.15 | Do heuristic extraction and AI (if used) produce consistent results? |
| Consistency | 0.10 | Logical date ranges, no duplicate entries, skill aliases resolve without conflict? |

### 4.2 Penalties

| Condition | Penalty |
|-----------|---------|
| Any `error` severity issue in `extractionIssues` | Cap aggregate at `0.5` (mirrors existing `ConfidenceScorerService`) |
| `failedOver = true` (AI fallback used) | -0.15 aggregate |
| `sectionDetectionStrategy = 'ai-only'` (heuristics failed completely) | -0.10 aggregate |
| Missing HEADER section | -0.20 entity score |

### 4.3 Thresholds

| Aggregate confidence | Review status |
|----------------------|---------------|
| `>= 0.85` | `AUTO_APPROVED` |
| `0.60 - 0.84` | `PENDING_REVIEW` |
| `< 0.60` | `NEEDS_REINDEX` |

---

## 5. Evidence of AI Fallback Strategy

### 5.1 Fallback Triggers

| Stage | Trigger |
|-------|---------|
| Section detection | Heuristic sections < 2 OR section confidence < 0.4 |
| Entity extraction | Required entities missing for a section OR regex match rate < 50% |
| Enhancement | Aggregate confidence < 0.7 after Stage 2 |

### 5.2 Provider Chain

```
Gemini 2.5 Flash
    ↓ (failover on 429 / 503 / RESOURCE_EXHAUSTED / SERVICE_UNAVAILABLE)
OpenRouter
    ↓ (failover on same conditions)
RuleEngine (deterministic regex + blank field defaults)
```

### 5.3 Graceful Degradation

- If all AI providers fail, the system returns structured JSON with `failedOver: true` and `entitiesExtracted` reflecting only rule-based matches.
- The document is never marked `FAILED` solely due to AI unavailability.
- `ResumeParseResult.aiProviderUsed` is set to `'rule-engine'` in the degraded path.
- DIC reviewers see a warning badge for AI-degraded extractions.

---

## 6. Evidence of Section Detection Strategy

### 6.1 Heuristic Priority Order

1. **DOCX heading styles** (`Heading1`..`Heading6`, `Title`, `Subtitle`) from `DocxExtractionService`.
2. **Bold + font-size >= 14pt** runs in DOCX.
3. **Known section title regex** (HEADER, SUMMARY, EDUCATION, EXPERIENCE, PROJECTS, SKILLS, CERTIFICATIONS, ACHIEVEMENTS).
4. **All-caps short lines** with optional trailing colon.
5. **Bullet line above non-bullet paragraph** (implies new section).
6. **Large vertical spacing** (> 1.5x avg line gap).

### 6.2 Normalization

Detected titles are normalized via a lookup map:

```ts
const SECTION_ALIASES: Record<string, string> = {
  'profile': 'SUMMARY',
  'objective': 'SUMMARY',
  'about me': 'SUMMARY',
  'academic': 'EDUCATION',
  'qualification': 'EDUCATION',
  'employment': 'EXPERIENCE',
  'work history': 'EXPERIENCE',
  'project': 'PROJECTS',
  'technical skills': 'SKILLS',
  'competencies': 'SKILLS',
  'certificate': 'CERTIFICATIONS',
  'award': 'ACHIEVEMENTS',
  'honor': 'ACHIEVEMENTS',
  'publication': 'PUBLICATIONS',
  'research': 'PUBLICATIONS',
  'language': 'LANGUAGES',
  'interest': 'INTERESTS',
  'hobby': 'INTERESTS',
  'contact': 'CONTACT',
};
```

### 6.3 Unknown Sections

Sections not matching the alias map retain their original title in `rawText` but do not receive specialized entity extraction. They are wrapped into an `UNCATEGORIZED` section.

---

## 7. Evidence of Database Schema Changes

### 7.1 `ResumeParseResult`

New collection. Tracks per-upload resume parsing metadata.

Key fields:
- `processingId` (unique, references `UaipUpload`)
- `organizationId` (tenant isolation)
- `userId`
- `confidenceScore` (0.0 - 1.0)
- `sectionsDetected`, `entitiesExtracted`, `normalizedSkills` (counters)
- `sectionDetectionStrategy`, `entityExtractionStrategy`, `aiProviderUsed`, `failedOver` (audit)
- `primaryTargetModule`, `secondaryTargetModules` (routing)
- `reviewStatus` (`AUTO_APPROVED`, `PENDING_REVIEW`, `NEEDS_REINDEX`)
- `extractionIssues[]` (severity, code, message)
- `rawCandidateFields` (full structured JSON for DIC)

Indexes:
- `processingId` (unique)
- `organizationId + reviewStatus + createdAt` (list queries)
- `organizationId + userId + createdAt` (user history)

### 7.2 `ResumePersonSuggestion`

New collection. Supports DIC reviewer in linking a resume to an existing `Person` or creating a new one.

Key fields:
- `processingId`
- `suggestedPersonId` (nullable)
- `matchConfidence` (0.0 - 1.0)
- `matchBasis` (`email`, `phone`, `name+fuzzy`, `manual`)
- `isNewPerson` (boolean)
- `status` (`PENDING`, `ACCEPTED`, `REJECTED`)

### 7.3 No Schema Changes to Existing Models

- `KnowledgeRecord` already has `Schema.Types.Mixed` for `candidateFields`, `extractedEntities`, and `routingDecision`. Resume data fits without migration.
- `UaipUpload` already supports all MIME types and statuses.
- All canonical models (`Person`, `ExperienceRecord`, `AcademicRecord`, `CertificateRecord`, `CareerRecord`, `SkillEvidence`) are written to only after DIC approval, using the existing event handlers.

### 7.4 Migration Steps

1. Add `RESUME` to `SUPPORTED_CATEGORIES` in `src/shared/application/uaipConfig.ts` (currently the array already includes `'RESUME'` — verify and document).
2. Run `tsc` to type-check new models.
3. Run MongoDB migration script to create indexes on `ResumeParseResult` and `ResumePersonSuggestion` (existing index creation pattern is used in all current models).

---

## 8. Evidence of API Design Consistency

### 8.1 Route Prefix
- All resume parser routes are mounted under `/api/resume`, consistent with existing `/api/resume`, `/api/growth`, `/api/document-intelligence` patterns.

### 8.2 Authentication & Authorization
- Uses existing `authenticateUser` and `enforceOrgIsolation` middleware, exactly as `documentIntelligenceRoutes.ts` does.

### 8.3 Response Shape
- Uses existing `sendResponse(res, status, data, message)` and `sendError(res, status, message)` utilities from `src/utils/response.ts`.

### 8.4 File Upload Limits
- Uses `multer.memoryStorage()` with a 10MB limit, matching `growthRoutes.ts` and `aiRoutes.ts`.

### 8.5 Status Lifecycle
- Follows the existing `UaipUpload` status enum: `PENDING` → `PROCESSING` → `SUCCESS` / `FAILED` / `NEEDS_OCR`.

---

## 9. Implementation Readiness Checklist

- [ ] Create `SUPPORTED_CATEGORIES` entry for `RESUME` (verify existing array)
- [ ] Scaffold `src/services/resume/` directory and 5 new service classes
- [ ] Scaffold `src/controllers/resumeParserController.ts` and `src/routes/resumeParserRoutes.ts`
- [ ] Scaffold `src/models/ResumeParseResult.ts` and `src/models/ResumePersonSuggestion.ts`
- [ ] Create `src/services/resume/resumeParseEventListener.ts` and subscribe to `UaipEvent.Parsed`
- [ ] Add `uploadResumeFile()` to `StorageService`
- [ ] Write Jest unit tests for each new service class
- [ ] Write integration test for full upload -> parse -> KnowledgeRecord enrichment flow
- [ ] Run `npm run lint` and `npm run typecheck` in `backend/`
- [ ] QA sign-off with 50+ resume samples across PDF/DOCX, scanned/non-scanned, good/bad layouts

---

## 10. References

| Reference | File | Description |
|-----------|------|-------------|
| Pipeline Orchestrator | `backend/src/services/pipeline-orchestrator.ts` | Event-driven upload processing |
| Document Classifier | `backend/src/services/classification/DocumentClassifier.ts` | MIME + filename classification |
| Parser Service | `backend/src/services/parsing/ParserService.ts` | Parser selection + raw text extraction |
| AI Failover Provider | `backend/src/core/ai/failover.provider.ts` | Primary -> fallback AI chain |
| DIC Routes | `backend/src/routes/documentIntelligenceRoutes.ts` | Human-in-the-loop review API |
| Knowledge Record | `backend/src/models/KnowledgeRecord.ts` | AI extraction storage |
| Uaip Upload | `backend/src/models/UaipUpload.ts` | Upload metadata + deduplication |
| UAIP Config | `backend/src/shared/application/uaipConfig.ts` | Supported categories + thresholds |
| Uaip Document AI | `backend/src/shared/application/UaipDocumentAi.service.ts` | Stage 2 AI analysis |
| Confidence Scorer | `backend/src/services/confidenceScorer.service.ts` | Existing confidence pattern |
| Docx Extraction | `backend/src/docxExtraction.service.ts` | Paragraph/run/style extraction from DOCX |

---

*Generated on: 2026-07-24*  
*Author: Kilo (Architecture Design)*
