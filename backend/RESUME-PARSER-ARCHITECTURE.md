# Resume Parser Architecture
## Academic Universe Backend

---

# Architecture Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-07-24 | Kilo | Initial architecture design |
| 1.1 | 2026-07-24 | Kilo | Post-review revision addressing 7 must-fix findings: async pipeline via KnowledgeQueueService, OCR sequencing, unambiguous confidence scoring with penalties, stage-level retry/dead-letter, file content validation, person deduplication strategy, required-section AI fallback trigger. |
| 1.2 | 2026-07-24 | Kilo | Sprint 1 implementation fixes: API contract mismatch ('PROCESSING' response), atomic duplicate upload detection via E11000 handling, queue architecture pragmatics — ResumeQueueService retained as temporary Sprint 1 compatibility layer with migration plan to KnowledgeQueueService in Sprint 2. |
| 1.3 | 2026-07-24 | Kilo | Sprint 2 implementation: ResumeClassifier (stateless), ResumeClassificationEventListener (event-driven), queue migration to KnowledgeJobRepository, UaipEvents extensions, KnowledgeDispatcher resume stub, fast-path DocumentClassifier reuse, explicit reviewStatus mapping. Senior code review: APPROVED WITH FIXES → all findings resolved. |
| 1.4 | 2026-07-24 | Kilo | Sprint 3 implementation: ResumeSectionDetector (stateless), permanent stage routing in KnowledgeDispatcher, OCR gate, section-detection events. Senior code review: APPROVED WITH FIXES → all findings resolved. |
| 1.5 | 2026-07-24 | Kilo | Sprint 4 implementation: ResumeEntityExtractor (stateless), 8 entity types with schemas, entity-to-canonical model mapping, confidence aggregation rule, entity deduplication, event payload contracts for ResumeEntityExtracted/ResumeEntityExtractionFailed. Senior plan review: APPROVED WITH FINDINGS → all findings resolved. |
| 1.6 | 2026-07-25 | Kilo | Sprint 5 implementation: ResumeAIEnhancer (stateless), normalization rules for 8 entity types, AI fallback via FailoverAIProvider, dispatcher ai_enhancement handler, ResumeAIEnhanced/ResumeAIEnhancementFailed events, idempotency via rawCandidateFields.aiEnhanced, 12+ unit tests + 3 integration tests. Senior plan review: APPROVED WITH FINDINGS → all findings resolved. |

**Review reference:** `backend/RESUME-PARSER-ARCHITECTURE-REVIEW.md`

---

## 1. Goals & Scope

Convert any uploaded PDF or DOCX resume into structured JSON that feeds the existing growth hub, skills tracker, academic records, and career records modules.

**In scope:**
- PDF and DOCX parsing
- Section detection (HEADER, SUMMARY, EDUCATION, EXPERIENCE, PROJECTS, SKILLS, CERTIFICATIONS, ACHIEVEMENTS)
- Entity extraction (name, email, phone, URLs, dates, institutions, job titles)
- Structured JSON output conforming to existing data models
- Confidence scoring per field and per document
- Human-in-the-loop review via Document Intelligence Center (DIC)
- AI fallback chain (Gemini -> OpenRouter -> Rule-based)

**Out of scope (for this architecture only):**
- Frontend review UI (reuses DIC)
- Resume generation / DOCX templating (existing `ResumeBuilder` module)
- Scanned-image OCR pipeline for resumes (reuses existing `OCRService`)

---

## 2. High-Level Architecture

```
┌─────────────┐   ┌──────────────────────┐   ┌─────────────────────────────────┐
│   Client    │──▶│ ResumeParserController│   │       201 Created (immediate)   │
│ (React/Next)│   │  POST /api/resume/   │──▶│  { processingId, status }       │
└─────────────┘   │  parse-upload        │   └─────────────────────────────────┘
                  └──────────────────────┘
                            │
                            ▼
                  ┌──────────────────────┐
                  │   Validation Layer   │
                  │  - MIME check        │
                  │  - Magic-byte check  │
                  │  - Duplicate hash    │
                  └──────────┬───────────┘
                             │
                  ┌──────────▼───────────┐
                  │  StorageService      │
                  │  uploadResumeFile()  │
                  └──────────┬───────────┘
                             │
                  ┌──────────▼───────────┐
                  │  UaipUpload + SHA-256│
                  │  KnowledgeQueueService│
                  │  enqueue(ResumeJob)  │
                  └──────────┬───────────┘
                             │
               ┌─────────────┼─────────────┐
               │             │             │
               ▼             ▼             ▼
    ┌─────────────────┐ ┌─────────────┐ ┌─────────────────┐
    │ PipelineOrchestrator│ (generic) │ │  OCRService     │ (if scanned)
    │ Classify + Parse │ │             │ │  waitForOcr()   │
    └────────┬────────┘ └─────────────┘ └────────┬────────┘
             │                                   │
             ▼                                   ▼
    ┌─────────────────┐               ┌─────────────────────┐
    │ KnowledgeRecord  │               │ UaipEvent.OCR_      │
    │ rawContent set   │               │ COMPLETED published │
    └────────┬────────┘               └──────────┬──────────┘
             │                                   │
             ▼                                   ▼
    ┌──────────────────────────────────────────────────────┐
    │          ResumeParseEventListener (async)            │
    │  Subscribes: UaipEvent.Parsed + UaipEvent.OCR_      │
    │                                                      │
    │  Stage 1: ResumeSectionDetector (async job)         │
    │  Stage 2: ResumeEntityExtractor (async job)         │
    │  Stage 3: ResumeAIEnhancer (async, if needed)       │
    │  Stage 4: ResumeConfidenceScorer (async job)        │
    │                                                      │
    │  Each stage: max 3 retries via KnowledgeQueueService│
    │  Terminal failure -> ResumeParseDeadLetter           │
    └───────────────────────┬──────────────────────────────┘
                            │
                            ▼
                  ┌─────────────────────┐
                  │  ResumeParseResult  │
                  │  + candidateFields  │
                  │  + routingDecision  │
                  │  + reviewStatus     │
                  └──────────┬──────────┘
                             │
                             ▼
                  ┌─────────────────────┐
                  │  DIC Review Queue   │
                  │  (AUTO_APPROVED /   │
                  │   PENDING_REVIEW)   │
                  └─────────────────────┘
```

