# Sprint-021 Phase-1 — Resume Template Engine Implementation Plan

## 1. Overview

Implement Approach C from the architecture proposal: pre-process faculty DOCX uploads into internal placeholder templates during upload. Store both original and processed DOCX. Build a modular service layer for extraction, injection, and validation.

**Guiding principle identified in architecture approval:**
- Store BOTH original DOCX and processed template DOCX
- Generation always uses processed template
- Original remains available for future re-processing
- Upload fails safely on low confidence / injection failure
- Keep implementation modular with dedicated services

---

## 2. New Files

| File | Responsibility |
|------|----------------|
| `backend/src/services/docxExtraction.service.ts` | Extract text runs + formatting metadata from DOCX XML. Returns ordered paragraph list with runs, styles, and text content. |
| `backend/src/services/docxTemplateProcessor.service.ts` | Inject `{{placeholders}}` into original DOCX XML. Replaces text nodes while preserving all formatting. Validates resulting DOCX with docxtemplater dry-run. |
| `backend/src/services/resumeTemplateBuilder.service.ts` | Orchestrate the upload pipeline: extraction → entity detection → placeholder injection → form model generation → validation. |
| `backend/src/models/TemplateReviewQueue.ts` | New collection for faculty review workflow. Tracks template processing status, issues, and approval state. |
| `backend/src/__tests__/docxExtraction.service.test.ts` | Unit tests for DOCX text/formatting extraction. |
| `backend/src/__tests__/docxTemplateProcessor.service.test.ts` | Unit tests for placeholder injection and DOCX validation. |
| `backend/src/__tests__/resumeTemplateBuilder.service.test.ts` | Integration tests for the full upload pipeline. |

---

## 3. Modified Files

### 3.1 `backend/src/models/ResumeTemplate.ts`

**Changes:**

| Action | Field | Details |
|--------|-------|---------|
| **Add** | `originalFileUrl` | String. URL to the unmodified faculty upload. Preserved for re-processing. |
| **Add** | `sections` | Array of `TemplateSection` objects. Replaces `questions` as the primary form model. |
| **Add** | `formattingMetadata` | Mixed object. Stores detected styles, heading levels, bullet markers, date formats. |
| **Add** | `confidence` | Number (0-1). Extraction confidence score. |
| **Add** | `reviewed` | Boolean. Whether faculty has reviewed and approved the template. Default `false`. |
| **Add** | `reviewNotes` | String (optional). Faculty feedback on template. |
| **Keep** | `questions` | Array (existing). Retained for backward compatibility during migration. Existing templates still return `questions` if `sections` is empty. |

**New sub-schemas:**

```typescript
interface ITemplateSection {
  id: string;
  title: string;
  order: number;
  repeatable: boolean;
  maxEntries?: number;
  minEntries?: number;
  fields: ITemplateField[];
  aiPrompt?: string;
}

interface ITemplateField {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'date' | 'email' | 'phone' | 'url' | 'select' | 'list';
  required: boolean;
  aiEnhanceable: boolean;
  placeholder?: string;
  validation?: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
  };
  options?: string[];
}
```

**Migration note:** Existing `questions` arrays should be migrated to a default `sections` structure during a backfill script, OR the frontend/form renderer should gracefully fall back to `questions` when `sections` is empty.

### 3.2 `backend/src/controllers/resumeController.ts`

**Changes:**

| Action | Details |
|--------|---------|
| **Modify** `uploadTemplateController` | Replace inline extraction logic with call to new `ResumeTemplateBuilder` service. Pass original buffer + metadata. Handle rejection on low confidence. |
| **Modify** `getAvailableTemplatesController` | Add `sections` to populated fields if not already included. Ensure frontend receives new schema. |
| **Add** `reviewTemplateController` | Accept faculty review decision (approve/reject/request revision) for a template. Updates `reviewed`, `reviewNotes`, and optionally `sections`. |
| **Add** `getTemplatePreviewController` | Return the processed template DOCX for faculty preview in the review queue. |

### 3.3 `backend/src/services/resumeService.ts`

**Changes:**

