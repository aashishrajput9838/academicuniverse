# Milestone-1 Implementation Report — Sprint-021

**Status:** COMPLETED
**Date:** 2026-07-22
**Approved by:** Milestone-1 review with 3 additional implementation constraints

---

## 1. Summary

Milestone-1 establishes the foundation for the AI-enhanced resume template pipeline by adding:

- Schema extensions to `ResumeTemplate` for dual storage, structured sections, formatting metadata, and review tracking
- A new `uploadResumeTemplateOriginal()` method in `StorageService` for Cloudinary dual-upload support
- `DocxExtractionService` — a pure, immutable extraction service for DOCX files
- Unit tests covering 15 extraction scenarios

No existing functionality was broken, and no controller, frontend, or AI logic was introduced.

---

## 2. File Changes

### 2.1 New Files

| File | Purpose |
|---|---|
| `backend/src/docxExtraction.service.ts` | Core DOCX extraction service using PizZip + fast-xml-parser |
| `backend/src/__tests__/docxExtraction.service.test.ts` | 15 unit tests for the extraction service |

### 2.2 Modified Files

| File | Changes |
|---|---|
| `backend/src/models/ResumeTemplate.ts` | Added optional fields: `originalFileUrl`, `sections`, `formattingMetadata`, `confidence`, `reviewed`, `reviewNotes` |
| `backend/src/services/storageService.ts` | Added `uploadResumeTemplateOriginal()` method |

### 2.3 New Dependency

