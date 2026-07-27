# Final Merge Decision — Evidence Report

**Date:** 2026-07-26  
**QA Engineer:** Kilo (Lead QA / Senior Full Stack)  
**Status:** APPROVED for merge as "Known Limitation Mitigation"  

---

## 1. Executive Summary

The resume generation pipeline has been modified to mitigate Docxtemplater's relaxed-syntax brace-wrapping behavior for the HTML preview path. The DOCX download path retains the known limitation.

**Merge status:** APPROVED  
**Issue status:** NOT resolved — documented as third-party library limitation  
**Next step:** Backlog item for upstream Docxtemplater fix or template-format migration

---

## 2. Changes Included

| File | Change | Status |
|------|--------|--------|
| `backend/src/services/resumeService.ts` | Added `normalizeData()`, `nullGetter: () => ''`, `cleanupRendererArtifacts()` | ✅ Merged |
| `backend/src/services/docxTemplateFiller.service.ts` | Added `nullGetter: () => ''` | ✅ Merged |
| `backend/src/controllers/resumeController.ts` | Added `knownLimitations` flag in API response | ✅ Merged |

---

## 3. Response Contract

### 3.1 API Response (processResumeController)

```json
{
  "success": true,
  "data": {
    "htmlPreview": "<cleaned HTML>",
    "docxBase64": "<base64 docx>",
    "studentResumeId": "...",
    "knownLimitations": {
      "docxArtifacts": true
    }
  }
}
```

### 3.2 Frontend Behavior

| Path | Behavior | Basis |
|------|----------|-------|
| HTML preview | Cleaned | `cleanupRendererArtifacts()` in backend |
| PDF download | Cleaned | Uses `htmlPreview` + `html2pdf.js` |
| DOCX download | Known limitation | `knownLimitations.docxArtifacts: true` |

### 3.3 UI Recommendation

Frontend should read `knownLimitations.docxArtifacts` and show a badge/tooltip on the DOCX download button:

> "Download DOCX may contain formatting artifacts"

Do not hardcode this text. Bind it to the API flag.

---

## 4. What Is Fixed

| Issue | Status | Scope |
|-------|--------|-------|
| `{undefined}` in preview | ✅ Fixed | `nullGetter` + normalization |
| `{undefined}` in DOCX | ✅ Fixed | `nullGetter` + normalization |
| `{Academic Universe}` in preview | ✅ Mitigated | Deterministic cleanup |
| `{OpenAI}`, `{Backend Intern}`, etc. in preview | ✅ Mitigated | Deterministic cleanup |
| PDF download | ✅ Clean | Uses cleaned HTML preview |

---

## 5. Known Limitations

| Issue | Status | Rationale |
|-------|--------|-----------|
| `{Academic Universe}` in downloaded DOCX | ⚠️ Known limitation | Docxtemplater relaxed-syntax behavior |
| `{undefined}` in downloaded DOCX | ✅ Fixed | `nullGetter: () => ''` |
| DOCX XML `<w:t>` contains braces | ⚠️ Known limitation | Library-level behavior |
| Exact-match cleanup misses encoded values | ⚠️ Acceptable | Deterministic, safe, reversible |

---

## 6. Verification

| Check | Result |
|-------|--------|
| Backend tests (non-benchmark) | 576/576 PASS |
| TypeScript compilation | CLEAN (no errors in modified files) |
| `nullGetter` prevents `{undefined}` | ✅ Verified |
| Deterministic cleanup removes `{Alice}` from HTML | ✅ Verified |
| Deterministic cleanup preserves `I know {Java}` | ✅ Verified |
| `knownLimitations` flag in API response | ✅ Added |
| DOCX binary unchanged | ✅ Yes (intentional) |

---

## 7. Conditions for Merge

### ✅ Satisfied

- [x] HTML preview cleaned
- [x] PDF download clean (uses HTML preview)
- [x] DOCX limitation documented via `knownLimitations` flag
- [x] Frontend can show warning automatically via API flag
- [x] Team marks issue as "known limitation", not "resolved"
- [x] Tests passing
- [x] TypeScript clean
- [x] Reversible workaround

### ❌ Not Required for This Merge

- [ ] Upstream Docxtemplater fix
- [ ] DOCX binary cleaned
- [ ] AI-based cleanup
- [ ] Template format migration

---

## 8. Recommended Backlog Items

1. **File Docxtemplater upstream issue** with minimal reproducible case (`word-test.docx` + options + expected vs actual)
2. **Collect user analytics**: PDF vs DOCX download ratio to prioritize permanent fix
3. **Evaluate template format migration**: MS Word / LibreOffice / `html-to-docx` to avoid relaxed-syntax path
4. **Remove workaround** once upstream fix is available

---

## 9. Conclusion

**This PR is approved for merge as a temporary mitigation, not a root-cause fix.**

The HTML preview and PDF download paths are clean. The DOCX download path retains a documented third-party limitation. The `knownLimitations` API flag enables the frontend to show user-facing warnings without hardcoding.

**Do not close the bug.** Mark it as "Known Limitation — Mitigated for Preview" and track the upstream fix in the backlog.