### 2.1 Placement in Existing Pipeline

Resume parsing is a **new asynchronous consumer** of the existing UAIP event bus and queue infrastructure. It does **not** replace the generic `DocumentClassifier`, but augments it:

1. **Upload phase (synchronous, fast):**
   - `ResumeParserController` validates the file, computes SHA-256, stores the buffer via `StorageService.uploadResumeFile()`, creates `UaipUpload`, and enqueues a `ResumeParseJob`.
   - **Sprint 1 pragmatics:** A dedicated `ResumeQueueService` + `ResumeJob` model is used as a **temporary compatibility layer**. The existing `KnowledgeQueueService` is tightly coupled to `KnowledgeJob` and `KnowledgeDispatcher` (which handles `academic`, `certificate`, `experience` domains only). Migrating to `KnowledgeQueueService` requires extending `KnowledgeDispatcher` with a `resume` domain handler. This migration is planned for **Sprint 2**.
   - The controller returns `201 Created` immediately with `processingId`. No resume parsing happens in the request thread.

2. **Generic pipeline phase (unchanged):**
   - `KnowledgeQueueService` dequeues the job and invokes `PipelineOrchestrator.processUpload()`.
   - `DocumentClassifier.classify()` sets `documentCategory = 'RESUME'`.
   - `ParserService.parseDocument()` extracts raw text into `KnowledgeRecord.rawContent`.
   - If the PDF is scanned (`isScanned === true`), `OCRService` runs and publishes `UaipEvent.OCR_COMPLETED`.

3. **Resume-specific phase (asynchronous, event-driven):**
   - `ResumeParseEventListener` subscribes to `UaipEvent.Parsed` **and** `UaipEvent.OCR_COMPLETED`.
   - It resumes only when:
     - `documentCategory === 'RESUME'`, **AND**
     - `isScanned === false` (after `Parsed`), **OR**
     - `isScanned === true` and OCR text is available (after `OCR_COMPLETED`).
   - It enqueues resume stages as discrete `ResumeStageJob`s through `KnowledgeQueueService` with per-stage retry.
   - On completion, it updates `ResumeParseResult`, `KnowledgeRecord.candidateFields`, and publishes `ResumeParseCompleted`.

This keeps the generic pipeline untouched, ensures scanned resumes receive OCR before section/entity extraction, and prevents the event bus from blocking on AI latency.

---

## 3. Parsing Pipeline

### Stage 0: Resume Classification (Async)

**Input:** `processingId`, `mimeType`, `fileName`, `buffer` (from queue job)  
**Output:** `documentCategory = 'RESUME'` or `'UNKNOWN'` stored in `KnowledgeRecord`

Reuses `DocumentClassifier.classify()` with one addition:

| Signal | Weight | Rule |
|--------|--------|------|
| Filename pattern | 0.6 | Regex `/resume|cv|curriculum.vitae| biodata /i` |
| MIME type | 0.3 | `application/pdf` or `application/vnd.openxmlformats-officedocument.wordprocessingml.document` |
| Content heuristic | 0.1 | `pdf-parse` / `DocxExtractionService` returns > 80% text and contains > 1 section-like heading |

If confidence < 0.5, label `UNKNOWN` and let Stage 2 AI re-classify.

**New class:** `ResumeClassifier` (`src/services/resume/resumeClassifier.service.ts`)  
- Single responsibility: boost classification confidence for resumes.
- Runs as a `ResumeStageJob` in `KnowledgeQueueService` after generic parsing completes.

**Validation gate (before queue enqueue):**
- `ResumeParserController` validates magic bytes before enqueueing:
  - PDF: buffer starts with `%PDF`
  - DOCX: buffer starts with `PK` and contains `[Content_Types].xml` inside the ZIP
- Invalid buffers return `400 Unsupported file format` immediately.

---

### Stage 1: Section Detection (Async)

**Goal:** Partition raw text into semantically meaningful sections without relying solely on AI.

**Gate:** Resume parsing proceeds only after OCR text is available for scanned documents. `ResumeParseEventListener` subscribes to both `UaipEvent.Parsed` and `UaipEvent.OCR_COMPLETED` and resumes when:

- `documentCategory === 'RESUME'`, **AND**
- `isScanned === false` (from `Parsed`), **OR**
- `isScanned === true` and `ocrText` is populated (from `OCR_COMPLETED`).

#### Stage 1A: Heuristic Rules (Rule Engine)

Extracted from `DocxExtractionService` (DOCX) or `pdf-parse` / OCR text (PDF):

1. **Heading style detection** (DOCX):
   - Paragraph style matches `Heading1..6`, `Title`, `Subtitle` → section header.
2. **Font size / bold heuristic** (DOCX):
   - Runs where `bold === true` and `fontSize >= 14` → candidate header.