| Action | Details |
|--------|---------|
| **Modify** `processResumeTemplate` | Accept `originalUrl` parameter (or detect from template metadata). Load processed template DOCX (with placeholders) instead of original. If processed template missing, fall back to original with warning. |
| **Keep** AI enhancement phase | Unchanged. Still applies to enhanceable textarea fields. |
| **Keep** Mammoth preview generation | Unchanged. |

### 3.4 `backend/src/services/storageService.ts`

**Changes:**

| Action | Details |
|--------|---------|
| **Add** `uploadResumeTemplateOriginal` | Upload original unmodified DOCX to Cloudinary path: `academicuniverse/templates/{orgId}/original_{timestamp}_{name}.docx` |
| **Add** `uploadResumeTemplateProcessed` | Upload processed placeholder-injected DOCX to Cloudinary path: `academicuniverse/templates/{orgId}/processed_{timestamp}_{name}.docx` |
| **Keep** existing `uploadResumeTemplate` | Deprecated but retained for backward compatibility. Redirects to `uploadResumeTemplateOriginal`. |

### 3.5 `backend/src/routes/resumeRoutes.ts`

**Changes:**

| Action | Details |
|--------|---------|
| **Add** `router.get('/templates/:id/review')` | Get template with review status for faculty review queue. |
| **Add** `router.post('/templates/:id/review')` | Submit faculty review decision. |
| **Add** `router.get('/templates/pending-review')` | List all templates pending review for the org. |

### 3.6 Frontend Files (No structural changes, only data contract adaptation)

| File | Changes |
|------|---------|
| `app/dashboard/faculty/resume-templates/components/TemplateList.tsx` | Display review status badge (pending/approved/rejected). Add review button. |
| `app/dashboard/faculty/resume-templates/components/TemplateReviewModal.tsx` | New modal for faculty to review extracted sections, edit fields, approve/reject. |
| `app/dashboard/student/resume-builder/components/ResumeForm/ResumeForm.tsx` | Adapt to use `template.sections` instead of `template.questions`. Graceful fallback to `questions` during transition. |
| `app/dashboard/student/resume-builder/components/TemplateSelection/TemplateCard.tsx` | Show confidence indicator. Show "Needs Review" badge. |

---

## 4. Database / Schema Changes

### 4.1 ResumeTemplate Migration

**Script:** `backend/src/scripts/migrate-resume-templates-to-sections.ts`

```typescript
// Run once to backfill existing templates
// Option A: Migrate legacy questions → default sections
// Option B: Mark existing templates as reviewed with confidence: 0, sections: []
```

Recommended: **Option B** — existing templates were uploaded without the new pipeline. Mark them as `reviewed: true, confidence: 0` so they remain visible but are flagged for faculty to re-upload. This avoids fabricating section data from flat `questions`.

### 4.2 TemplateReviewQueue Collection

```typescript
{
  templateId: ObjectId (ref: ResumeTemplate),
  organizationId: ObjectId,
  submittedBy: ObjectId,
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'needs_revision'],
    default: 'pending'
  },
  issues: [{
    section: String,
    field: String,
    severity: 'error' | 'warning' | 'info',
    message: String
  }],
  reviewedBy: ObjectId,
  reviewedAt: Date,
  notes: String,
  createdAt: Date,
  updatedAt: Date
}
```

**Index:** `{ organizationId: 1, status: 1 }` for efficient review queue queries.

---

## 5. New Service Contracts

### 5.1 `DocxExtractionService`

```typescript
interface ExtractedRun {
  paragraphIndex: number;
  runIndex: number;
  text: string;
  xmlPath: string; // e.g., "p[3]/r[1]/t[0]"
  formatting: {
    bold: boolean;
    italic: boolean;
    underline: boolean;
    font?: string;
    fontSize?: number;
    color?: string;
  };
}

interface ExtractedDocument {
  runs: ExtractedRun[];
  paragraphs: Array<{
    index: number;
    runs: ExtractedRun[];
    style?: string;
    isHeading: boolean;
    rawText: string;
  }>;
  hasTables: boolean;
  hasImages: boolean;
}

class DocxExtractionService {
  extract(buffer: Buffer): Promise<ExtractedDocument>;
}
```

