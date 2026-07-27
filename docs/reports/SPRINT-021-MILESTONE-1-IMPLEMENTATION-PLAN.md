# Sprint-021 Milestone-1 — Implementation Plan

## 1. Scope Definition

**Deliverables:**
- ResumeTemplate schema additions
- Dual storage support
- DocxExtractionService
- Unit tests

**Explicitly out of scope:**
- AI entity detection
- XML placeholder injection
- Processed DOCX generation
- Controller/pipeline changes
- Frontend changes
- Database migration script

**Success criteria:**
- New schema compiles and passes validation
- Storage service supports dual uploads
- DocxExtractionService extracts text runs and formatting metadata from a sample DOCX
- Unit tests pass
- No existing functionality is broken

---

## 2. Schema Changes

**File:** `backend/src/models/ResumeTemplate.ts`

### 2.1 New Interface

Add to `IResumeTemplate`:

```typescript
export interface IResumeTemplate extends Document {
  // ... existing fields preserved

  // NEW: Dual storage
  originalFileUrl?: string;

  // NEW: Structured template model (empty until Milestone-2)
  sections?: ITemplateSection[];

  // NEW: Formatting metadata from extraction (empty until Milestone-2)
  formattingMetadata?: {
    styles: Record<string, any>;
    headingLevels: Record<string, number>;
    bulletMarker: string;
    dateFormat: string;
  };

  // NEW: Quality metrics (0 until Milestone-2)
  confidence?: number;
  reviewed?: boolean;
  reviewNotes?: string;
}
```

### 2.2 New Sub-Schemas

Add after existing schema definitions in the same file:

```typescript
export interface ITemplateSection {
  id: string;
  title: string;
  order: number;
  repeatable: boolean;
  maxEntries?: number;
  minEntries?: number;
  fields: ITemplateField[];
  aiPrompt?: string;
}

export interface ITemplateField {
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

### 2.3 Schema Field Definitions

Add to `ResumeTemplateSchema`:

```typescript
originalFileUrl: {
  type: String,
  required: false,
},

sections: [{
  id: String,
  title: String,
  order: Number,
  repeatable: Boolean,
  maxEntries: Number,
  minEntries: Number,
  fields: [{
    key: String,
    label: String,
    type: String,
    required: Boolean,
    aiEnhanceable: Boolean,
    placeholder: String,
    validation: {
      pattern: String,
      minLength: Number,
      maxLength: Number
    },
    options: [String]
  }],
  aiPrompt: String
}],

formattingMetadata: {
  styles: Schema.Types.Mixed,
  headingLevels: Schema.Types.Mixed,
  bulletMarker: String,
  dateFormat: String
},

confidence: {
  type: Number,
  default: 0,
  min: 0,
  max: 1
},

reviewed: {
  type: Boolean,
  default: false
},