3. **Regex line detection** (PDF & DOCX):
   - `^(SUMMARY|PROFILE|OBJECTIVE|ABOUT ME)$i`
   - `^(EDUCATION|ACADEMIC|QUALIFICATION)S?$i`
   - `^(EXPERIENCE|EMPLOYMENT|WORK HISTORY)$i`
   - `^(PROJECTS?|MAJOR PROJECTS?)$i`
   - `^(SKILLS?|TECHNICAL SKILLS?|COMPETENCIES)$i`
   - `^(CERTIFICATIONS?|CERTIFICATES?|AWARDS?)$i`
   - `^(ACHIEVEMENTS?|HONORS?)$i`
   - `^(PUBLICATIONS?|RESEARCH)$i`
   - `^(LANGUAGES?|INTERESTS?|HOBBIES)$i`
   - `^(CONTACT|REFERENCES?)$i`
4. **Layout cues**:
   - All-caps line with <= 5 words and trailing colon → section header.
   - Line with only bullets (`• - *`) above it → section start.
5. **Spacing heuristic**:
   - Vertical gap > 1.5x average line spacing → possible section boundary.

#### Stage 1B: AI Fallback Trigger (Required-Section Check)

Instead of triggering AI based on total section count, the system checks for **required business sections**:

Required sections for a valid resume:
- `HEADER`
- `EXPERIENCE`
- `EDUCATION`
- `SKILLS`

**Trigger rule:** If **ANY** required section is missing after heuristic detection, invoke AI fallback for section segmentation, regardless of how many non-required sections were found.

This prevents silent data loss where resumes with 3–5 non-standard headers (e.g., "Highlights", "Core Competencies") bypass AI fallback while missing critical sections like `EXPERIENCE` or `EDUCATION`.

**AI fallback output:** Same JSON array format as before: `[{ "title": "HEADER", "startLine": 0, "endLine": 3 }, ...]`
**Provider chain:** `FailoverAIProvider` → Gemini → OpenRouter → `RuleEngine` (returns single `GENERAL` section with full text if both AI providers fail).

**New class:** `ResumeSectionDetector` (`src/services/resume/resumeSectionDetector.service.ts`)

---

### Stage 2: Entity Extraction (Async)

**New class:** `ResumeEntityExtractor` (`src/services/resume/resumeEntityExtractor.service.ts`)

Runs as a `ResumeStageJob` after section detection completes. Per-section strategies:

| Section | Strategy |
|---------|----------|
| HEADER | Regex patterns for email, phone, LinkedIn, GitHub, location. First non-empty line = full name. |
| SUMMARY / PROFILE | Capture first paragraph under section until next section boundary. |
| EDUCATION | Pattern: `Degree | Institution | Year | GPA/CGPA`. Line-by-line regex + AI if format is ambiguous. |
| EXPERIENCE | Pattern: `Title @ Company | Date Range`. Bullet points = description. |
| PROJECTS | Similar to experience but may lack company. Project name + tech stack extraction. |
| SKILLS | Comma-separated, pipe-separated, or bullet list. Normalize via `CanonicalSkill` + `SkillAlias`. |
| CERTIFICATIONS | Title + Issuer + Date pattern. |
| ACHIEVEMENTS / AWARDS | Free-text bullet capture. |

---

### Stage 3: AI Enhancement (Async, Conditional)

**New class:** `ResumeAIEnhancer` (`src/services/resume/resumeAIEnhancer.service.ts`)

Runs as a `ResumeStageJob` only when `aggregateConfidence < 0.7` after Stage 2. Uses `FailoverAIProvider.generateJSON()` with `responseMimeType: 'application/json'`.

Prompt includes the raw section text and asks for structured JSON per section schema.

---

### Stage 4: Confidence Scoring & Structuring (Async)

**New class:** `ResumeConfidenceScorer` (`src/services/resume/resumeConfidenceScorer.service.ts`)

Runs as a `ResumeStageJob` after Stage 3 (or Stage 2 if enhancement is skipped). Produces:
- Per-field confidence (`0.0 - 1.0`)
- Document aggregate confidence
- `reviewStatus`: `AUTO_APPROVED`, `PENDING_REVIEW`, or `NEEDS_REINDEX`

Detailed scoring dimensions, formula, penalties, and casing logic are defined in Section 4.

---

## 4. Confidence Scoring, Penalties & AI Fallback

### 4.1 Base Scoring Formula (Unambiguous)

`ResumeConfidenceScorer` computes five component scores, each in `[0.0, 1.0]`:

| Component | Weight | Calculation |
|-----------|--------|-------------|
| `sectionScore` | 30% | Presence and correctness of required sections (`HEADER`, `EXPERIENCE`, `EDUCATION`, `SKILLS`); unique ordered titles; no section boundary errors |
| `entityScore` | 25% | Required entities per section populated (e.g., `name`+`email` in `HEADER`; `title`+`company` in `EXPERIENCE`; `degree`+`institution` in `EDUCATION`); no empty required values |
| `formatScore` | 20% | Extracted values match expected regex patterns (email, phone, date, URL, institution name) |
| `aiAgreementScore` | 15% | If AI enhancement was used, heuristic and AI results agree on section boundaries and entity values; if no AI used, this equals `entityScore` (neutral) |
| `consistencyScore` | 10% | Logical date ranges, no duplicate entries, skill aliases resolve without conflict |

**Step 1 — weighted sum:**
```
rawScore = (sectionScore * 0.30) +
           (entityScore   * 0.25) +
           (formatScore   * 0.20) +
           (aiAgreementScore * 0.15) +
           (consistencyScore * 0.10)
```

**Step 2 — apply multiplicative penalty caps (defined in Section 4.2).**

**Step 3 — clamp to `[0.0, 1.0]`.**

### 4.2 Penalty Rules (Exact Application)