### 5.2 `DocxTemplateProcessorService`

```typescript
interface PlaceholderInjection {
  originalText: string;
  placeholder: string; // e.g., "name"
  xmlPath: string;
  confidence: number;
}

interface ProcessedTemplateResult {
  processedDocx: Buffer; // DOCX with {{placeholders}} injected
  originalDocx: Buffer;  // Unmodified original
  injections: PlaceholderInjection[];
  validationResult: {
    valid: boolean;
    error?: string;
    placeholderCount: number;
  };
}

class DocxTemplateProcessorService {
  async process(buffer: Buffer, entities: EntityDetection[]): Promise<ProcessedTemplateResult>;
  private injectPlaceholder(xml: string, entity: EntityDetection): string;
  private validateDocx(buffer: Buffer): Promise<boolean>;
}
```

### 5.3 `ResumeTemplateBuilderService`

```typescript
interface TemplateBuildResult {
  success: boolean;
  templateId?: string;
  sections?: ITemplateSection[];
  confidence: number;
  issues: Array<{
    severity: 'error' | 'warning' | 'info';
    message: string;
  }>;
  error?: string;
}

class ResumeTemplateBuilderService {
  constructor(
    private extraction: DocxExtractionService,
    private processor: DocxTemplateProcessorService,
    private ai: AIService,
    private storage: StorageService
  );

  async build(input: {
    originalBuffer: Buffer;
    originalName: string;
    organizationId: string;
    uploadedBy: string;
    type: string;
    target?: string;
  }): Promise<TemplateBuildResult>;
}
```

---

## 6. Upload Pipeline Flow

```
Faculty selects DOCX
        │
        ▼
multer receives file buffer
        │
        ▼
uploadTemplateController
        │
        ▼
ResumeTemplateBuilder.build()
        │
        ├── 1. DocxExtractionService.extract(buffer)
        │   └── Returns ordered paragraphs + runs with formatting
        │
        ├── 2. Entity Detection Engine
        │   ├── Rule-based: detect contacts, dates, section headers
        │   ├── LLM: classify sections + extract entities
        │   └── Merge results, assign confidence scores
        │
        ├── 3. Confidence check
        │   ├── confidence >= 0.7: proceed
        │   └── confidence < 0.7: FAIL → return error to faculty
        │
        ├── 4. DocxTemplateProcessorService.process(buffer, entities)
        │   ├── Inject placeholders into XML text nodes
        │   ├── Preserve all formatting
        │   ├── Validate processed DOCX with docxtemplater dry-run
        │   └── Return processedDocx + originalDocx + injections
        │
        ├── 5. If validation fails: FAIL → return error to faculty
        │
        ├── 6. Build sections[] from detected entities
        │
        ├── 7. Upload both DOCX files to Storage
        │   ├── originalFileUrl = original upload
        │   └── fileUrl = processed template
        │
        ├── 8. Save ResumeTemplate to MongoDB
        │   ├── sections, formattingMetadata, confidence, reviewed: false
        │   └── Create TemplateReviewQueue entry (status: 'pending')
        │
        └── 9. Return template ID + build result
```

---

## 7. Safe Failure Points

| Failure Point | Detection | Response |
|---------------|-----------|----------|
| DOCX parsing fails | ExtractionService throws | Reject upload. Log error. Return 400 to faculty. |
| No entities detected | `entities.length === 0` | Reject upload. Ask faculty to ensure resume has recognizable content. |
| Low confidence | `confidence < 0.7` | Reject upload. Ask faculty to review or try different template. |
| Placeholder injection fails | Processor returns `valid: false` | Reject upload. Log XML error. Return 500. |
| Processed DOCX invalid | docxtemplater dry-run throws | Reject upload. Do not store partial result. |
| Storage upload fails | Firebase/Cloudinary error | Reject upload. Retry once, then fail. |

**All failures must:**
- NOT store partial results in MongoDB
- NOT delete the faculty's original file if upload fails mid-pipeline
- Return a clear error message to the frontend
- Log detailed diagnostic info for debugging

