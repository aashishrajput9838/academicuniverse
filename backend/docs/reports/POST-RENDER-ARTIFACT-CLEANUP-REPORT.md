# Post-Render Artifact Cleanup — Implementation Report

**Date:** 2026-07-26  
**QA Engineer:** Kilo (Lead QA / Senior Full Stack)  
**Status:** Implemented as temporary workaround  

---

## 1. Problem Statement

Docxtemplater's relaxed-syntax rendering (`allowUnclosedTag` + `allowUnopenedTag`) writes substituted values into the DOCX with literal wrapping braces:

```xml
<w:t>{Academic Universe}</w:t>
```

Mammoth faithfully converts these to HTML, so the preview shows `{Academic Universe}` instead of `Academic Universe`.

**Root cause:** Library behavior/bug, not a project code defect.

**Prior rejected fix:** XML post-processing — too risky, could strip legitimate `{Java}`, `{React}`, etc.

---

## 2. Chosen Approach

A **constrained post-render cleanup** applied only to the generated HTML preview.

- **Input:** Original JSON data + Mammoth-generated HTML
- **Operation:** Replace `{exact_value}` with `exact_value` only for values that exist in the original data
- **Scope:** HTML preview only. Downloaded DOCX is intentionally **not** modified.
- **Fallback:** Deterministic regex replacement when AI is unavailable or not desired

### Why This Is Better Than XML Post-Processing

| Criterion | XML Post-Processing | Post-Render Cleanup |
|-----------|---------------------|---------------------|
| Scope | DOCX XML | HTML preview only |
| Risk to legitimate braces | HIGH — regex on XML | LOW — only exact JSON-value matches |
| Reversibility | LOW — modifies binary DOCX | HIGH — easy to disable |
| Upstream compatibility | LOW — fights the library | HIGH — cleanup can be removed once library is fixed |

---

## 3. Implementation

### 3.1 `backend/src/services/resumeService.ts`

Added `cleanupRendererArtifacts(data, html)`:

```typescript
private deterministicCleanup(html: string, data: Record<string, any>): string {
  let cleaned = html;
  const seen = new Set<string>();
  for (const value of Object.values(data)) {
    if (typeof value === 'string' && value.trim().length > 0) {
      const trimmed = value.trim();
      if (seen.has(trimmed)) continue;
      seen.add(trimmed);
      const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\{${escaped}\\}`, 'g');
      cleaned = cleaned.replace(regex, trimmed);
    }
  }
  return cleaned;
}

private async cleanupRendererArtifacts(data: Record<string, any>, html: string): Promise<string> {
  if (!html) return html;
  const deterministic = this.deterministicCleanup(html, data);
  if (deterministic === html) return html;
  return deterministic;
}
```

### 3.2 Integration Point

Called in `processResumeTemplate()` after Mammoth conversion, before returning:

```typescript
const mammothResult = await mammoth.convertToHtml({ buffer: docxBuffer });
const cleanedHtml = await this.cleanupRendererArtifacts(normalizedData, mammothResult.value);

return {
  docxBuffer,
  htmlPreview: cleanedHtml,
};
```

### 3.3 `docxTemplateFiller.service.ts`

Not yet modified. If that path also serves HTML previews to users, the same cleanup should be applied there.

---

## 4. What This Fixes

| Issue | Status | Notes |
|-------|--------|-------|
| `{undefined}` values | ✅ Fixed (prior change) | `nullGetter: () => ''` + normalization |
| `{Academic Universe}` in preview | ⚠️ Partial | Cleaned from HTML preview; DOCX still contains braces |
| `{OpenAI}`, `{Backend Intern}`, etc. | ⚠️ Partial | Same as above |

---

## 5. What This Does NOT Fix

- **Downloaded DOCX** still contains `{Academic Universe}` in `word/document.xml`. This is intentional.
- **Brace wrapping in DOCX** remains a Docxtemplater library issue.
- **AI-enhanced cleanup** not yet implemented (deterministic fallback only).

---

## 6. Limitations

### 6.1 HTML-Preview Only

The downloaded `.docx` still contains literal braces. Users who download and open the file in Word will still see `{Academic Universe}`.

### 6.2 Exact-Match Dependency

The deterministic cleanup only removes braces around **exact string matches** from the original data. It will miss cases where Docxtemplater transforms the value (e.g., escaping, encoding). AI-based cleanup could handle these cases more robustly.

### 6.3 No DOCX Repair

This does **not** modify the DOCX binary. If the requirement is that the downloaded DOCX must be clean, this approach is insufficient.

---

## 7. Verification

| Check | Result |
|-------|--------|
| Backend tests (non-benchmark) | **576 / 576 PASS** |
| TypeScript compilation | **CLEAN** |
| `deterministicCleanup` removes `{Alice}` from HTML | ✅ YES |
| `deterministicCleanup` preserves `I know {Java}` | ✅ YES (not an exact data match) |
| DOCX download unchanged | ✅ YES (braces remain in binary) |

---

## 8. Recommended Next Steps

1. **Document as known limitation:** The downloaded DOCX contains braces. This is a third-party library behavior.
2. **Monitor Docxtemplater upstream:** File or track an issue for the brace-wrapping behavior.
3. **Evaluate template format migration:** If the limitation is unacceptable, migrate templates to a format Docxtemplater accepts in strict mode (e.g., MS Word with different XML structure, or `html-to-docx`).
4. **Optional AI enhancement:** If AI cleanup is desired, add a `cleanupDocumentText()` method to `aiService.ts` and call it before the deterministic fallback.

---

## 9. Conclusion

A constrained post-render cleanup was implemented for the **HTML preview only**. It removes Docxtemplater's wrapper braces around exact JSON values while preserving legitimate user content.

**This is a temporary workaround, not a root-cause fix.** The downloaded DOCX still contains braces. The proper fix requires either:
- An upstream Docxtemplater fix, or
- A template-format change that avoids the relaxed-syntax path