Penalties are applied **after** the weighted sum. Each penalty is a multiplicative cap, not an additive decrement.

| Condition | Penalty cap | Rationale |
|-----------|-------------|-----------|
| Any `extractionIssue` with `severity === 'error'` | `0.5` | Hard stop: structural failure |
| `failedOver === true` (AI fallback was exercised) | `0.85` | Reduced trust in AI-dependent extractions |
| `sectionDetectionStrategy === 'ai-only'` | `0.80` | Heuristic baseline failed; section boundaries uncertain |
| Missing `HEADER` section | Entity score capped at `0.5` | Header is the anchor for person identification |
| Any required section (`EXPERIENCE`, `EDUCATION`, `SKILLS`) missing after full pipeline | `0.60` | Critical business data absent |

**Precedence:** Apply the **most restrictive** cap. Example: if `failedOver = true` (cap `0.85`) and `sectionDetectionStrategy = 'ai-only'` (cap `0.80`), final score = `min(rawScore, 0.80)`.

**Mathematical expression:**
```
penaltyCaps = [
  hasError            ? 0.50 : 1.0,
  failedOver          ? 0.85 : 1.0,
  aiOnlyDetection     ? 0.80 : 1.0,
  missingHeader       ? 0.50 : 1.0,   // applies to entityScore branch only
  missingRequiredSec  ? 0.60 : 1.0
]
finalScore = rawScore * Math.min(...penaltyCaps)
finalScore = Math.max(0.0, Math.min(1.0, finalScore))
```

### 4.3 Thresholds and Casing

| Final score | `reviewStatus` | Behavior |
|-------------|----------------|----------|
| `>= 0.85` | `AUTO_APPROVED` | DIC auto-approves; canonical write proceeds |
| `0.60 - 0.84` | `PENDING_REVIEW` | Human review required in DIC |
| `< 0.60` | `NEEDS_REINDEX` | Re-upload requested; structure too degraded |

### 4.4 AI Provider Hierarchy

Leverages the existing `FailoverAIProvider` (`src/core/ai/failover.provider.ts`):

```
Primary:   Gemini 2.5 Flash  (via @google/genai)
Fallback:  OpenRouter       (via openrouter.provider.ts)
Tertiary:  RuleEngine       (regex + deterministic parser)
```

- Uses existing `FailoverAIProvider.generateJSON()` and `generateContent()`.
- If both AI providers fail with availability errors (429, 503, quota), the system degrades gracefully to the `RuleEngine`.
- No resume upload fails because AI is unavailable. The Document Intelligence Center review queue handles low-confidence results.

### 4.5 Required-Section AI Fallback Trigger

Section detection invokes AI fallback when **ANY** required business section is missing after heuristic processing:

Required sections: `HEADER`, `EXPERIENCE`, `EDUCATION`, `SKILLS`.

This prevents silent data loss on resumes with 3–5 non-standard headers (e.g., "Highlights", "Core Competencies") that would otherwise bypass AI fallback while omitting critical sections.

---

## 5. Stage-Level Retry & Dead-Letter Handling

Resume processing runs as discrete `ResumeStageJob`s through `KnowledgeQueueService`. Each stage has an independent retry boundary.

### 5.1 Retry Policy

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Max attempts per stage | 3 | First attempt + 2 retries |
| Backoff strategy | Exponential: 1s, 2s, 4s | Aligns with existing `KnowledgeQueueService` backoff patterns |
| Retryable errors | Network timeouts, 503/429 AI quota errors, transient OCR failures | Availability issues only |
| Non-retryable errors | Invalid file format, corrupt buffer, validation failure | Deterministic; retrying will not help |

### 5.2 Failure Events

| Event | When emitted | Payload |
|-------|--------------|---------|
| `ResumeStageRetry` | Before each retry | `processingId`, `stage`, `attempt`, `error` |
| `ResumeStageFailed` | After final retry exhaustion | `processingId`, `stage`, `error`, `terminal: true` |
| `ResumeParseDeadLetter` | When all stages fail or terminal failure reached | `processingId`, `failedStage`, `extractionIssues[]`, `reviewStatus: 'NEEDS_REINDEX'` |

### 5.3 Terminal Failure State

If any stage exhausts retries:
1. `ResumeParseResult.reviewStatus` is set to `NEEDS_REINDEX`.
2. `extractionIssues` array records the terminal failure with `severity: 'error'`, a machine-readable `code` (`STAGE_TIMEOUT`, `AI_QUOTA_EXHAUSTED`, `OCR_FAILED`, `PARSE_CORRUPT`), and a human-readable `message`.
3. A `ResumeParseFailed` event is published so that monitoring/alerting can trigger.
4. The document remains visible in the Document Intelligence Center with `reviewStatus: 'NEEDS_REINDEX'` so the user can re-upload.
5. No canonical collections are written. No partial `KnowledgeRecord.candidateFields` is committed unless it passed all prior stages.

### 5.4 Idempotency

- Each `ResumeStageJob` is keyed by `processingId + stageName`.
- `KnowledgeQueueService` guarantees at-least-once delivery; resume stages must be idempotent by checking `ResumeParseResult` before writing.
- If the same `processingId` is dequeued after a crash, the stage checks whether its output already exists and skips recomputation.

---

## 6. Structured JSON Output Schema

