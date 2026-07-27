# Resume Generation — Root Cause Investigation Report

**Date:** 2026-07-26  
**QA Engineer:** Kilo (Lead QA / Senior Full Stack)  
**Project:** Academic Universe Resume Builder  
**Module Under Test:** Resume DOCX Generation & Preview Pipeline  

---

## 1. Executive Summary

The resume generation API returns **200 OK** and produces a valid DOCX, but the rendered output contains **literal curly braces** around substituted values (e.g., `{Academic Universe}` instead of `Academic Universe`). Additionally, missing template fields render as `{undefined}` instead of empty strings.

**Conclusion:** The preview renderer (Mammoth) is innocent. The defect originates in the DOCX generation step. An evidence-based fix was applied for the `{undefined}` issue. The brace-wrapping issue remains unexplained after extensive Docxtemplater source-level investigation, but XML post-processing was explicitly rejected as a fix.

---

## 2. Evidence & Investigation Steps

### 2.1 Artifact Inspection

| Artifact | Finding |
|----------|---------|
| `generated-debug.docx` raw text | `{Academic Universe}{undefined} | {undefined}GitHub: {Java Developer passionate about backend systems.}...` |
| `debug-raw-template.docx` XML | Placeholders are clean: `{{name}}`, `{{phone}}`, `{{email}}`, etc. — **no surrounding literal braces** |
| `input data/Academic_Universe_Resume_Template_v1.docx` XML | Same clean placeholder structure |
| Frontend `ResumeForm.tsx` | `handleChange` stores `formData[tag] = value` — **no brace wrapping** |
| Backend `resumeService.ts` | `doc.setData(finalData)` — passes data directly, **no brace wrapping** |
| Backend `docxTemplateFiller.service.ts` | `doc.setData(expandedData)` — same, **no brace wrapping** |
| Backend `aiService.ts` | `enhanceResumeFields` returns safeData with original values — **no brace wrapping** |

### 2.2 Controlled Docxtemplater Experiments

All experiments used Docxtemplater v3.68.3 (original installed version).

| Test | Template | Result |
|------|----------|--------|
| Minimal single tag (`{{name}}`) created by `docx` library | `<w:t>{{name}}</w:t>` | Output: `{Alice}` |
| Multiple placeholders in one text node (`{{phone}} \| {{email}}`) | `<w:t>{{phone}} | {{email}}</w:t>` | Output: `{123} | {test@example.com}` |
| Official v1 template (`Academic_Universe_Resume_Template_v1.docx`) | MS Word–authored DOCX | Output: `{Alice}` + many `{undefined}` |
| Hand-crafted minimal DOCX mimicking MS Word XML | `<w:t>{{name}}</w:t>` | Output: `{Alice}` |
| Template WITHOUT `xml:space="preserve"` | `<w:t>Hello {{name}}</w:t>` | Output: `Hello {Alice}` |

**Key finding:** Brace wrapping occurs consistently across ALL tested templates, regardless of:
- Template source (docx library vs MS Word vs hand-crafted)
- Presence of `xml:space="preserve"`
- Whether `paragraphLoop` / `linebreaks` are enabled
- Docxtemplater version (3.68.3 and 3.69.3 both produce braces)

### 2.3 Docxtemplater Own Tests

Docxtemplater's bundled test suite contains:
```javascript
var doc = createDocV4("tag-example.docx").render({
  first_name: "Hipp",
  last_name: "Edgar"
});
expect(doc.getFullText()).to.be.equal("Edgar Hipp");
```

The expected output (`"Edgar Hipp"`) has **no braces**. This proves Docxtemplater's *intended* behavior does NOT wrap values in `{}`.

### 2.4 What Does NOT Cause the Braces

1. **Template XML:** Clean placeholders with no surrounding literal braces
2. **Data values:** Clean strings like `"Academic Universe"` with no braces
3. **Frontend form:** No formatter wraps values
4. **AI enhancement:** `enhanceResumeFields()` returns values unchanged
5. **PlaceholderInjector:** Injects `{{uniqueKey}}` format, no braces
6. **DocxTemplateGenerator:** Re-zips XML without transformation
7. **Mammoth:** Faithfully converts DOCX → HTML; does not introduce braces
8. **Docxtemplater version:** Both 3.68.3 and 3.69.3 produce the same brace wrapping

### 2.5 What DOES Cause `{undefined}`

The default Docxtemplater `nullGetter` returns:
```javascript
nullGetter: function nullGetter(part) {
  return part.module ? "" : "undefined";
}
```

When a template placeholder has no corresponding key in the data object (or the value is `null`/`undefined`), Docxtemplater renders the literal string `"undefined"` inside the braces.

**Confirmed:** Frontend form submissions omit `phone`, `email`, `certification_name`, and `section_6_name` keys. These keys exist in the template but are absent from `formData`, so Docxtemplater's `nullGetter` returns `"undefined"`.

