# Placeholder Replacement Failure — Runtime Investigation Report

Generated: 2026-07-23  
Template investigated: `C:\github\academicuniverse.com\academicuniverse\test.docx`  
DB record: `ResumeTemplate` `_id=6a624617b5268ab08bd6c184`

## 1. Extracted Placeholder Tags from word/document.xml

```text
Count: 0
Tags: []
```

**Runtime evidence:** `test.docx` contains zero `{{...}}` placeholders. The only text node is:

```xml
<w:t>Hello World</w:t>
```

## 2. Form Submission Payload

The `ResumeTemplate` record in MongoDB defines these questions:

```json
[
  {"tag":"text","question":"Content","type":"textarea","aiEnhanceable":true}
]
```

The frontend `ResumeForm` builds `formData` keyed by `question.tag`:

```json
{
  "text": "<user-entered value>"
}
```

**Full simulated payload:**

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "555-1234",
  "degree": "BS Computer Science",
  "institution": "MIT"
}
```

## 3. finalData Passed to doc.render()

In `backend/src/services/resumeService.ts:37-43`:

```typescript
let finalData = data;
if (tone && tone !== 'none' && enhanceableTags && enhanceableTags.length > 0) {
    finalData = await aiService.enhanceResumeFields(data, tone, enhanceableTags);
}
doc.setData(finalData);
```

For `test.docx` with `tone='none'` and no `enhanceableTags`, `finalData === data`:

```json
{
  "text": "<user-entered value>"
}
```

**Keys in finalData:** `["text"]`

## 4. Placeholder Text Inside word/document.xml Before Rendering

After the full processing pipeline (`DocxExtractionService` → `SectionDetectorService` → `PlaceholderInjector` → `DocxTemplateGenerator`):

```text
Count: 0
Tags: []
```

**Full XML (first 500 chars):**

```xml
<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:wpc="..." ...><w:body><w:p w14:paraId="04ED10E3"><w:pPr><w:rPr>...
```

**Root cause of zero placeholders:** `PlaceholderInjector.findSectionStart()` returned `-1` because `test.docx` contains no paragraph with text matching "Content" AND heading formatting (`bold: true` or `fontSize >= 14`). The only paragraph is "Hello World" with no heading formatting.

## 5. Rendered word/document.xml After Rendering

docxtemplater rendered successfully but replaced **zero** placeholders because there were no `{{...}}` tags in the XML.

```xml
<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ...><w:body><w:p><w:r><w:t>Hello World</w:t></w:r></w:p></w:body></w:document>
```

**Unreplaced placeholders:** `[]`  
**Mismatch summary:**

| finalData keys | Placeholders in XML | Mismatch |
|---------------|---------------------|----------|
| `text` | `[]` (none) | finalData key `text` has no matching `{{text}}` |

## Why Zero Placeholders Were Injected

Execution trace through `PlaceholderInjector.inject()`:

1. **`injectSectionPlaceholders()`** called for section `"Content"` with field `text`
2. **`findSectionStart(extractedDoc, section)`** iterates paragraphs looking for text containing `"content"` AND `bold || fontSize >= 14`
3. `test.docx` has only 1 paragraph: `"Hello World"` → `isHeading=false`, `formatting.bold=false`, `fontSize=undefined`
4. Returns `-1`
5. `injectSectionPlaceholders()` returns `0`
6. `dataKeyMapping` remains `undefined`
7. `xmlBuilder.build(normalized)` serializes XML without any injected placeholders
8. Resulting `word/document.xml` still contains `Hello World`

## Comparison With test-minimal.docx

`backend/test-minimal.docx` contains a pre-existing placeholder:

```xml
<w:t>Hello {{name}}</w:t>
```

When processed:
- Original placeholders: `["{{name}}"]`
- Placeholders after injection: `["{{name}}"]` (preserved, none newly injected)
- If `finalData = {name: "John Doe"}`, docxtemplater would replace `{{name}}` correctly
- However, `test-minimal.docx` is an incomplete DOCX package and causes docxtemplater to throw `filetype_not_identified`

## Conclusion

The runtime evidence shows a **complete absence of placeholders** in `test.docx` combined with a **section-detection failure**:

- **finalData key:** `text` (from `ResumeTemplate.questions[0].tag`)
- **Placeholder in XML:** none
- **Rendered output:** still contains `Hello World`

The mismatch is not a key-name collision; it is that the `PlaceholderInjector` injected **0 placeholders** because `findSectionStart()` could not locate a section heading with the required bold/fontSize formatting. Without injected placeholders, docxtemplater has nothing to substitute, so user-entered values never appear in the generated document.