```json
{
  "documentCategory": "RESUME",
  "confidenceScore": 0.92,
  "reviewStatus": "AUTO_APPROVED",
  "extractedBy": "resume-parser-v1",
  "sections": [
    {
      "title": "HEADER",
      "order": 0,
      "rawText": "John Doe\njohn.doe@example.com | +1-555-0199\nlinkedin.com/in/johndoe",
      "entities": [
        { "type": "name",    "value": "John Doe",          "confidence": 0.98 },
        { "type": "email",   "value": "john.doe@example.com", "confidence": 0.99 },
        { "type": "phone",   "value": "+1-555-0199",       "confidence": 0.95 }
      ]
    },
    {
      "title": "SUMMARY",
      "order": 1,
      "rawText": "Senior backend engineer with 5+ years...",
      "entities": []
    },
    {
      "title": "EXPERIENCE",
      "order": 2,
      "repeatable": true,
      "entries": [
        {
          "title": "Senior Backend Engineer",
          "company": "TechCorp Inc.",
          "startDate": "2021-06-01",
          "endDate": null,
          "current": true,
          "description": "- Led migration to microservices...\n- Reduced latency by 40%",
          "entities": [
            { "type": "organization", "value": "TechCorp Inc.", "confidence": 0.94 }
          ]
        }
      ]
    },
    {
      "title": "EDUCATION",
      "order": 3,
      "repeatable": true,
      "entries": [
        {
          "degree": "B.Tech Computer Science",
          "institution": "Sharda University",
          "startDate": "2016-08-01",
          "endDate": "2020-05-01",
          "gpa": "8.4/10",
          "entities": []
        }
      ]
    },
    {
      "title": "SKILLS",
      "order": 4,
      "rawText": "Java, Python, Kubernetes, AWS, React...",
      "normalizedSkills": [
        { "raw": "Java",          "canonicalId": "java",          "confidence": 1.0 },
        { "raw": "Kubernetes",    "canonicalId": "kubernetes",    "confidence": 1.0 },
        { "raw": "AWS",           "canonicalId": "amazon-web-services", "confidence": 0.9 }
      ]
    }
  ],
  "routingDecision": {
    "primaryModule": "ExperienceRecord",
    "secondaryModules": ["CareerRecord", "SkillEvidence"],
    "routingConfidence": 0.91
  },
  "processingMetadata": {
    "parserStrategy": "PDF_PARSER",
    "sectionDetectionStrategy": "heuristic+ai",
    "entityExtractionStrategy": "regex+ner+ai",
    "aiProviderUsed": "gemini",
    "failedOver": false,
    "processingDurationMs": 2340
  }
}
```

### 5.1 Routing to Existing Canonical Models

The `routingDecision` maps directly to existing Mongoose models:

| Section field | Canonical collection | Existing model |
|---------------|---------------------|----------------|
| `sections[HEADER].entities` | `Person` | `Person` |
| `sections[EXPERIENCE].entries` | `ExperienceRecord` | `ExperienceRecord` |
| `sections[EDUCATION].entries` | `AcademicRecord` | `AcademicRecord` |
| `sections[SKILLS].normalizedSkills` | `SkillEvidence` + `SkillAlias` | `SkillEvidence`, `SkillAlias`, `CanonicalSkill` |
| `sections[CERTIFICATIONS].entries` | `CertificateRecord` | `CertificateRecord` |
| `sections[PROJECTS].entries` | `CareerRecord` | `CareerRecord` |
| All sections summary | `KnowledgeRecord` | `KnowledgeRecord` |

Human approval in DIC writes to these canonical models.

---

## 7. Database Schema Changes

### 7.1 Extend `KnowledgeRecord`

Add a new document category `RESUME` to the existing `SUPPORTED_CATEGORIES` array in `uaipConfig.ts`.

No schema changes needed in `KnowledgeRecord` because `candidateFields` is already `Schema.Types.Mixed`. Resume-specific structured data will be stored there.

**Migration:** `SUPPORTED_CATEGORIES` already includes `'RESUME'` (verify and keep).

### 7.2 New Model: `ResumeParseResult`

Aggregates per-upload resume parsing metadata for quick DIC lookup.

**File:** `src/models/ResumeParseResult.ts`

```ts
export interface IResumeParseResult extends Document {
  processingId: string;          // unique, references UaipUpload
  organizationId: Types.ObjectId;
  userId: Types.ObjectId;
  documentId: Types.ObjectId;    // ref Document (if created)
  personId?: Types.ObjectId;     // ref Person (if auto-matched or created)
  documentCategory: 'RESUME';
  confidenceScore: number;       // 0.0 - 1.0
  sectionsDetected: number;
  entitiesExtracted: number;
  normalizedSkills: number;
  sectionDetectionStrategy: 'heuristic' | 'heuristic+ai' | 'ai-only';
  entityExtractionStrategy: 'regex' | 'regex+ner' | 'regex+ner+ai' | 'ai-only';
  aiProviderUsed: string;
  failedOver: boolean;
  primaryTargetModule: string;
  secondaryTargetModules: string[];
  reviewStatus: 'AUTO_APPROVED' | 'PENDING_REVIEW' | 'NEEDS_REINDEX';
  extractionIssues: {
    severity: 'info' | 'warning' | 'error';
    code: string;
    message: string;
    section?: string;
  }[];
  rawCandidateFields: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}
```

**Indexes:**
```ts
ResumeParseResultSchema.index({ processingId: 1 }, { unique: true });
ResumeParseResultSchema.index({ organizationId: 1, reviewStatus: 1, createdAt: -1 });
ResumeParseResultSchema.index({ organizationId: 1, userId: 1, createdAt: -1 });
```

### 7.3 New Model: `ResumePersonSuggestion`

For deduplicating person records when a new resume is uploaded.

**File:** `src/models/ResumePersonSuggestion.ts`

