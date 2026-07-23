# Original vs Processed DOCX Namespace Verification Report

Generated: 2026-07-23  
Original file: `C:\github\academicuniverse.com\academicuniverse\test.docx`  
Processed file: `https://res.cloudinary.com/demkeuigf/raw/upload/v1784825391/academicuniverse/templates/6a58b59aa8c379340d290b31/template_1784825389070_processed_1784825389069_template.docx`

## Original test.docx — word/document.xml Root Element

```xml
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"
            xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
            ...
            xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"
            ...>
```

**Contains `xmlns:w`:** **YES**

## Processed Cloudinary Template — word/document.xml Root Element

```xml
<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document mc:Ignorable="w14 w15 wp14"><w:body>...
```

**Contains `xmlns:w`:** **NO**

## Runtime Evidence: Namespace Removal Code

File: `backend/src/services/placeholderInjector.service.ts`  
Method: `normalizeDocx()` (lines 369–403)

```typescript
private normalizeDocx(node: any): any {
  if (!node || typeof node !== 'object') return node;

  if (node['#text'] && typeof node['#text'] === 'string' && node['#text'].trim() === '') {
    delete node['#text'];
  }

  for (const key of Object.keys(node)) {
    if (key.startsWith('xmlns')) {
      delete node[key];   // <--- LINE 378: STRIPS xmlns:w AND ALL OTHER xmlns DECLARATIONS
    }
  }

  for (const key of Object.keys(node)) {
    if (key === '#text') continue;
    const value = node[key];
    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        value[i] = this.normalizeDocx(value[i]);
      }
    } else if (value && typeof value === 'object') {
      node[key] = this.normalizeDocx(value);
    }
  }

  const arrayKeys = ['w:p', 'w:r', 'w:t', 'w:tbl', 'w:tr', 'w:tc', 'w:pPr', 'w:rPr', 'w:drawing'];
  for (const key of arrayKeys) {
    if (node[key] && !Array.isArray(node[key])) {
      node[key] = [node[key]];
    }
  }

  return node;
}
```

## Execution Path That Triggers the Bug

1. `TemplateProcessingOrchestrator.process()` (`templateProcessingOrchestrator.service.ts:39`)
2. Calls `PlaceholderInjector.inject(originalBuffer, extractedDoc, sections)` (`templateProcessingOrchestrator.service.ts:50`)
3. `inject()` parses `word/document.xml` with `fast-xml-parser` (`placeholderInjector.service.ts:76`)
4. Calls `normalizeDocx(parsed)` (`placeholderInjector.service.ts:86`)
5. `normalizeDocx()` iterates all keys and deletes any starting with `xmlns` (`placeholderInjector.service.ts:377-379`)
6. `xmlBuilder.build(normalized)` serializes the XML without namespace declarations (`placeholderInjector.service.ts:99`)
7. Result is written back to `word/document.xml` in a new zip (`placeholderInjector.service.ts:169-176`)
8. `DocxTemplateGenerator.generate()` re-serializes that zip (`docxTemplateGenerator.service.ts:28`)
9. The processed buffer is uploaded to Cloudinary as `processed_<timestamp>_template.docx` (`resumeController.ts:385`)

## Reproduction Script Output

```
=== ORIGINAL word/document.xml (first 300 chars) ===
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas" ...

=== ORIGINAL has xmlns:w? ===
true

=== REBUILT word/document.xml (first 300 chars) ===
<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document mc:Ignorable="w14 w15 wp14"><w:body>...

=== REBUILT has xmlns:w? ===
false

=== DIFF ===
Original length: 2484
Rebuilt length: 755
Difference: -1729 bytes

VERIFIED: normalizeDocx() removed xmlns:w from the rebuilt XML.
```

## Conclusion

The **original** `test.docx` is valid and **does** declare `xmlns:w`.  
The **processed** Cloudinary template is missing `xmlns:w` because `PlaceholderInjector.normalizeDocx()` explicitly strips all `xmlns*` attributes during XML round-tripping through `fast-xml-parser`.

The exact offending code is:

**File:** `backend/src/services/placeholderInjector.service.ts`  
**Lines:** 376–380  
```typescript
for (const key of Object.keys(node)) {
  if (key.startsWith('xmlns')) {
    delete node[key];
  }
}
```

This removal is unconditional and affects the root `<w:document>` element as well as any nested elements that might carry namespace declarations.
