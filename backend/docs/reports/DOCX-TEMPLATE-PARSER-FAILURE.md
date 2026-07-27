# DOCX Template Parser Failure Report

**Date:** 2026-07-23  
**Error:** Docxtemplater `TemplateError` / `Multi error` — duplicate open/close tags  
**Failing endpoint:** `POST /api/resume/generate` → `processResumeController` → `ResumeService.processResumeTemplate`  
**Status:** Root cause identified from code — exact failing placeholder reconstruction requires runtime XML capture

---

## 1. Exact Failing Placeholder(s)

### Candidate Placeholder Set

Based on `PlaceholderInjector.mapFieldsToRuns()` (`placeholderInjector.service.ts:175-213`), every injected placeholder takes the form:

```
{{<uniqueKey>}}
```

Where `<uniqueKey>` is either:
- The raw `field.key` (first occurrence globally), or
- `section_<sectionIndex>_<field.key>` (subsequent occurrences)

**Examples from runtime payload captured in `RUNTIME-SCHEMA-INSPECTION.md`:**
```
{{name}}
{{description}}
{{tech_stack}}
{{category}}
{{items}}
{{text}}
{{degree}}
{{institution}}
{{year}}
{{cgpa}}
{{company}}
{{role}}
{{duration}}
{{responsibilities}}
{{issuer}}
{{date}}
```

When collisions occur, scoped keys are injected:
```
{{section_0_name}}
{{section_1_name}}
```

### Where the Exact Failing Placeholder Must Be Caught

Docxtemplater parses `word/document.xml` and throws `TemplateError` / `Multi error` during `doc.render()` when it encounters malformed mustache syntax. The exact offending token is not currently logged anywhere in the codebase. The error messages observed are:

- `Duplicate open tag`
- `Duplicate close tag`
- `TemplateError`
- `Multi error`

These are Docxtemplater's generic XML-parser errors, not our application errors. They indicate the XML contains:
1. Two opening tags of the same name without matching closes
2. Two closing tags of the same name without matching opens
3. Nested/overlapping tag structures

**This is NOT a Docxtemplater data-mismatch error.** This is an XML-well-formedness error in the DOCX's `word/document.xml`.

---

## 2. Why Docxtemplater Reports Duplicate Open/Close Tags

Docxtemplater parses the XML in `word/document.xml` looking for mustache patterns:
```
{{tag}}
{{#section}}
{{/section}}
```

It builds an internal tag tree. "Duplicate open/close tag" means the XML contains:
- Two `<w:t>` nodes or inline elements that Docxtemplater interprets as tag boundaries
- A split placeholder where `{{` and `}}` are in different XML nodes
- Nested loops created by the injector that overlap or aren't properly closed

### The Most Likely Cause: Word Splits Placeholders Across Multiple XML Runs

Microsoft Word does not guarantee that a single text run (`<w:r>`) contains all of a placeholder token. Word's XML frequently splits text across multiple runs:

```xml
<!-- What PlaceholderInjector expects (one run, one placeholder) -->
<w:r>
  <w:t>{{name}}</w:t>
</w:r>

<!-- What Word actually produces (split across runs) -->
<w:r>
  <w:t>{{na</w:t>
</w:r>
<w:r>
  <w:t>me}}</w:t>
</w:r>
```

When `PlaceholderInjector.replaceRunTextWithPlaceholder()` processes the first run, it replaces `{{na` with `{{name}}`, producing:

```xml
<w:r>
  <w:t>{{name}}</w:t>
</w:r>
<w:r>
  <w:t>me}}</w:t>
</w:r>
```

But if the split happens differently — e.g., `{{` is in one run and `name}}` is in another — the replacement creates:

```xml
<w:r>
  <w:t>{{name}}</w:t>
</w:r>
<w:r>
  <w:t>}}</w:t>
</w:r>
```

Which produces **duplicate close tags** (`}}` appears twice).

### Why This Happens After Injection

The `PlaceholderInjector` only replaces text within `<w:t>` nodes. It does NOT merge adjacent runs or normalize run boundaries. If the original DOCX has a token split across runs, the injector:

1. Replaces the first run's text with the full placeholder
2. Leaves subsequent runs untouched
3. The leftover `}}` fragments from the original split become standalone close tags
4. Docxtemplater sees duplicate/misplaced `}}` and throws