---

## 8. API Contract Changes

### 8.1 `POST /api/resume/templates` (Upload)

**Request:** Unchanged. Same multipart form data.

**Response (success):**
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "templateName": "QA Department Template",
    "type": "department",
    "target": "CSE",
    "fileUrl": "https://.../processed_template.docx",
    "originalFileUrl": "https://.../original_upload.docx",
    "organizationId": "...",
    "uploadedBy": "...",
    "sections": [...],
    "formattingMetadata": {...},
    "confidence": 0.85,
    "reviewed": false,
    "reviewNotes": null,
    "createdAt": "...",
    "updatedAt": "..."
  },
  "message": "Resume template uploaded successfully. Pending faculty review."
}
```

**Response (failure):**
```json
{
  "success": false,
  "message": "Template extraction confidence too low (0.45). Please ensure your resume has clear section headers and recognizable content.",
  "issues": [
    { "severity": "error", "message": "Could not detect any contact information" },
    { "severity": "warning", "message": "Education section ambiguous" }
  ]
}
```

### 8.2 `GET /api/resume/templates` (Student)

**Response:** Unchanged shape. Frontend must handle both `sections` (new) and `questions` (legacy) during transition.

### 8.3 `GET /api/resume/templates/:id/review` (Faculty)

**New endpoint.** Returns template with review queue status.

### 8.4 `POST /api/resume/templates/:id/review` (Faculty)

**New endpoint.** Accepts `{ decision: 'approve' | 'reject' | 'needs_revision', notes?: string, sections?: ITemplateSection[] }`

---

## 9. Migration Strategy

### Phase 0: Schema Preparation (No Downtime)

1. Add new fields to `ResumeTemplate` as optional with defaults:
   - `originalFileUrl?: string`
   - `sections?: ITemplateSection[]`
   - `formattingMetadata?: any`
   - `confidence?: number`
   - `reviewed?: boolean`
   - `reviewNotes?: string`
2. Create `TemplateReviewQueue` collection
3. Deploy schema changes
4. **No data migration yet.** Existing templates continue to work with legacy `questions`.

### Phase 1: New Uploads (Week 1-2)

1. New templates use the new pipeline
2. New templates get `originalFileUrl`, `sections`, `confidence`, `reviewed: false`
3. Frontend still reads `questions` for old templates, `sections` for new templates
4. Faculty review queue enabled for new templates only

### Phase 2: Backfill (Week 3)

1. Run migration script on existing templates:
   - Set `reviewed: true` on all pre-existing templates (they were working before)
   - Set `confidence: 0` to indicate they were not processed by new engine
   - Optionally generate basic `sections` from legacy `questions` if needed
2. Frontend can now uniformly use `sections`

### Phase 3: Legacy Removal (Week 4+)

1. Remove `questions` field from schema
2. Remove `questions` fallback from frontend
3. Remove migration backfill code

---

## 10. Testing Strategy

### 10.1 Unit Tests

| Test Suite | Coverage |
|------------|----------|
| `docxExtraction.service.test.ts` | Extract text + formatting from sample DOCX. Verify run paths, bold/italic detection, paragraph ordering. |
| `docxTemplateProcessor.service.test.ts` | Inject placeholder into single-run text, multi-run text, table cells. Verify docxtemplater dry-run succeeds. |
| `resumeTemplateBuilder.service.test.ts` | Mock extraction + LLM + processor. Verify pipeline rejects on low confidence, accepts on high confidence, stores both DOCX URLs. |

### 10.2 Integration Tests

| Test | Scenario |
|------|----------|
| Upload valid DOCX | End-to-end: faculty uploads DOCX → template stored with `sections`, `fileUrl` = processed, `originalFileUrl` = original |
| Upload invalid DOCX | Upload malformed file → rejected, no DB record created |
| Low confidence DOCX | Upload DOCX with no recognizable sections → rejected with issues array |
| Generation from processed template | Student generates resume → docxtemplater renders placeholders, formatting preserved |
| Generation fallback | If processed template missing, fall back to original with warning log |
| Review workflow | Faculty approves template → `reviewed: true`, available to students |
| Re-upload after rejection | Faculty uploads after fixing → new template created, old one archived |

### 10.3 Regression Tests

| Existing Feature | Risk | Test |
|------------------|------|------|
| Global template visibility | Low | Student still sees global templates |
| Department template filtering | Low | Department matching unchanged |
| Resume generation with legacy templates | Medium | Legacy templates with empty `sections` must still generate (fallback to `questions`) |
| Template deletion | Medium | Deleting template removes both original and processed DOCX from storage |

---

## 11. Directory Structure After Implementation

```
backend/src/
├── models/
│   ├── ResumeTemplate.ts          # Modified: new fields
│   └── TemplateReviewQueue.ts     # New
├── services/
│   ├── docxExtraction.service.ts          # New
│   ├── docxTemplateProcessor.service.ts   # New
│   ├── resumeTemplateBuilder.service.ts   # New
│   ├── resumeService.ts                   # Modified: use processed template
│   └── storageService.ts                  # Modified: dual upload methods
├── controllers/
│   └── resumeController.ts                # Modified: use builder service
├── routes/
│   └── resumeRoutes.ts                    # Modified: add review routes
├── scripts/
│   └── migrate-resume-templates.ts        # New: backfill script
└── __tests__/
    ├── docxExtraction.service.test.ts      # New
    ├── docxTemplateProcessor.service.test.ts # New
    └── resumeTemplateBuilder.service.test.ts # New
