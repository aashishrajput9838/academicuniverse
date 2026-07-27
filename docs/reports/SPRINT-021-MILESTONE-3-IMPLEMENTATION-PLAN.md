# Sprint-021 Milestone-3 — Implementation Plan: Template Generation

## 1. Scope Definition

**Deliverables:**
- XML placeholder injection using `DocxLocation`
- Processed DOCX generation via PizZip `generate()`
- Docxtemplater integration for final DOCX assembly
- Controller integration for end-to-end pipeline
- Deterministic unit tests for all new services

**Explicitly out of scope:**
- AI entity detection (already in Milestone-2)
- Section detection (already in Milestone-2)
- Confidence scoring (already in Milestone-2)
- Frontend changes
- Database migration scripts
- XML mutation beyond placeholder injection

**Success criteria:**
- Original DOCX is transformed into a template with `{{placeholders}}`
- Placeholders use structured `DocxLocation` for precise injection
- Processed DOCX can be filled via docxtemplater
- End-to-end pipeline: DOCX → extraction → injection → filled DOCX
- All tests deterministic and passing
- No regressions in Milestone-1 or Milestone-2

---

## 2. Architecture Overview

```
Original DOCX
    ↓
[DocxExtractionService] (Milestone-1)
    ↓
ExtractedDocument { paragraphs[], runs[], formatting }
    ↓
[SectionDetectorService] (Milestone-2)
    ↓
DetectedSection[] { fields[] }
    ↓
[PlaceholderInjector] (NEW - Milestone-3)
    ↓
Modified DOCX XML with {{field_key}} placeholders
    ↓
[DocxTemplateGenerator] (NEW - Milestone-3)
    ↓
Processed DOCX (template ready for docxtemplater)
    ↓
[docxtemplater] fill with data
    ↓
Final filled DOCX
```

---

## 3. Core Components

### 3.1 PlaceholderInjector Service

**File:** `backend/src/services/placeholderInjector.service.ts`

**Responsibility:** Inject `{{field_key}}` placeholders into DOCX XML at precise locations determined by `DocxLocation`.

**Algorithm:**
1. Receive `ExtractedDocument` + `DetectedSection[]`
2. For each section, iterate through fields
3. Map each field to text runs in the section body
4. Replace run text content with `{{field_key}}` using `DocxLocation.pathString`
5. Preserve all formatting (bold, italic, etc.)
6. Write modified XML back to PizZip

**Key Rules:**
- Use `DocxLocation` for precise XML node targeting
- Preserve all existing formatting (`w:rPr`)
- Only replace text nodes (`w:t`), never modify structure
- Maintain immutable input pattern (clone buffer first)

### 3.2 DocxTemplateGenerator Service

**File:** `backend/src/services/docxTemplateGenerator.service.ts`

**Responsibility:** Generate final processed DOCX from modified XML.

**Algorithm:**
1. Receive modified PizZip buffer
2. Call `zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' })`
3. Return Buffer ready for upload to Cloudinary
4. Handle errors gracefully

### 3.3 TemplateProcessingOrchestrator

**File:** `backend/src/services/templateProcessingOrchestrator.service.ts`

**Responsibility:** Orchestrate the full pipeline from DOCX to processed template.

**Flow:**
1. Accept raw DOCX buffer
2. Run `DocxExtractionService`
3. Run `SectionDetectorService`
4. Run `PlaceholderInjector`
5. Run `DocxTemplateGenerator`
6. Upload processed template to Cloudinary
7. Return `{ originalFileUrl, processedFileUrl, sections, entities, confidence }`

---

## 4. File-by-File Changes

### 4.1 New Files

| File | Purpose |
|---|---|
| `backend/src/services/placeholderInjector.service.ts` | XML placeholder injection |
| `backend/src/services/docxTemplateGenerator.service.ts` | DOCX generation from modified XML |
| `backend/src/services/templateProcessingOrchestrator.service.ts` | End-to-end orchestration |
| `backend/src/__tests__/placeholderInjector.service.test.ts` | Unit tests |
| `backend/src/__tests__/docxTemplateGenerator.service.test.ts` | Unit tests |
| `backend/src/__tests__/templateProcessingOrchestrator.service.test.ts` | Integration tests |

### 4.2 Modified Files

| File | Changes |
|---|---|
| `backend/src/controllers/resumeController.ts` | Add endpoint for template processing |
| `backend/src/models/ResumeTemplate.ts` | No changes (schema already has slots) |