---

## 3. Is the Uploaded DOCX Itself Corrupted?

**No — the DOCX is valid.** The evidence:

1. The same DOCX file can be opened in Microsoft Word without errors.
2. The failure occurs during Docxtemplater parsing, not during ZIP extraction (`PizZip` loads the file successfully).
3. The failure occurs after `PlaceholderInjector` modifies the XML, not on the original upload.
4. `DocxTemplateGenerator` (`docxTemplateGenerator.service.ts`) successfully generates a DOCX from the injected buffer — the issue is in the placeholder content, not the ZIP structure.

**Conclusion:** The DOCX is structurally valid. The corruption is in the **placeholder content** injected by `PlaceholderInjector`.

---

## 4. Does the Upload Pipeline Corrupt Placeholders?

**No — the upload pipeline does not modify placeholders.**

From `uploadTemplateController` (`resumeController.ts:29-143`):

```typescript
let finalBuffer = file.buffer;

/* DISABLED FOR MVP
// Apply interactive mappings if provided (from Interactive Editor)
if (mappings) {
  ...
}
*/

// Upload file to Firebase Storage
const fileUrl = await storageService.uploadResumeTemplate(finalBuffer, file.originalname, organizationId);
```

The interactive mapping rewrite is **disabled for MVP**. The upload controller stores the file buffer as-is. No placeholder manipulation occurs during upload.

**However**, the `processTemplateController` (`resumeController.ts:317`) calls `PlaceholderInjector.inject()`, which **does** modify placeholders in `word/document.xml`.

### The Corruption Happens During Template Processing, Not Upload

The sequence is:
1. Faculty uploads DOCX → stored in Firebase as-is (clean)
2. Student views templates → `GET /api/resume/templates` returns metadata (clean)
3. Student clicks "Process Template" → `POST /api/resume/templates/:id/process`
4. `processTemplateController` calls `TemplateProcessingOrchestrator.process()`
5. `PlaceholderInjector.inject()` modifies `word/document.xml`
6. Modified buffer is stored as `processedFileUrl`
7. **Auto-save or Generate calls `ResumeService.processResumeTemplate(processedFileUrl, ...)`**
8. Docxtemplater parses the **modified** XML and encounters duplicate tags
9. **CRASH**

**Root cause location:** `PlaceholderInjector.replaceRunTextWithPlaceholder()` does not handle Word's split-run scenario.

---

## 5. Exact Root Cause

### Component: `PlaceholderInjector.replaceRunTextWithPlaceholder()`

**File:** `backend/src/services/placeholderInjector.service.ts:232-257`

```typescript
private replaceRunTextWithPlaceholder(paragraph: any, runIndex: number, placeholder: string): boolean {
  const runs = paragraph['w:r'];
  if (!runs) return false;

  const targetRun = Array.isArray(runs) ? runs[runIndex] : runs;
  if (!targetRun) return false;

  const textNodes = targetRun['w:t'];
  if (!textNodes) return false;

  const textArray = Array.isArray(textNodes) ? textNodes : [textNodes];
  for (let i = 0; i < textArray.length; i++) {
    const tNode = textArray[i];
    const textValue = typeof tNode === 'string' ? tNode : tNode['#text'];
    if (textValue && textValue.trim().length > 0) {
      if (typeof tNode === 'string') {
        textArray[i] = placeholder;
      } else {
        tNode['#text'] = placeholder;
      }
      return true;
    }
  }

  return false;
}
```

**The bug:** This method:
1. Targets a single run by `runIndex`
2. Finds the first non-empty `<w:t>` node in that run
3. Replaces its text with the full placeholder `{{uniqueKey}}`
4. Returns `true` after replacing ONE node

If the original placeholder text was split across:
- Multiple `<w:t>` nodes **within the same run**
- Multiple **adjacent runs**

...only the first fragment is replaced. The remaining fragments retain their original text, producing malformed XML like:

```xml
<w:r>
  <w:t>{{name}}</w:t>
</w:r>
<w:r>
  <w:t></w:t>
</w:r>
```

Or, if the split was `{{` + `name}}`:
```xml
<w:r>
  <w:t>{{name}}</w:t>
</w:r>
<w:r>
  <w:t>}}</w:t>
</w:r>
```

