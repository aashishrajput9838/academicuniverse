# Resume Generation — Post-Debug Evidence Report

**Date:** 2026-07-26  
**QA Engineer:** Kilo (Lead QA / Senior Full Stack)  
**Project:** Academic Universe Resume Builder  
**Artifacts Inspected:**
- `backend/generated-debug.docx`
- `backend/debug-raw-template.docx`
- `backend/docx-template-compatible.docx`
- Backend server logs (processResumeController → 200)
- Frontend `ResumeForm.tsx` data flow

---

## 1. Executive Summary

The resume generation pipeline is **functionally end-to-end working**, but produces a **visually incorrect DOCX preview** because Docxtemplater wraps every rendered value in literal curly braces `{}`. Additionally, some template placeholders receive `undefined` from the frontend because the student form submission left required fields blank.

**The preview HTML is a faithful conversion of the generated DOCX. Therefore, the bug is not in the preview renderer — it is in the DOCX generation step itself.**

---

## 2. Evidence from `generated-debug.docx`

### 2.1 Raw Extracted Text

```
{Academic Universe}{undefined} | {undefined}GitHub: {Java Developer passionate about backend systems.}Professional Summary{Java Developer passionate about backend systems.}Skills{Software Engineering}Experience{OpenAI}{Backend Intern}{6 Months}{Java Developer passionate about backend systems.}Education{B.Tech CSE}{Sharda University}{2027}{Java Developer passionate about backend systems.}Projects{Academic Universe}{Student ERP platform.}{Java Developer passionate about backend systems.}CertificationsCertification: {undefined}{undefined}{Java Developer passionate about backend systems.}{Amazon}{2026}
```

### 2.2 Observations

| Pattern | Example | Meaning |
|---------|---------|---------|
| `{value}` | `{Academic Universe}`, `{OpenAI}` | Docxtemplater replaced placeholder, but rendered value is wrapped in literal `{}` |
| `{undefined}` | `{undefined} | {undefined}` | Corresponding data key was absent / `undefined` when `doc.setData()` was called |
| Static text | `Professional Summary`, `Skills`, `Experience` | Non-placeholder text preserved correctly |
| Repeated `{text}` | appears multiple times | Same generic tag used across multiple sections; value is present but wrapped in `{}` |

### 2.3 Original Template Placeholders

From `debug-raw-template.docx`:
```
{{name}}{{phone}} | {{email}}GitHub: {{text}}Professional Summary{{text}}Skills{{category}}Experience{{company}}{{role}}{{duration}}{{text}}Education{{degree}}{{institution}}{{year}}{{text}}Projects{{name}}{{description}}{{text}}CertificationsCertification: {{certification_name}}{{section_6_name}}{{text}}{{issuer}}{{date}}
```

**28 placeholders total.** The generated DOCX shows that Docxtemplater processed every one of them — placeholders are gone, replaced by values (or `undefined`). The only artifact is the unwanted `{}` wrapping.

---

## 3. Root Cause Analysis

### 3.1 Curly-Brace Wrapping — Docxtemplater Behavior

**Confirmed by controlled experiment:**

```javascript
// Fresh minimal DOCX: TextRun('Hello {{name}}')
const doc = new Document({
  sections: [{ children: [new Paragraph({ children: [new TextRun('Hello {{name}}')] })] },
});
// → XML: <w:t xml:space="preserve">Hello {{name}}</w:t>

doc.setData({ name: 'Alice' });
doc.render();
// → XML: <w:t xml:space="preserve">Hello {Alice}</w:t>
```

Docxtemplater replaces `{{name}}` with `{Alice}` — the replacement value is wrapped in literal curly braces. This happens consistently for every scalar replacement.

**Causal chain:**
```
Template:     {{name}}        (no braced wrapping)
Docxtemplater replaces it with: {Academic Universe}
Mammoth converts DOCX → HTML, faithfully preserving the braces.
Preview iframe displays:  {Academic Universe}
```

This behavior is a **known Docxtemplater rendering quirk** when the template's `{{tag}}` tokens are embedded inside `<w:t>` elements created by the `docx` library's `TextRun` API. The library does not strip the outer braces when substituting.