---

## 5. Placeholder Injection Strategy

### 5.1 Location-Based Replacement

Use `DocxLocation.pathString` to navigate XML:
```
p[0]/r[3]/t[0] → paragraph 0, run 3, text node 0
```

**XML Navigation:**
1. Parse `word/document.xml` with fast-xml-parser (already used)
2. Navigate to target `<w:p>` by paragraphIndex
3. Navigate to target `<w:r>` by runIndex
4. Replace text in `<w:t>` with `{{field_key}}`
5. Serialize back to XML string
6. Write back to PizZip

### 5.2 Field-to-Text Mapping

For each `DetectedSection.field`:
- Map field to paragraph text by semantic similarity
- Use first paragraph in section body as primary mapping target
- For repeatable sections, create multiple placeholder groups

### 5.3 Immutability Guarantee

- Input buffer cloned via `Buffer.from(buffer)`
- PizZip reads only; modifications written to new zip instance
- Original buffer never modified

---

## 6. DocxTemplateGenerator Strategy

### 6.1 Generation Process

```typescript
const zip = new PizZip(modifiedXmlBuffer);
const docxBuffer = zip.generate({
  type: 'nodebuffer',
  compression: 'DEFLATE'
});
```

### 6.2 Validation

- Verify output is valid Buffer
- Verify MIME type is `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- Verify file size > 0

---

## 7. Controller Integration

### 7.1 New Endpoint

`POST /api/resume/templates/process`

**Request:**
```json
{
  "templateId": "string",
  "studentData": { ... }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "originalFileUrl": "string",
    "processedFileUrl": "string",
    "sections": [ ... ],
    "entities": [ ... ],
    "confidence": 0.95,
    "docxBase64": "string"
  }
}
```

### 7.2 Flow

1. Fetch template by ID
2. Download original DOCX from Cloudinary
3. Run `TemplateProcessingOrchestrator`
4. Upload processed DOCX to Cloudinary
5. Return URLs + metadata

---

## 8. Unit Tests

### 8.1 Test Strategy

- All tests use in-memory XML strings (no file I/O)
- PizZip mocked for isolation
- Docxtemplater mocked for deterministic tests
- No network calls in default tests

### 8.2 Test Coverage

| Service | Tests | Focus |
|---|---|---|
| `PlaceholderInjector` | 12 | XML navigation, placeholder replacement, formatting preservation, immutability |
| `DocxTemplateGenerator` | 6 | Buffer generation, validation, error handling |
| `TemplateProcessingOrchestrator` | 8 | End-to-end flow, error propagation, upload simulation |
| **Total** | **26** | — |

---

## 9. Dependencies

No new dependencies. Uses existing:
- `pizzip` (already in package.json)
- `fast-xml-parser` (already in package.json)
- `cloudinary` (already in package.json)
- `docxtemplater` (already in package.json)

---

## 10. Implementation Order

| Step | Task | Est. Time |
|---|---|---|
| 1 | Create Milestone-3 implementation plan | 30 min |
| 2 | Implement `PlaceholderInjector` | 3 hours |
| 3 | Implement `DocxTemplateGenerator` | 1 hour |
| 4 | Implement `TemplateProcessingOrchestrator` | 2 hours |
| 5 | Write unit tests for `PlaceholderInjector` | 2 hours |
| 6 | Write unit tests for `DocxTemplateGenerator` | 1 hour |
| 7 | Write unit tests for `TemplateProcessingOrchestrator` | 1.5 hours |
| 8 | Controller integration | 1 hour |
| 9 | Run TypeScript compilation | 30 min |
| 10 | Run tests | 30 min |
| 11 | Manual verification with Kushagra DOCX | 1 hour |
| 12 | Generate reports | 1 hour |

**Total: ~14 hours**

---

## 11. Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| XML namespace handling breaks injection | Medium | Use existing `normalizeDocx` from Milestone-1 |
| Docxtemplater template validation fails | Low | Pre-validate with simple XML tests |
| Cloudinary upload conflicts | Low | Unique filenames with timestamps |
| Performance regression | Low | Measure against Milestone-2 baseline |

---

## 12. Approval

- [ ] Placeholder injection strategy approved
- [ ] DocxTemplateGenerator approach approved
- [ ] Controller endpoint design approved
- [ ] Test coverage approved (26 tests)
- [ ] No new dependencies confirmed
- [ ] Backward compatibility confirmed