| Package | Reason |
|---|---|
| `fast-xml-parser` | Proper XML parser for DOCX `word/document.xml` (constraint #1) |

No other dependencies were added.

---

## 3. Implementation Constraints

Milestone-1 was approved with three additional constraints. All were satisfied:

### 3.1 Constraint: No Regex XML Parsing (use proper parser)
- **Satisfied:** Uses `fast-xml-parser` (`XMLParser`) for all DOCX XML parsing
- **Implementation:** `docxExtraction.service.ts:49` — `XMLParser` instantiated with `ignoreAttributes: false`, namespaced tag support (`w:` prefix), and a custom `normalizeDocx()` post-processor to convert whitespace-#text nodes and normalize single-element arrays

### 3.2 Constraint: Structured Location Objects
- **Satisfied:** Replaced `xmlPath` string with `DocxLocation` object
- **Implementation:** `docxExtraction.service.ts:6-12` — `DocxLocation` interface with `paragraphIndex`, `runIndex`, `textIndex`, and `pathString`
- Every `ExtractedRun` includes a `location` field of this type

### 3.3 Constraint: Complete Immutability
- **Satisfied:** Service never modifies input or writes back to DOCX
- **Implementation:**
  - `const inputBuffer = Buffer.from(buffer)` — creates defensive copy at entry
  - `PizZip` reads only; no `generate()` call
  - `extractTextNodes`, `extractParagraph`, `extractRun` all return new objects
  - Input buffer contents unchanged (verified in tests)

---

## 4. DocxExtractionService Details

### 4.1 Public Interface

```typescript
interface DocxLocation {
  paragraphIndex: number;
  runIndex: number;
  textIndex: number;
  pathString: string;
}

interface ExtractedRun {
  paragraphIndex: number;
  runIndex: number;
  textIndex: number;
  location: DocxLocation;
  text: string;
  formatting: {
    bold: boolean;
    italic: boolean;
    underline: boolean;
    font?: string;
    fontSize?: number;
    color?: string;
  };
}

interface ExtractedParagraph {
  index: number;
  runs: ExtractedRun[];
  style?: string;
  isHeading: boolean;
  rawText: string;
}

interface ExtractedDocument {
  runs: ExtractedRun[];
  paragraphs: ExtractedParagraph[];
  hasTables: boolean;
  hasImages: boolean;
  placeholderCount: number;
}
```

### 4.2 Core Behavior

| Concern | Behavior |
|---|---|
| Parser | `fast-xml-parser` → `normalizeDocx()` post-processing |
| Text extraction | Ordered `w:r` → `w:t` traversal within `w:p` |
| Formatting | Reads `w:rPr`: `bold`, `italic`, `underline`, `rFonts`, `sz` (half-points→points), `color` |
| Style detection | Reads `w:pPr`/`w:pStyle`; marks headings if style name contains `Heading*`, `Title`, or `Subtitle` |
| Tables | Pre-normalization cleanup; detects `w:tbl` in body or paragraph |
| Images | Detects `w:drawing` or `w:pict` |
| Placeholders | Regex `/\{\{([^}]+)\}\}/g` on concatenated full text |
| Immutability | Input `Buffer` cloned upfront; no mutation, no writes |

### 4.3 XML Normalization Strategy

Since `fast-xml-parser` preserves whitespace as `#text` nodes and doesn't normalize single-element arrays, `normalizeDocx()`:

1. Removes whitespace-only `#text` entries
2. Removes `xmlns:*` namespace declarations
3. Recursively normalizes nested objects
4. Ensures repeatable DOCX tags (`w:p`, `w:r`, `w:t`, etc.) are always arrays

This makes downstream traversal deterministic and array-safe.

### 4.4 Truthy Tag Detection

`isTruthyTag()` handles fast-xml-parser's representation of self-closing tags:

| fast-xml-parser value | `isTruthyTag()` result |
|---|---|
| `""` (empty string) | `true` — self-closing `<w:b/>` |
| `{ w:val: "24" }` | handled by parent property parser |
| `undefined` / `null` | `false` — tag absent |
| `"false"` / `"0"` | `false` — explicit falsy values |
| `true` / `false` (boolean) | passthrough |
| any other string | `true` |

---

## 5. Test Results

### 5.1 Unit Tests

Test file: `backend/src/__tests__/docxExtraction.service.test.ts`

| # | Test | Status |
|---|---|---|
| 1 | Extracts paragraphs in order | PASS |
| 2 | Extracts runs within paragraphs | PASS |
| 3 | Detects bold formatting | PASS |
| 4 | Detects italic formatting | PASS |
| 5 | Extracts font and size | PASS |
| 6 | Handles missing rPr | PASS |
| 7 | Detects tables | PASS |
| 8 | Detects images | PASS |
| 9 | Counts placeholders | PASS |
| 10 | Handles empty text nodes | PASS |
| 11 | Constructs structured location objects | PASS |
| 12 | Handles special characters in text | PASS |
| 13 | Detects no placeholders when none exist | PASS |
| 14 | Never modifies the input buffer | PASS |
| 15 | Extracts multiple formatting properties together | PASS |

**Result:** 15/15 tests passing

### 5.2 Mock Strategy

PizZip is mocked using `jest.mock('pizzip')` with inline XML strings. Each test provides its own XML payload and asserts on the transformed output. No external files are loaded.

### 5.3 TypeScript Compilation

Pre-existing errors remain in unrelated files (scripts/, controllers/), but all Milestone-1 files compile cleanly:

- `ResumeTemplate.ts` — OK
- `storageService.ts` — OK
- `docxExtraction.service.ts` — OK
- `docxExtraction.service.test.ts` — OK

---

## 6. Manual Verification

### 6.1 Test Document

`backend/input data/resume templet kushagra conv.docx` (32,833 bytes)

### 6.2 Extraction Results

| Metric | Value |
|---|---|
| Total Paragraphs | 73 |
| Total Runs | 1,692 |
| Has Tables | false |
| Has Images | false |
| Placeholder Count | 0 |
| Runs with Formatting | 1,679 |

### 6.3 Observations

- Document has no Word styles applied (`style="none"` for all paragraphs)
- All 1,679 runs are formatted with **Calibri, 12pt, black** — this is inherited base formatting, which extraction correctly reports
- No `{{...}}` placeholders exist in the resume (as expected for a manual DOCX)
- Location objects correctly increment across paragraph and run boundaries
- Input buffer was verified immutable after extraction

---

## 7. Schema Changes Verified

`ResumeTemplate` model now accepts documents with optional fields:

```typescript
originalFileUrl?: string;
sections?: ITemplateSection[];
formattingMetadata?: { ... };
confidence?: number;
reviewed?: boolean;
reviewNotes?: string;
```

All fields are optional with defaults (`confidence: 0`, `reviewed: false`, `reviewNotes: ''`). Existing queries and documents are unaffected.

---

## 8. Storage Service Changes Verified

`uploadResumeTemplateOriginal()` uploads to Cloudinary with path pattern:

```
academicuniverse/templates/{orgId}/original_{timestamp}_{sanitized_name}.docx
```

Existing `uploadResumeTemplate()` behavior is unchanged. No controller changes were made.

---

## 9. Milestone-1 Success Criteria

| Criterion | Status |
|---|---|
| New schema compiles and passes validation | PASS |
| Storage service supports dual uploads | PASS |
| DocxExtractionService extracts text runs, formatting metadata, tables, images, placeholders | PASS |
| Unit tests pass (15/15) | PASS |
| No existing functionality broken | PASS |
| Proper XML parser used | PASS |
| Structured location objects used | PASS |
| Service is completely immutable | PASS |
| Manual verification with Kushagra DOCX | PASS |

All success criteria are met. Milestone-1 is complete.

---

## 10. Milestone-2 Readiness

Milestone-1 provides all required inputs for Milestone-2:

| Milestone-2 Need | Milestone-1 Output |
|---|---|
| Ordered parse tree | `paragraphs[]` + `runs[]` in document order |
| Precise node locations | `DocxLocation` objects with `pathString` |
| Formatting metadata | `formatting` on every `ExtractedRun` |
| Placeholder count baseline | `placeholderCount` from raw extraction |
| Schema slots | `sections`, `confidence`, `reviewed`, `reviewNotes` |
| Dual upload | `uploadResumeTemplateOriginal()` + existing method |

Milestone-2 will add:
- AI entity detection via Gemini API
- Rule-based heading/section detection
- XML placeholder injection using `DocxLocation`
- Review queue population with confidence scoring

---

## 11. Risks

| Risk | Assessment |
|---|---|
| `fast-xml-parser` behavior changes across versions | Low — version pinned in package.json |
| DOCX XML structures outside OOXML spec | Low — extraction is graceful (no throws on weird nodes) |
| `normalizeDocx` missing some single-element tags | Low — empirically validated against Kushagra DOCX and unit tests |
| Placeholder counting false positives | Very Low — regex requires exact `{{...}}` syntax |

---

## 12. Files Delivered

1. `backend/src/models/ResumeTemplate.ts` (updated)
2. `backend/src/services/storageService.ts` (updated)
3. `backend/src/docxExtraction.service.ts` (new)
4. `backend/src/__tests__/docxExtraction.service.test.ts` (new)
5. `backend/package.json` (updated — `fast-xml-parser` dependency)
6. `MILESTONE-1-IMPLEMENTATION-REPORT.md` (new)

---

*Milestone-1 is verified and ready for code review.*