reviewNotes: {
  type: String,
  default: ''
}
```

### 2.4 Critical Constraints

- **Keep `questions` field** — do NOT remove or deprecate
- **All new fields are optional** — `required: false` or with defaults
- **No migration script** in Milestone-1
- **No index additions** yet (add in Milestone-2 if review queue is used)

---

## 3. Storage Service Changes

**File:** `backend/src/services/storageService.ts`

### 3.1 New Method: `uploadResumeTemplateOriginal`

```typescript
async uploadResumeTemplateOriginal(
  buffer: Buffer,
  originalName: string,
  organizationId: string
): Promise<string>
```

**Behavior:**
- Uploads to Cloudinary path: `academicuniverse/templates/{orgId}/original_{timestamp}_{sanitized_name}.docx`
- Returns secure URL
- Same error handling as existing `uploadResumeTemplate`

### 3.2 Modified Method: `uploadResumeTemplate`

**Change:** Rename to `uploadResumeTemplateProcessed` internally, but keep the public method name `uploadResumeTemplate` for backward compatibility.

**Behavior:**
- Uploads to Cloudinary path: `academicuniverse/templates/{orgId}/processed_{timestamp}_{sanitized_name}.docx`
- Returns secure URL
- Same error handling

**Rationale for keeping same method name:**
- Controller currently calls `uploadResumeTemplate`
- Changing the method name would require controller changes in Milestone-3
- The method semantics change from "upload original" to "upload processed" in Milestone-3
- For Milestone-1, keep existing behavior unchanged

### 3.3 No Other Changes

- Do NOT modify `uploadTimetable`
- Do NOT modify `getContentType`
- Do NOT add mock storage logic

---

## 4. DocxExtractionService

**File:** `backend/src/services/docxExtraction.service.ts`

### 4.1 Responsibility

Pure extraction only. Given a DOCX buffer, return structured representation of text runs, paragraphs, and formatting metadata. No AI, no entity detection, no XML injection, no docxtemplater validation.

### 4.2 Public Interface

```typescript
export interface ExtractedRun {
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

export interface ExtractedDocument {
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
  placeholderCount: number; // Count of {{...}} patterns found
}

export class DocxExtractionService {
  async extract(buffer: Buffer): Promise<ExtractedDocument>;
}
```

### 4.3 Implementation Requirements

1. **Use PizZip** to open DOCX (already a dependency via docxtemplater)
2. **Read `word/document.xml`** as text
3. **Parse XML** using `DOMParser` (browser-style) or regex-based parsing (Node-native)
   - **Recommended: regex-based** to avoid JSDOM dependency
   - Extract `<w:p>` paragraphs
   - Extract `<w:r>` runs within paragraphs
   - Extract `<w:t>` text nodes within runs
   - Extract `<w:rPr>` formatting properties within runs
4. **Build ordered output:**
   - `paragraphs[]` in document order
   - Each paragraph contains `runs[]` in document order
   - Each run contains `text` and `formatting`
5. **Detect tables:** scan for `<w:tbl>` elements
6. **Detect images:** scan for `<w:drawing>` or `<a:blip>` elements
7. **Count placeholders:** regex `/\{\{([^}]+)\}\}/g` on full text

### 4.4 Formatting Extraction

From `<w:rPr>`:
- `<w:b/>` → `bold: true`
- `<w:i/>` → `italic: true`
- `<w:u/>` → `underline: true`
- `<w:rFonts w:ascii="Arial"/>` → `font: "Arial"`
- `<w:sz w:val="24"/>` → `fontSize: 12` (half-points → points conversion)
- `<w:color w:val="FF0000"/>` → `color: "FF0000"`

### 4.5 XML Path Construction

Build relative path strings for each text node:
```
p[3]/r[1]/t[0]
p[3]/r[2]/t[0]
p[4]/r[0]/t[0]
```

This is used in Milestone-3 for placeholder injection. DO NOT implement injection in Milestone-1, but the path structure must be correct.

### 4.6 Edge Cases

| Edge Case | Handling |
|-----------|----------|
| Empty `<w:t>` nodes | Include in output with `text: ""` |
| Missing `<w:rPr>` | Return defaults (`bold: false`, etc.) |
| Nested formatting (bold + italic) | Parse all properties, return combined flags |
| Split text across runs | Each run is separate entry with its own formatting |
| Tables | Set `hasTables: true`, extract table text in paragraph order |
| Images | Set `hasImages: true`, do NOT extract image data |
| Placeholders in text | Count them, include raw text in `rawText` |

### 4.7 No Side Effects

- Do NOT modify the input buffer
- Do NOT write to filesystem
- Do NOT call external APIs
- Do NOT call docxtemplater
- Do NOT call PizZip `generate()`

---

## 5. Storage Naming Convention

Enforce consistent naming to support Milestone-3 dual-upload logic.

| Method | Path Pattern | Example |
|--------|-------------|---------|
| `uploadResumeTemplateOriginal` (new) | `academicuniverse/templates/{orgId}/original_{timestamp}_{name}.docx` | `academicuniverse/templates/org123/original_1753130000_resume_kushagra.docx` |
| `uploadResumeTemplate` (existing) | `academicuniverse/templates/{orgId}/template_{timestamp}_{name}.docx` | `academicuniverse/templates/org123/template_1753130000_resume_kushagra.docx` |

**Note:** In Milestone-3, the existing `uploadResumeTemplate` will be repurposed to upload the processed template. The naming stays the same (`template_` prefix). The new `uploadResumeTemplateOriginal` always uploads the faculty's original file.

---

## 6. Unit Tests

### 6.1 Test Files

| File | Coverage |
|------|----------|
| `backend/src/__tests__/docxExtraction.service.test.ts` | DocxExtractionService |

### 6.2 Test Strategy

**Do NOT create integration tests that require actual DOCX parsing in this milestone.** Unit tests should mock the PizZip layer and test the transformation logic.

**Test cases:**

| Test | Description |
|------|-------------|
| `extracts paragraphs in order` | Mock PizZip to return XML with 3 paragraphs. Verify output has 3 paragraphs in order. |
| `extracts runs within paragraphs` | Mock XML with one paragraph containing 2 runs. Verify paragraph.runs.length === 2. |
| `detects bold formatting` | Mock `<w:rPr><w:b/></w:rPr>`. Verify `run.formatting.bold === true`. |
| `detects italic formatting` | Mock `<w:i/>`. Verify `run.formatting.italic === true`. |
| `extracts font and size` | Mock `<w:rFonts w:ascii="Arial"/>` and `<w:sz w:val="24"/>`. Verify fields. |
| `handles missing rPr` | Mock run without `<w:rPr>`. Verify defaults are false/undefined. |
| `detects tables` | Mock XML containing `<w:tbl>`. Verify `hasTables === true`. |
| `detects images` | Mock XML containing `<w:drawing>`. Verify `hasImages === true`. |
| `counts placeholders` | Mock text containing `{{name}}` and `{{email}}`. Verify `placeholderCount === 2`. |
| `handles empty text nodes` | Mock `<w:t></w:t>`. Verify text is `""` not undefined. |
| `constructs xmlPath` | Mock ordered runs. Verify xmlPath strings match expected relative paths. |
| `handles special characters in text` | Mock `<w:t>Kushagra & Singh</w:t>`. Verify text content is correctly extracted. |

### 6.3 Mock Strategy

```typescript
jest.mock('pizzip', () => ({
  default: jest.fn().mockImplementation(() => ({
    file: jest.fn().mockReturnValue('<mock xml here>'),
  })),
}));
```

Provide inline XML strings in each test case. Do NOT load external files.

---

## 7. File-by-File Changes

### 7.1 New Files

| File | Lines (est.) | Purpose |
|------|---------------|---------|
| `backend/src/models/ResumeTemplate.ts` | +60 | Add new interfaces and schema fields |
| `backend/src/services/docxExtraction.service.ts` | +200 | Extraction service |
| `backend/src/__tests__/docxExtraction.service.test.ts` | +250 | Unit tests |

### 7.2 Modified Files

| File | Changes |
|------|---------|
| `backend/src/services/storageService.ts` | Add `uploadResumeTemplateOriginal` method (+30 lines) |

### 7.3 Unchanged Files

| File | Reason |
|------|--------|
| `backend/src/controllers/resumeController.ts` | No upload pipeline changes yet |
| `backend/src/services/resumeService.ts` | Generation unchanged |
| `backend/src/models/TemplateReviewQueue.ts` | Milestone-4 |
| Frontend files | No changes |

---

## 8. Dependencies

### 8.1 Already Available

- `pizzip` — used by `docxtemplater` and `resumeService.ts`
- `mammoth` — already in dependency tree

### 8.2 No New Dependencies

Milestone-1 does NOT require:
- `@google/generative-ai`
- `openai`
- `jsdom`
- `xml2js`
- Any new packages

All parsing uses native Node.js `Buffer` and regex/string operations.

---

## 9. Implementation Order

| Step | Task | Est. Time |
|------|------|-----------|
| 1 | Update `ResumeTemplate` schema with new optional fields | 1 hour |
| 2 | Add `uploadResumeTemplateOriginal` to `StorageService` | 1 hour |
| 3 | Implement `DocxExtractionService` core extraction | 3 hours |
| 4 | Implement formatting extraction from `<w:rPr>` | 2 hours |
| 5 | Implement table/image detection | 1 hour |
| 6 | Implement placeholder counting | 30 min |
| 7 | Write unit tests (12 test cases) | 3 hours |
| 8 | Run TypeScript compilation (`npx tsc --noEmit`) | 30 min |
| 9 | Run tests (`npx jest`) | 30 min |
| 10 | Manual smoke test with Kushagra DOCX | 1 hour |

**Total: ~13 hours of development**

---

## 10. Verification Checklist

- [ ] `npx tsc --noEmit` passes with no new errors in `src/`
- [ ] `npx jest` passes all new tests
- [ ] `DocxExtractionService` can be imported and instantiated without errors
- [ ] Manual test: extract sample DOCX, verify output structure
- [ ] `ResumeTemplate` model accepts documents with new optional fields
- [ ] `StorageService.uploadResumeTemplateOriginal` uploads to correct Cloudinary path
- [ ] No changes to existing `uploadResumeTemplate` behavior

---

## 11. Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| DOCX XML parsing fails on unusual structures | Low | Milestone-1 is extraction-only; failures are non-breaking |
| PizZip not available in test environment | Low | Mock PizZip in tests |
| Cloudinary path conflicts | Very Low | Timestamp-based naming guarantees uniqueness |
| Schema change breaks existing queries | Very Low | New fields are optional; existing queries unaffected |
| XML path format incompatible with Milestone-3 | Medium | Document exact path format; Milestone-3 implementation plan will reference it |

---

## 12. What Milestone-2 Will Build On

Milestone-1 output enables Milestone-2 by providing:
- `ExtractedDocument` with ordered `paragraphs[]` and `runs[]`
- `xmlPath` for each text node (enables precise injection later)
- `formatting` metadata (enables formatting preservation during injection)
- `placeholderCount` baseline (enables confidence scoring)
- Schema fields `sections`, `confidence`, `reviewed` ready for population

Milestone-1 does NOT commit to any extraction being correct or complete. It only proves the extraction pipeline works mechanically. Quality of extraction is the responsibility of Milestone-2 (AI + rules).

---

## 13. No-Go Criteria

Do NOT proceed to Milestone-2 if:
- DocxExtractionService cannot extract text from the Kushagra DOCX
- Unit tests have flaky or incomplete coverage
- Schema changes cause migration issues in local dev
- Storage service dual-upload conflicts with existing Cloudinary folder structure

---

## 14. Approval Checklist

- [ ] Schema field names approved (`originalFileUrl`, `sections`, `formattingMetadata`, `confidence`, `reviewed`, `reviewNotes`)
- [ ] Cloudinary path pattern approved (`original_` vs `template_` prefixes)
- [ ] XML path format approved (`p[3]/r[1]/t[0]` style)
- [ ] Unit test count and scope approved (12 cases)
- [ ] No AI cost in Milestone-1 confirmed
- [ ] No frontend changes confirmed
- [ ] No controller changes confirmed
- [ ] Kushagra DOCX designated as golden test case for extraction

**Awaiting approval to begin Milestone-1 implementation.**
