# Sprint-021 Milestone-4 — Implementation Plan: Resume Generation

## 1. Scope Definition

**Deliverables:**
- Student resume data validation and binding
- Docxtemplater-based placeholder filling
- Final filled DOCX generation
- Resume generation controller endpoint
- Deterministic unit tests for all new services
- End-to-end integration test

**Explicitly out of scope:**
- Modifying Milestone-1/2/3 logic
- AI-assisted content enhancement (exists but not changed)
- Frontend changes
- Database migration scripts
- Cloudinary upload logic changes

**Success criteria:**
- Processed template with `{{placeholders}}` can be filled with student data
- Final DOCX opens correctly in Microsoft Word
- All formatting preserved after filling
- Deterministic tests cover all new features
- No regressions in existing tests

---

## 2. Architecture Overview

```
Processed DOCX Template (with {{placeholders}})
    ↓
[ResumeDataService] (NEW - Milestone-4)
    ↓
Validated student data payload
    ↓
[DocxTemplateFiller] (NEW - Milestone-4)
    ↓
Filled DOCX via docxtemplater
    ↓
[ResumeGenerationOrchestrator] (NEW - Milestone-4)
    ↓
Final filled DOCX Buffer
    ↓
Cloudinary Upload / Direct Response
```

---

## 3. Core Components

### 3.1 ResumeDataService

**File:** `backend/src/services/resumeData.service.ts`

**Responsibility:** Validate and normalize student data before template filling.

**Validation rules:**
- Required fields present
- Field types match schema (text, textarea, date, email, phone, url, list)
- Max length constraints respected
- Email/phone/URL format validation
- List items non-empty

### 3.2 DocxTemplateFiller Service

**File:** `backend/src/services/docxTemplateFiller.service.ts`

**Responsibility:** Fill processed template with student data using docxtemplater.

**Algorithm:**
1. Load processed DOCX buffer into PizZip
2. Initialize docxtemplater with `{ paragraphLoop: true, linebreaks: true }`
3. Set student data
4. Render template
5. Generate final DOCX buffer
6. Handle errors gracefully

### 3.3 ResumeGenerationOrchestrator

**File:** `backend/src/services/resumeGenerationOrchestrator.service.ts`

**Responsibility:** Orchestrate the full generation pipeline.

**Flow:**
1. Accept processed template buffer + student data
2. Validate data via ResumeDataService
3. Fill template via DocxTemplateFiller
4. Return `{ docxBuffer, htmlPreview, validationResult }`

---

## 4. Controller Integration

### 4.1 New Endpoint

`POST /api/resume/generate`

**Request:**
```json
{
  "processedTemplateBuffer": "base64...",
  "studentData": { ... }
}
```

**Response:**
```json
{
  "success": true,
  "docxBase64": "base64...",
  "htmlPreview": "<html>...</html>",
  "validation": { ... }
}
```

---

## 5. Implementation Order

| Step | Task | Est. Time |
|---|---|---|
| 1 | Create Milestone-4 implementation plan | 30 min |
| 2 | Implement ResumeDataService | 2 hours |
| 3 | Implement DocxTemplateFiller | 2 hours |
| 4 | Implement ResumeGenerationOrchestrator | 1.5 hours |
| 5 | Controller integration | 1 hour |
| 6 | Write unit tests | 3 hours |
| 7 | Run TypeScript compilation | 30 min |
| 8 | Run tests | 30 min |
| 9 | Generate reports | 1 hour |

**Total: ~12 hours**

---

## 6. Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| docxtemplater compatibility | Medium | Use existing proven configuration |
| Data validation gaps | Low | Comprehensive schema validation |
| Performance regression | Low | Measure against baseline |
| Cloudinary conflicts | Low | Follow existing pattern |

---

## 7. Approval

- [x] Implementation plan approved
- [x] HOTFIX-001 accepted as stable baseline
- [ ] Proceed to implementation