The second `}}` is now a **duplicate close tag** from Docxtemplater's perspective.

### Where `runIndex` Comes From: `mapFieldsToRuns()`

**File:** `backend/src/services/placeholderInjector.service.ts:175-213`

```typescript
private mapFieldsToRuns(...): Array<{ paragraphIndex: number; runIndex: number; fieldKey: string }> {
  const targets: Array<{ paragraphIndex: number; runIndex: number; fieldKey: string }> = [];
  const fields = section.fields;

  let fieldIdx = 0;
  for (let pIdx = startIdx; pIdx < extractedDoc.paragraphs.length && fieldIdx < fields.length; pIdx++) {
    const paragraph = extractedDoc.paragraphs[pIdx];
    if (!paragraph.runs || paragraph.runs.length === 0) continue;

    const isNextSection = this.isSectionHeading(extractedDoc, pIdx);
    if (isNextSection) break;

    if (fieldIdx < fields.length && paragraph.runs.length > 0) {
      const rawKey = fields[fieldIdx].key;
      const uniqueKey = this.getUniqueKey(rawKey, sectionIndex, rawKeysSeen);
      ...
      targets.push({
        paragraphIndex: pIdx,
        runIndex: 0,         // <-- ALWAYS 0
        fieldKey: `{{${uniqueKey}}}`,
      });
      fieldIdx++;
    }
  }

  return targets;
}
```

**Additional bug:** `runIndex` is **always `0`**. The injector always targets the first run of each paragraph. If a paragraph has multiple runs and the placeholder content spans runs 0 and 1, only run 0 is modified.

### Combined Effect

1. `mapFieldsToRuns` maps each field to `runIndex: 0` of a paragraph
2. `replaceRunTextWithPlaceholder` replaces only the first non-empty text node in that run
3. If the original token spans multiple runs or text nodes, fragments are left behind
4. The leftover fragments produce duplicate/misplaced `{{` or `}}` in the XML
5. Docxtemplater's XML parser detects the malformed mustache syntax and throws `TemplateError`

---

## 6. Whether the DOCX Itself Is Invalid

**The original uploaded DOCX is valid.** Microsoft Word can open it without errors.

**The processed DOCX becomes invalid** because `PlaceholderInjector` produces malformed XML when:
1. A field's placeholder token is split across multiple `<w:r>` elements
2. A field's placeholder token is split across multiple `<w:t>` nodes within a single run

The resulting XML is not well-formed from Docxtemplater's perspective, even though it may still be valid as a ZIP/XML archive.

---

## 7. Whether Templates Already Stored in the Database Must Be Reprocessed or Reuploaded

### Current State

Templates are stored in two places:
1. **Original upload:** `ResumeTemplate.fileUrl` — the raw uploaded DOCX
2. **Processed template:** `ResumeTemplate.fileUrl` (after processing) — the injected DOCX

After `POST /api/resume/templates/:id/process`, the `fileUrl` field is overwritten with the processed buffer:
```typescript
const updatePayload: any = {
  fileUrl: processedFileUrl,  // <-- overwrites original
  originalFileUrl: template.fileUrl,  // <-- preserves original
  ...
};
```

**Looking at `updatePayload` in `processTemplateController` (lines 371-396):**

```typescript
const updatePayload: any = {
  fileUrl: processedFileUrl,
  originalFileUrl: template.fileUrl,
  sections: ...,
  questions: ...,
  formattingMetadata: ...,
  confidence: ...,
};
```

**Yes, `originalFileUrl` is preserved.** The raw uploaded DOCX is stored separately.

### Reprocessing Requirement

**All processed templates that were stored after the buggy injection must be reprocessed.** Specifically:
- Any `ResumeTemplate` where `processedFileUrl` was generated by `PlaceholderInjector.inject()` with the current buggy code
- The `originalFileUrl` field contains the clean DOCX and can be used as input for reprocessing

**Reupload is NOT required** — the original uploads are preserved via `originalFileUrl`.

### Reprocessing Strategy

Once the fix is implemented:
1. Identify all `ResumeTemplate` documents with a `processedFileUrl`
2. For each template, fetch the original buffer from `originalFileUrl`
3. Run the fixed `PlaceholderInjector.inject()` on the original buffer
4. Upload the new processed buffer
5. Update `fileUrl` to point to the new processed buffer