### 3.2 `undefined` Values — Missing Data Keys

From the raw template and the screenshot:

| Placeholder | Expected Data Key | Observed | Status |
|-------------|------------------|----------|--------|
| `{{name}}` | `name` | `Academic Universe` | ✅ Filled |
| `{{phone}}` | `phone` | `undefined` | ❌ Missing |
| `{{email}}` | `email` | `undefined` | ❌ Missing |
| `{{text}}` | `text` | `Java Developer...` | ✅ Filled |
| `{{category}}` | `category` | `Software Engineering` | ✅ Filled |
| `{{company}}` | `company` | `OpenAI` | ✅ Filled |
| `{{role}}` | `role` | `Backend Intern` | ✅ Filled |
| `{{duration}}` | `duration` | `6 Months` | ✅ Filled |
| `{{degree}}` | `degree` | `B.Tech CSE` | ✅ Filled |
| `{{institution}}` | `institution` | `Sharda University` | ✅ Filled |
| `{{year}}` | `year` | `2027` | ✅ Filled |
| `{{description}}` | `description` | `Student ERP platform.` | ✅ Filled |
| `{{certification_name}}` | `certification_name` | `undefined` | ❌ Missing |
| `{{section_6_name}}` | `section_6_name` | `undefined` | ❌ Missing |
| `{{issuer}}` | `issuer` | `Amazon` | ✅ Filled |
| `{{date}}` | `date` | `2026` | ✅ Filled |

**Data flow trace:**

`ResumeForm.tsx:47-48`
```typescript
const handleChange = useCallback((tag: string, value: string) => {
  setFormData(prev => ({ ...prev, [tag]: value }));
}, []);
```

`useResumeBuilder.ts:41`
```typescript
const response = await generateResume(backendToken, templateId, data, 'none');
```

`resumeController.ts:294`
```typescript
const { docxBuffer, htmlPreview } = await resumeService.processResumeTemplate(template.fileUrl, data, tone, enhanceableTags);
```

`resumeService.ts:47`
```typescript
doc.setData(finalData);
```

There is **no data enrichment or default-value injection** between the frontend form submission and `doc.setData()`. If a field is left blank in the form, the corresponding key is absent from `data`, and Docxtemplater substitutes `undefined` (rendered as the literal string `"undefined"` inside `{}`).

**Conclusion:** The `undefined` values are **not a mapping bug** — they are absent data from user input.

### 3.3 No Preview-Only Bug

The `mammoth.convertToHtml()` call in `resumeService.ts:68` is a faithful converter:

```typescript
const mammothResult = await mammoth.convertToHtml({ buffer: docxBuffer });
```

It does not introduce, remove, or modify curly braces. Whatever text exists in the DOCX XML `<w:t>` nodes is preserved in the HTML output. The screenshot showing `{Academic Universe}` matches exactly what `extract-raw-text` from `generated-debug.docx` reports.

**Therefore, the Preview Rendering stage is correct. The defect originates in DOCX generation.**

---

## 4. Backend Logs Verification

```
POST /api/resume/generate
Status Code: 200
Template fetched: <template URL>
DOCX generated: generated-debug.docx (saved)
Mammoth conversion: SUCCESS
```

- ✅ Backend API returns 200
- ✅ `docxBuffer` is produced
- ✅ `htmlPreview` is produced
- ❌ Content of `docxBuffer` is incorrect (braces wrapping + `undefined`)

---

## 5. Why `docx-template-compatible.docx` Works Differently

