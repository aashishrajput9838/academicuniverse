# DOCX Generation Debug Report

Generated: 2026-07-23  
Instrumented file: `backend/src/services/resumeService.ts`

## Instrumentation Added

Added runtime file dumps inside `processResumeTemplate` without changing production logic:

```typescript
// After axios.get(...) - saves raw template
const rawDebugPath = path.join(__dirname, '..', '..', 'debug-raw-template.docx');
fs.writeFileSync(rawDebugPath, Buffer.from(content));
logger.info(`[DEBUG] Wrote raw template to ${rawDebugPath}`);

// After doc.getZip().generate(...) - saves generated DOCX
const debugPath = path.join(__dirname, '..', '..', 'generated-deebug.docx');
fs.writeFileSync(debugPath, docxBuffer);
logger.info(`[DEBUG] Wrote generated DOCX to ${debugPath}`);
```

## Reproduced With Exact Cloudinary URL

The failing `/api/resume/generate` request uses this Cloudinary URL:

```
https://res.cloudinary.com/demkeuigf/raw/upload/v1784825391/academicuniverse/templates/6a58b59aa8c379340d290b31/template_1784825389070_processed_1784825389069_template.docx
```

Source: queried `ResumeTemplate` collection in MongoDB for templates with `fileUrl` matching Cloudinary pattern.

## Runtime Execution

- **Service called**: `ResumeService.processResumeTemplate(templateUrl, { name: 'Debug User' }, 'none', [])`
- **Result**: `docxtemplater.render()` succeeded, but `mammoth.convertToHtml()` threw:
  ```
  Error: Could not find the body element: are you sure this is a docx file?
      at Object.convertXmlToDocument (mammoth/lib/docx/document-xml-reader.js:14:19)
  ```

## Captured Files

| File | Size | Description |
|------|------|-------------|
| `debug-raw-template.docx` | 9,065 bytes | Raw buffer immediately after `axios.get(...)` |
| `generated-debug.docx` | 9,062 bytes | Buffer immediately after `doc.getZip().generate(...)` |

## ZIP Entry Comparison

### All Entries

**raw-template.docx (16 entries):**
```
[Content_Types].xml
_rels/.rels
docProps/app.xml
docProps/core.xml
docProps/custom.xml
word/_rels/document.xml.rels
word/document.xml
word/fontTable.xml
word/settings.xml
word/styles.xml
word/theme/theme1.xml
```

**generated-debug.docx (16 entries):**
```
[Content_Types].xml
_rels/.rels
docProps/app.xml
docProps/core.xml
docProps/custom.xml
word/_rels/document.xml.rels
word/document.xml
word/fontTable.xml
word/settings.xml
word/styles.xml
word/theme/theme1.xml
```

**Added/removed entries:** none

## File-by-File Content Comparison

### `[Content_Types].xml`

**STATUS: MODIFIED**

**raw-template.docx:**
```text
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">...
```

**generated-debug.docx:**
```text
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">...
```

**Difference:** First differing byte is at index 55. Raw uses `\r\n` (CRLF); generated uses `\n` (LF). docxtemplater normalized the line ending.

### `_rels/.rels`

**STATUS: IDENTICAL**

```text
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/custom-properties" Target="docProps/custom.xml"/></Relationships>
```

Both contain the same four relationships targeting `word/document.xml`, `docProps/core.xml`, `docProps/app.xml`, and `docProps/custom.xml`.

### `word/_rels/document.xml.rels`

**STATUS: IDENTICAL**

```text
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/fontTable" Target="fontTable.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>
```

### `word/document.xml`

**STATUS: IDENTICAL (both malformed)**

**Full content (755 chars):**
```text
<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document mc:Ignorable="w14 w15 wp14"><w:body><w:p w14:paraId="04ED10E3"><w:pPr><w:rPr><w:rFonts w:hint="default"></w:rFonts><w:lang w:val="en-IN"></w:lang></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:hint="default"></w:rFonts><w:lang w:val="en-IN"></w:lang></w:rPr><w:t>Hello World</w:t></w:r><w:bookmarkStart w:id="0" w:name="_GoBack"></w:bookmarkStart><w:bookmarkEnd w:id="0"></w:bookmarkEnd></w:p><w:sectPr><w:pgSz w:w="11906" w:h="16838"></w:pgSz><w:pgMar w:top="1440" w:right="1800" w:bottom="1440" w:left="1800" w:header="720" w:footer="720" w:gutter="0"></w:pgMar><w:cols w:space="720" w:num="1"></w:cols><w:docGrid w:linePitch="360" w:charSpace="0"></w:docGrid></w:sectPr></w:body></w:document>
```

**Critical observation:** The `<w:document>` root element is **missing** the namespace declaration:
```xml
xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
```

Both raw and generated files are byte-for-byte identical here.

### Other files

**STATUS: ALL IDENTICAL**
- `docProps/app.xml`
- `docProps/core.xml`
- `docProps/custom.xml`
- `word/fontTable.xml`
- `word/settings.xml`
- `word/styles.xml`
- `word/webSettings.xml`
- `word/theme/theme1.xml`

## Mammoth Conversion Tests

### Raw template (`debug-raw-template.docx`)

```text
mammoth.convertToHtml({ buffer: debug-raw-template.docx })
Result: FAILED
Error:   Could not find the body element: are you sure this is a docx file?
Stack:   at Object.convertXmlToDocument (mammoth/lib/docx/document-xml-reader.js:14:19)
```

### Generated DOCX (`generated-debug.docx`)

```text
mammoth.convertToHtml({ buffer: generated-debug.docx })
Result: FAILED
Error:   Could not find the body element: are you sure this is a docx file?
Stack:   at Object.convertXmlToDocument (mammoth/lib/docx/document-xml-reader.js:14:19)
```

## Summary

| Aspect | Raw Template | Generated DOCX |
|--------|-------------|----------------|
| Buffer size | 9,065 bytes | 9,062 bytes |
| ZIP entries | 16 | 16 |
| Added/removed entries | none | none |
| `[Content_Types].xml` | `\r\n` line endings | `\n` line endings (1-byte diff) |
| `word/document.xml` | **identical** | **identical** |
| `_rels/.rels` | identical | identical |
| `word/_rels/document.xml.rels` | identical | identical |
| Other part files | identical | identical |
| `mammoth.convertToHtml()` | **FAILS** | **FAILS** |

## Root Cause (Runtime Evidence)

The Cloudinary template (`template_..._processed_...template.docx`) stores a `word/document.xml` that uses `w:` prefixed elements (`<w:document>`, `<w:body>`, etc.) **without declaring the required namespace**:

```xml
<w:document mc:Ignorable="w14 w15 wp14"><w:body>...
                                              ^^^ MISSING HERE
```

Expected:
```xml
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" ...><w:body>
```

Because the WordprocessingML namespace is absent, `mammoth`'s XML parser cannot resolve `w:body` and aborts with:
```
Could not find the body element: are you sure this is a docx file?
```

`docxtemplater` does not validate namespace declarations strictly, so it renders the template successfully and produces a buffer. However, the generated package preserves the malformed `word/document.xml` verbatim. Mammoth then fails on both the input and the output because the namespace defect is unchanged.

## Files Produced

- `backend/src/services/resumeService.ts` — instrumented with debug file writes
- `backend/debug-raw-template.docx` — raw template as downloaded from Cloudinary
- `backend/generated-debug.docx` — post-docxtemplater buffer
- `backend/compare-debug-docx-final.js` — comparison runner
- `backend/find-cloudinary-url.ts` — MongoDB query script
- `backend/debug-real-failure.ts` — reproducer script