```ts
export interface IResumePersonSuggestion extends Document {
  processingId: string;
  organizationId: Types.ObjectId;
  suggestedPersonId?: Types.ObjectId;  // ref Person
  matchConfidence: number;             // 0.0 - 1.0
  matchBasis: ('email' | 'phone' | 'name+jaro' | 'institution' | 'manual')[];
  isNewPerson: boolean;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdAt: Date;
}
```

### 7.4 Person Deduplication Strategy

Before a new `Person` is created from a resume, the system runs a multi-signal match within the same organization:

| Signal | Algorithm | Threshold | Weight |
|--------|-----------|-----------|--------|
| `email` | Exact match (normalized to lowercase) | exact | Deterministic |
| `phone` | Exact match (E.164 normalized) | exact | Deterministic |
| `name+jaro` | Jaro-Winkler similarity on `primaryName` | `>= 0.92` | Soft |
| `institution` | Fuzzy match on known institution names from existing `AcademicRecord` entries for the org | `>= 0.85` Jaro-Winkler | Soft |

**Decision logic:**
```ts
const emailMatch = normalizeEmail(rawEmail) === normalizeEmail(existingEmail);
const phoneMatch = normalizePhone(rawPhone) === normalizePhone(existingPhone);
const nameScore = jaroWinkler(rawName, existingName);
const institutionScore = jaroWinkler(rawInstitution, existingInstitution);

const isDuplicate =
  emailMatch ||
  phoneMatch ||
  (nameScore >= 0.92 && (emailMatch || phoneMatch || institutionScore >= 0.85));
```

**Organization isolation:** Matching is scoped to `organizationId`. A person in Org A is never matched against a person in Org B.

**Manual override:** DIC reviewers can override `isNewPerson` via the review interface. The `matchBasis` array records all signals that fired, plus `manual` if the reviewer intervened.

**Library recommendation:** `string-similarity` or a simple Jaro-Winkler implementation (~40 lines). No new npm dependency is strictly required.

### 7.5 No changes to existing canonical models

The resume parser does **not** modify `Person`, `ExperienceRecord`, `AcademicRecord`, `SkillEvidence`, etc. It only populates `KnowledgeRecord.candidateFields` and `ResumeParseResult`. Canonical writes happen only after human approval in the DIC.

---

## 8. API Design

### 8.1 Upload Resume

**POST** `/api/resume/parse-upload`  
**Auth:** JWT + organization isolation  
**Content-Type:** `multipart/form-data`  
**Body:** `file` (PDF/DOCX, max 10MB)

**Validation (synchronous, before enqueue):**
1. MIME type check: `application/pdf` or DOCX MIME.
2. Magic-byte check: PDF starts with `%PDF`; DOCX starts with `PK` and contains `[Content_Types].xml`.
3. Duplicate hash check: SHA-256 of buffer compared against `UaipUpload.fileHash` for the organization.

**Failure responses:**
- `400 Invalid file type` — wrong MIME
- `400 Unsupported file format` — magic-byte mismatch
- `409 Conflict` — duplicate hash with `existingProcessingId`
- `413 Payload Too Large` — file > 10MB

**Success response:** `201 Created`
```json
{
  "processingId": "uuid",
  "fileName": "john_doe_resume.pdf",
  "mimeType": "application/pdf",
  "status": "PROCESSING",
  "estimatedCompletionMs": 5000,
  "resumeParseResultId": "objId"
}
```

The controller returns immediately. Parsing proceeds asynchronously via `KnowledgeQueueService`.

### 8.2 Get Parse Status

**GET** `/api/resume/parse-status/:processingId`

**Response:** `200 OK`
```json
{
  "processingId": "uuid",
  "status": "SUCCESS",
  "confidenceScore": 0.92,
  "reviewStatus": "AUTO_APPROVED",
  "sectionCount": 6,
  "entityCount": 14,
  "primaryModule": "ExperienceRecord",
  "completedAt": "2026-07-24T10:30:00Z"
}
```

### 8.3 Get Structured JSON

**GET** `/api/resume/structured/:processingId`

Returns the full structured JSON from `KnowledgeRecord.candidateFields`.

### 8.4 Re-parse with AI Enhancement

**POST** `/api/resume/reparse/:processingId`  
Forces a re-enqueue of the resume pipeline with AI enhancement enabled for low-confidence results. Returns `202 Accepted` because re-processing is asynchronous.

---

## 9. Sequence Diagram