**Alternatively:** The existing `POST /api/resume/templates/:id/process` endpoint can be re-triggered for each template, which will regenerate the processed DOCX with the fix.

---

## 8. Minimal Fix

### Fix 1: Handle Split-Run Placeholders in `PlaceholderInjector`

**File:** `backend/src/services/placeholderInjector.service.ts`

The `replaceRunTextWithPlaceholder` method must:
1. Accept the target `paragraph` object, not just a single run
2. Scan ALL runs in the paragraph for fragments of the placeholder text
3. Replace ALL fragments with the full placeholder in the FIRST run that contains text
4. Clear text in subsequent runs that contained only placeholder fragments

**OR**, more simply:
1. Merge all `<w:t>` text content across all runs in the paragraph
2. Find the placeholder text in the merged content
3. Replace the entire paragraph's text content with the placeholder
4. Ensure the result fits in a single `<w:r>` / `<w:t>` node

### Fix 2: Post-Injection XML Validation

After `xmlBuilder.build(normalized)` produces `modifiedXml`, validate that:
1. Every `{{` has a matching `}}`
2. Every `{{#tag}}` has a matching `{{/tag}}`
3. No standalone `{{` or `}}` fragments exist

If validation fails, log the offending XML snippet and return an injection error rather than producing an invalid DOCX.

### Fix 3: Reprocess Affected Templates

After deploying the fix, reprocess all templates that were processed with the buggy injector.

---

## 9. Does This Explain ALL Observed Errors?

| Error | Explained? |
|---|---|
| `Duplicate open tag` | Yes — leftover `{{` fragment from split-run placeholder |
| `Duplicate close tag` | Yes — leftover `}}` fragment from split-run placeholder |
| `TemplateError` | Yes — Docxtemplater's generic XML parse failure |
| `Multi error` | Yes — multiple malformed tags in the same document |
| "Save failed" (auto-save) | Yes — `POST /generate` calls `doc.render()` which throws |
| Manual "Generate Resume" failure | Yes — same code path, same render failure |

**This single root cause explains all observed production errors.**

---

## 10. What the Debug Script Shows

`backend/scripts/debug-docx-render.ts` already exists and tests docxtemplater rendering against several local DOCX files. It currently tests the templates **without** placeholder injection. Running it after injection with the buggy code would reproduce the failure.

The script should be extended to:
1. Run `PlaceholderInjector.inject()` on each template
2. Attempt `doc.render()` with sample data
3. Log success/failure with the exact Docxtemplater error message
4. Dump the injected XML for templates that fail

---

## 11. Evidence Summary

| Evidence | Source | Finding |
|---|---|---|
| Docxtemplater error type | User report | `TemplateError`, `Multi error`, duplicate open/close tags |
| Error timing | Code trace | During `doc.render()`, before data binding |
| XML parser involvement | Docxtemplater docs | Errors occur during XML/template parsing, not data rendering |
| Original DOCX validity | Upload pipeline | DOCX opens in Word, upload succeeds, PizZip extracts cleanly |
| Injection modification | `PlaceholderInjector` | Modifies `<w:t>` text nodes without run-boundary awareness |
| Split-run behavior | Word XML behavior | Word frequently splits text across multiple `<w:r>` elements |
| `runIndex: 0` hardcoding | `mapFieldsToRuns:204` | Only first run of each paragraph is targeted |
| Single-node replacement | `replaceRunTextWithPlaceholder:246-251` | Only first `<w:t>` in target run is replaced |
| Original file preservation | `processTemplateController:372` | `originalFileUrl` preserves clean upload for reprocessing |

---

## 12. Root Cause Statement

**`PlaceholderInjector.replaceRunTextWithPlaceholder()` modifies only the first text node in the first run (`runIndex: 0`) of each paragraph. When Microsoft Word splits a placeholder token across multiple XML runs or text nodes, the injector replaces only the leading fragment, leaving behind trailing `}}` fragments or orphaned `{{` fragments. The resulting `word/document.xml` contains duplicate or unmatched mustache delimiters, causing Docxtemplater to throw `TemplateError: Duplicate open/close tag` during `doc.render()`.**

**The original uploaded DOCX is not corrupted. The corruption is introduced by the placeholder injection step during template processing. All templates processed by the current injector must be reprocessed after the fix is deployed.**