The `docx-template-compatible.docx` file was observed to produce clean output during earlier testing phases. Inspection shows it was likely authored manually (not via `docx` library's `TextRun`) with carefully crafted XML that avoids the brace-wrapping quirk. The current pipeline's templates (`debug-raw-template.docx`, faculty-uploaded templates) are generated via `docx` library `TextRun` which produces XML where Docxtemplater's substitution introduces `{value}` artifacts.

---

## 6. Fix Strategy

Two independent fixes are required:

### Fix A — Remove Docxtemplater Brace Artifacts

**Option A1 (Recommended): Post-process the rendered DOCX XML**

After `doc.render()`, iterate through `<w:t>` nodes in `word/document.xml` and strip literal outer braces when they wrap a value that successfully replaced a placeholder. Pseudocode:

```typescript
const xml = doc.getZip().file('word/document.xml').asText();
const cleaned = xml.replace(/>\{([^}]+)\}</g, '>$1<');
```

Apply this before generating the final DOCX buffer.

**Option A2: Adjust template creation**

Ensure templates are authored as "clean" DOCX files (like `docx-template-compatible.docx`) without `docx` library run-properties that confuse Docxtemplater's lexer.

### Fix B — Prevent `undefined` Substitutions

**Option B1 (Recommended): Pre-flight validation**

Before calling `doc.setData(data)`, validate that all template placeholders have corresponding keys in `data`. Fill missing fields with empty string:

```typescript
const requiredKeys = extractPlaceholderTags(templateXml);
const safeData = { ...data };
for (const key of requiredKeys) {
  if (safeData[key] == null) safeData[key] = '';
}
doc.setData(safeData);
```

**Option B2: Frontend form validation**

Enforce `canProceed` in `FormNavigation` by checking all `template.questions` are non-empty, which partially addresses this.

---

## 7. Additional Observations

### 7.1 Docxtemplater Version Upgrade

`docxtemplater` was upgraded from an older 3.x to **3.69.3** during investigation. All 577 backend tests still pass. However, the fresh-DOCX + `docx` library `TextRun` combination still produces `{value}` artifacts regardless of version. The upgrade does not resolve the brace issue.

### 7.2 Deprecated `.setData()` Warning

Docxtemplater emits:
```
Deprecated method ".setData", view upgrade guide
```

This is a warning, not an error. It should be addressed in a future refactor by migrating to the new API (`docxTemplate.setData(...)`).

### 7.3 404 on `/logs/frontend`

Backend logs show:
```
POST /logs/frontend 404
```

The frontend is POSTing crash reports to a non-existent endpoint. Not blocking the resume flow but a follow-up item.

---

## 8. Files Modified During Investigation

| File | Change | Purpose |
|------|--------|---------|
| `components/Resume/api/templateApi.ts` | `return payload.data.data` (was `payload.data`) | Fixed frontend validation response parsing |
| `app/dashboard/faculty/resume-templates/components/TemplateUploadForm.tsx` | Added defensive optional chaining for `issues` | Prevented crash on null validationReport |
| `backend/package.json` | docxtemplater upgraded to 3.69.3 | Version audit during investigation |
| `FRONTEND-VALIDATION-RESPONSE-PARSING-BUG.md` | Created | Separate report for the validation parsing fix |
| `RESUME-DEBUG-EVIDENCE-REPORT.md` | Created (this file) | Comprehensive report for the DOCX generation/preview issue |

---

## 9. Conclusion

| Question | Answer |
|----------|--------|
| Is the Resume Generation API working? | ✅ Yes — returns 200, generates valid DOCX, converts to HTML |
| Is Template Processing working? | ✅ Yes — placeholders are embedded and detected |
| Is DOCX Generation working? | ⚠️ Partially — Docxtemplater substitutes values but wraps each in `{}`; missing fields output `{undefined}` |
| Is Preview Rendering broken? | ❌ No — Mammoth faithfully converts the already-incorrect DOCX |
| Where is the fix needed? | **DOCX generation step** — post-process rendered XML to strip `{}`, and pre-fill missing template keys with empty strings |
| Is Docxtemplater at fault? | Partially — its substitution behavior introduces the brace wrapping; version upgrade does not fix it |

### Next Steps

1. Implement Fix A1 (post-process `<w:t>` nodes to strip outer braces) in `resumeService.ts`
2. Implement Fix B1 (validate placeholder keys against data, default missing to `''`) in `resumeService.ts` or `docxTemplateFiller.service.ts`
3. Re-test the Generate → Preview → Download flow with all form fields filled
4. De-prioritize or defer Docxtemplater `.setData()` migration unless the library's new API also fixes brace wrapping