```
Client -> ResumeParserController: POST /api/resume/parse-upload (multipart)
ResumeParserController -> ResumeParserController: validate magic bytes + duplicate hash
ResumeParserController -> StorageService: uploadResumeFile(buffer, orgId)
StorageService -> Cloudinary/Firebase: store file
StorageService -> ResumeParserController: fileUrl
ResumeParserController -> UaipUpload: create(processingId, storageId, mime, orgId, user)
ResumeParserController -> KnowledgeQueueService: enqueue(ResumeParseJob)
ResumeParserController -> Client: 201 { processingId, status, resumeParseResultId }

[Async — KnowledgeQueueService dequeues ResumeParseJob]
KnowledgeQueueService -> PipelineOrchestrator: processUpload(payload)
PipelineOrchestrator -> DocumentClassifier: classify(...)
DocumentClassifier -> KnowledgeRecord: upsert { category: 'RESUME', parserStrategy, ... }

alt isScanned === true
  PipelineOrchestrator -> OCRService: waitForOcr(processingId)
  OCRService -> PipelineOrchestrator: ocrText
  PipelineOrchestrator -> KnowledgeRecord: update rawContent
  PipelineOrchestrator -> eventBus: publish UaipEvent.OCR_COMPLETED
end

PipelineOrchestrator -> ParserService: parseDocument(...)
ParserService -> PDFParser / DocxParser: parse(buffer)
ParserService -> KnowledgeRecord: update rawContent
PipelineOrchestrator -> eventBus: publish UaipEvent.Parsed

[Async — ResumeParseEventListener subscribes to Parsed + OCR_COMPLETED]
ResumeParseEventListener -> ResumeParseEventListener: gate until OCR available for scanned docs
ResumeParseEventListener -> KnowledgeQueueService: enqueue(ResumeSectionDetectorJob)
ResumeParseEventListener -> KnowledgeQueueService: enqueue(ResumeEntityExtractorJob)
ResumeParseEventListener -> KnowledgeQueueService: enqueue(ResumeConfidenceScorerJob)

[Async — Stage jobs execute with retry]
KnowledgeQueueService -> ResumeSectionDetector: detect(rawContent, mimeType)
ResumeSectionDetector -> KnowledgeQueueService: sections [] or AI fallback
KnowledgeQueueService -> ResumeEntityExtractor: extract(sections)
ResumeEntityExtractor -> KnowledgeQueueService: entities []
KnowledgeQueueService -> ResumeConfidenceScorer: score(sections, entities)
ResumeConfidenceScorer -> ResumeConfidenceScorer: apply penalty caps

alt confidence < 0.7 AND stages succeeded
  KnowledgeQueueService -> KnowledgeQueueService: enqueue(ResumeAIEnhancerJob)
  KnowledgeQueueService -> ResumeAIEnhancer: enhance(sections)
  ResumeAIEnhancer -> KnowledgeQueueService: enhanced sections
  KnowledgeQueueService -> ResumeConfidenceScorer: rescore()
end

ResumeConfidenceScorer -> ResumeParseResult: create(...)
ResumeParseResult -> KnowledgeRecord: updateOne({ candidateFields, routingDecision, reviewStatus })
ResumeParseResult -> eventBus: publish ResumeParseCompleted

alt reviewStatus === 'AUTO_APPROVED'
  eventBus -> DIC: publish CandidateApproved
end

Client -> ResumeParserController: GET /api/resume/parse-status/:processingId
ResumeParserController -> ResumeParseResult: findByProcessingId(resumeParseResultId)
ResumeParseResult -> Client: 200 { confidenceScore, reviewStatus, ... }
```

---

## 10. File Upload & Storage

Reuses existing infrastructure:

| Component | Existing code | New usage |
|-----------|--------------|-----------|
| Multer config | `resumeRoutes.ts`, `growthRoutes.ts` | `memoryStorage()`, 10MB limit |
| File storage | `StorageService` (Firebase + Cloudinary) | `uploadResumeFile()` — new method mirroring `uploadResumeTemplate()` |
| Content validation | None today | Magic-byte validation in controller before enqueue |
| Deduplication | `UaipUpload.fileHash` (SHA-256) | Compute SHA-256 in controller; reject duplicates per org |

**New method in `StorageService`:**
```ts
async uploadResumeFile(buffer: Buffer, originalName: string, organizationId: string): Promise<string>
```
Stores in `academicuniverse/resumes/{organizationId}/` folder on Cloudinary (or Firebase Storage).

**Validation details:**
- PDF magic bytes: buffer starts with ASCII `%PDF`
- DOCX magic bytes: buffer starts with `PK` (ZIP local file header) AND unzipping reveals `[Content_Types].xml` at the root
- On validation failure: return `400`, log `warn` with filename and reason, do not enqueue

---

## 11. Error Handling & Resilience

| Failure mode | Behavior |
|--------------|----------|
| Unsupported MIME (e.g., `.doc`) | Return `400 Invalid file type. Only PDF and DOCX are supported.` |
| Invalid magic bytes | Return `400 Unsupported file format`. Log `warn`-level security event. |
| File > 10MB | Multer returns `413 Payload Too Large` |
| Duplicate upload (same hash) | Return `409 Conflict` with `existingProcessingId` |
| PDF parse failure (encrypted) | Mark `status: 'NEEDS_OCR'`, route to existing `OCRService`, then re-enter pipeline |
| DOCX parse failure (corrupt zip) | Mark `status: 'FAILED'`, store `errorMessage`, allow re-upload |
| Stage retry exhausted | Publish `ResumeParseDeadLetter`, set `reviewStatus: 'NEEDS_REINDEX'`, store terminal `extractionIssue` |
| AI quota exhausted | Fallback to RuleEngine; `failedOver: true`; `reviewStatus` capped at `PENDING_REVIEW` by penalty |
| No person match found | Create `ResumePersonSuggestion` with `isNewPerson: true`; DIC reviewer links or creates `Person` |
| OCR unavailable for scanned PDF | After timeout, mark `ResumeParseResult.reviewStatus = 'NEEDS_REINDEX'`, publish `ResumeParseFailed` |

---

## 12. Testing Strategy

| Layer | Test focus |
|-------|------------|
| Unit | `ResumeSectionDetector` against synthetic resumes with known sections |
| Unit | `ResumeEntityExtractor` regex patterns for email, phone, degree, company |
| Unit | `ResumeConfidenceScorer` weighted formula + penalty caps produce expected scores (boundary: 0.84 -> 0.69 after `failedOver` cap) |
| Unit | `ResumeClassifier` async job enqueue and `processingId` gate logic |
| Unit | Magic-byte validation: valid PDF, valid DOCX, invalid binary renamed to `.pdf`, corrupt ZIP |
| Unit | `ResumePersonSuggestion` matching: email match, phone match, Jaro-Winkler name score >= 0.92, institution score >= 0.85 |
| Integration | Full upload -> queue -> parse -> KnowledgeRecord enrichment via mocked event bus |
| Integration | Scanned PDF flow: upload -> OCR_COMPLETED event -> resume stage resume |
| Contract | Output JSON schema validation against `ResumeParseResult` expected shape |
| Resilience | Stage retry: transient error succeeds on retry; terminal failure produces dead-letter |
| Regression | Re-run against 50+ sample resumes (various formats, layouts, languages) |