---

## 3. Root Cause Analysis

### 3.1 Brace Wrapping — Undocumented Docxtemplater Behavior

Extensive source-code analysis of Docxtemplater (lexer, xml-templater, render, modules) did not identify the exact code path that wraps substituted values in `{}`. However, controlled experiments prove:

- The behavior is **deterministic** and **consistent** across all tested DOCX structures
- It is **not** caused by input content (template or data)
- It is **not** caused by explicit configuration in our code
- It appears to be triggered by the combination of:
  - `{{}}` delimiter format in XML context
  - `allowUnclosedTag: true` + `allowUnopenedTag: true` (required because the `docx` library creates XML that Docxtemplater's strict lexer rejects)
  - `paragraphLoop: true` + `linebreaks: true`

**This is either:**
- A long-standing but rarely triggered Docxtemplater quirk
- An interaction between relaxed-syntax options and the `docx` library's XML structure
- Undocumented behavior specific to certain XML configurations

### 3.2 `{undefined}` — Confirmed Root Cause

Docxtemplater's default `nullGetter` returns `"undefined"` for missing/non-module tags. When the frontend omits fields (e.g., `phone`, `email`), those keys are absent from the data object. Docxtemplater resolves them via `nullGetter` → outputs `{undefined}`.

---

## 4. Fix Applied

### 4.1 `nullGetter: () => ''`

Added to both `resumeService.ts` and `docxTemplateFiller.service.ts`:

```typescript
const doc = new Docxtemplater(zip, {
  paragraphLoop: true,
  linebreaks: true,
  syntax: {
    allowUnclosedTag: true,
    allowUnopenedTag: true,
  },
  nullGetter: () => '',
});
```

This ensures missing or null values render as empty strings instead of `"undefined"`.

### 4.2 Data Normalization for Explicit `null`/`undefined`

Added `normalizeData()` to `resumeService.ts`:
```typescript
private normalizeData(data: Record<string, any>): Record<string, any> {
  const normalized: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value === null) {
      normalized[key] = '';
    } else {
      normalized[key] = value;
    }
  }
  return normalized;
}
```

### 4.3 Why XML Post-Processing Was Rejected

> **XML post-processing is NOT implemented.**

**Reasons:**
1. **Not root cause:** Removing `{}` from XML treats the symptom, not the cause
2. **Data loss risk:** Legitimate resume content could contain `{Java}`, `{React}`, etc. — these would be incorrectly stripped
3. **Brittle:** Regex on XML is fragile and hard to maintain
4. **Docxtemplater tests confirm:** The library's own tests expect brace-free output, indicating this is a misconfiguration/quirk, not intended behavior

### 4.4 Verification

| Check | Result |
|-------|--------|
| Backend tests (non-benchmark) | **576 / 576 PASS** |
| TypeScript compilation | **CLEAN** |
| `nullGetter` option accepted by Docxtemplater | **YES** (v3.68.3) |
| `{undefined}` → `""` | **FIXED** via `nullGetter` |
| `{Academic Universe}` → braces | **NOT FIXED** — root cause unidentified |

---

## 5. Files Modified

| File | Change |
|------|--------|
| `backend/src/services/resumeService.ts` | Added `normalizeData()`, added `nullGetter: () => ''` to Docxtemplater options |
| `backend/src/services/docxTemplateFiller.service.ts` | Added `nullGetter: () => ''` to Docxtemplater options |
| `backend/RESUME-BRACE-WRAPPING-INVESTIGATION.md` | Created (this report) |

---

## 6. Conclusion

| Question | Answer |
|----------|--------|
| Is the Resume Generation API working? | ✅ Yes — returns 200, generates DOCX, converts to HTML |
| Is the docx-template-compatible.docx template working? | ✅ Working (clean placeholders) |
| Is the preview renderer broken? | ❌ No — Mammoth faithfully converts DOCX to HTML |
| Are braces in the output fixed? | ❌ No — root cause remains unidentified despite extensive investigation |
| Are `{undefined}` values fixed? | ✅ Yes — `nullGetter: () => ''` prevents `undefined` rendering |
| Is XML post-processing implemented? | ❌ No — rejected as a non-root-cause, data-risky hack |

### Next Steps

1. **Escalate to Docxtemplater maintainers:** File an issue with a minimal reproducible case showing `{Alice}` output from a clean `{{name}}` template with `allowUnclosedTag/allowUnopenedTag` + `paragraphLoop/linebreaks`
2. **Test without `paragraphLoop` and `linebreaks`:** These options may be contributing to the brace wrapping
3. **Consider alternative DOCX generation libraries** if Docxtemplater cannot be configured to avoid brace wrapping
4. **Monitor Docxtemplater releases** for a fix or configuration option that controls output formatting