```

---

## 12. Implementation Order

| Priority | Task | Estimated Effort |
|----------|------|-----------------|
| P0 | Schema changes + migration script | 1 day |
| P0 | `DocxExtractionService` + tests | 2 days |
| P1 | `DocxTemplateProcessorService` + tests | 2 days |
| P1 | `ResumeTemplateBuilderService` + tests | 3 days |
| P1 | Update `resumeController.ts` | 1 day |
| P2 | Update `resumeService.ts` generation pipeline | 1 day |
| P2 | Add review routes + queue model | 1 day |
| P2 | Frontend adaptation (sections vs questions) | 2 days |
| P3 | End-to-end testing with Kushagra DOCX | 1 day |
| P3 | Faculty review UI | 2 days |
| P3 | Error handling + logging polish | 1 day |

**Total estimated effort: 15-17 days** for complete Phase-1 implementation.

---

## 13. Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| XML replacement corrupts DOCX | High | Dry-run validation with docxtemplater before saving |
| LLM generates invalid JSON | Medium | Strict Zod validation, fallback to rule-based |
| Processing latency (>5s) | Medium | Show progress indicator, async queue for large files |
| Faculty confusion with new review workflow | Low | Clear UI messaging, email notifications |
| Storage costs (dual DOCX storage) | Low | DOCX files are ~50KB each; 1000 templates = 50MB |
| Backward compatibility break | Medium | Frontend reads both `sections` and `questions` during transition |

---

## 14. Open Questions (To Resolve Before Coding)

1. **Should the review queue be mandatory or optional?** Mandatory adds friction but ensures quality. Optional is faster but risks bad templates reaching students.
2. **What is the minimum confidence threshold?** Recommend 0.7 initially, adjustable based on live results.
3. **Should faculty be able to edit extracted sections before approval?** Yes, recommended. Adds complexity but improves quality.
4. **Should we support PPTX/PDF templates in future?** Out of scope for Phase-1, but architecture should not preclude it.
5. **Maximum DOCX file size?** Recommend 5MB same as current limit.

---

## 15. Approval Checklist

- [ ] Schema changes approved by backend team
- [ ] Storage path strategy approved (`original_` vs `processed_` prefixes)
- [ ] Confidence threshold agreed (0.7?)
- [ ] Review queue workflow approved (mandatory vs optional)
- [ ] Frontend fallback strategy approved (`sections` vs `questions`)
- [ ] Migration backfill approach approved (Option A vs Option B)
- [ ] LLM cost budget approved
- [ ] Kushagra DOCX designated as golden test case

**No code changes in this plan. Awaiting approval before implementation begins.**