---

## 13. Dependencies

**New npm packages:**
- `pdf-parse` — already in `backend/package.json`
- `pizzip` — already in `backend/package.json`
- `fast-xml-parser` — already in `backend/package.json`
- `mammoth` — already in `backend/package.json`
- `tesseract.js` — already in `backend/package.json` (for scanned PDFs via OCR)

**No new dependencies required.**

---

## 14. Migration Path

1. **Week 1-2:** Create models (`ResumeParseResult`, `ResumePersonSuggestion`), controller, route, magic-byte validation, and `ResumeClassifier`. Scaffold `KnowledgeQueueService` job types (`ResumeParseJob`, `ResumeStageJob`).
2. **Week 3:** Implement `ResumeSectionDetector` and `ResumeEntityExtractor`. Wire `ResumeParseEventListener` to `UaipEvent.Parsed` and `UaipEvent.OCR_COMPLETED`.
3. **Week 4:** Implement `ResumeAIEnhancer`, `ResumeConfidenceScorer`, and stage-level retry/dead-letter logic.
4. **Week 5:** Integrate person deduplication (`ResumePersonSuggestion`), DIC review flow, and confidence penalty casing.
5. **Week 6:** QA, boundary testing, performance profiling (target < 5s for DOCX, < 8s for PDF, async so request thread unblocked immediately).

---

## 15. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Resume layouts are too diverse | Required-section AI fallback trigger + human review queue ensures no data loss |
| Scanned PDFs without OCR | Resume parsing gates on `OCR_COMPLETED`; reuses existing `OCRService` |
| AI cost/quota exhaustion | Rule engine fallback; batch low-confidence for manual review; per-stage retry caps AI calls |
| Duplicate person records | Multi-signal dedup (email, phone, name Jaro-Winkler >= 0.92, institution >= 0.85) scoped to `organizationId`; manual override in DIC |
| Performance on large PDFs | Async pipeline via event bus; OCR pagination via `pdf-to-img` for >20 pages |
| Event bus blocking on AI latency | All resume stages run as async `ResumeStageJob`s via `KnowledgeQueueService` |
| Magic-byte validation bypass | Strict PDF (`%PDF`) and DOCX (`PK` + `[Content_Types].xml`) checks in controller before enqueue |
| Confidence score manipulation | Penalty caps are multiplicative and precedence-defined; unit tests cover boundary cases |
| Stage failure without recovery | Max 3 retries with exponential backoff; terminal failure creates dead-letter with `NEEDS_REINDEX` |

---

## 16. Must-Fix Review Findings — Resolution Confirmation

This section confirms that all Critical and High findings from the senior architecture review (`RESUME-PARSER-ARCHITECTURE-REVIEW.md`) have been resolved in this revised architecture.

| # | Severity | Original Finding | Resolution in Revised Architecture |
|---|----------|------------------|-----------------------------------|
| 1 | Critical | Synchronous event-handler anti-pattern — resume stages block the event bus on AI latency | **Section 2.1 & 9:** Resume upload returns `201` immediately. All resume stages execute as `ResumeStageJob`s via `KnowledgeQueueService`. No blocking in the event handler. |
| 2 | Critical | Missing OCR-aware sequencing — scanned PDFs receive no OCR text | **Section 2.1 & 9:** `ResumeParseEventListener` subscribes to both `UaipEvent.Parsed` and `UaipEvent.OCR_COMPLETED`. Stage 1 gates on OCR text availability for scanned documents. |
| 3 | Critical | Confidence score penalties under-specified | **Section 4.2:** Penalties are defined as multiplicative caps with exact precedence rules and a mathematical expression. No additive ambiguity. |
| 4 | High | No resume-stage retry / dead-letter queue | **Section 5:** Each resume stage is an independent `ResumeStageJob` with max 3 retries, exponential backoff, explicit failure events (`ResumeStageRetry`, `ResumeStageFailed`, `ResumeParseDeadLetter`), and terminal `NEEDS_REINDEX` state. |
| 5 | High | File content validation gap | **Section 8.1 & 10:** Controller validates PDF magic bytes (`%PDF`) and DOCX magic bytes (`PK` + `[Content_Types].xml`) before enqueue. Invalid files return `400` with security `warn` log. |
| 6 | High | Person deduplication under-specified | **Section 7.4:** Exact algorithm specified (email exact, phone exact, name Jaro-Winkler >= 0.92, institution >= 0.85), decision logic pseudocode, organization isolation, manual override, and library recommendation. |
| 7 | High | Section detection AI trigger too narrow | **Section 4.5 & Stage 1B:** Trigger changed from total section count to required-section check. If ANY of `HEADER`, `EXPERIENCE`, `EDUCATION`, `SKILLS` is missing, AI fallback is invoked. |

**Backlog items (Medium/Low from review):**
- AI result caching by `fileHash` — tracked for v1.1
- Rate limiting on `/api/resume/parse-upload` — can be added in same sprint as endpoint hardening
- Large PDF memory spike — use `pdf-to-img` for >20 pages; acceptable limitation for v1
- Hardcoded section alias registry — move to `ResumeSectionAlias` collection in v2
- Tight coupling to canonical model names — acceptable for v1; abstract via `ResumeRoutingModule` later
- No streaming for DOCX — acceptable under 10MB guardrail

**Overall verdict after revision:** APPROVED FOR IMPLEMENTATION
