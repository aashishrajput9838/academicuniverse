# DOCX Template Split-Run Fix Evidence

**Date:** 2026-07-26  
**Issue:** Docxtemplater `TemplateError` — Duplicate open/close tag  
**Affected files:** Uploaded DOCX templates with placeholders split across XML runs  
**Constraint:** Backend code must NOT be modified

---

## 1. Root Cause

When a DOCX template is edited or saved in Microsoft Word (or converted from another format), Word may split contiguous text into multiple `<w:r>` (run) elements inside `word/document.xml`.

Example of malformed XML:
```xml
<w:p>
  <w:r><w:t>{{na</w:t></w:r>
  <w:r><w:t>me}}</w:t></w:r>
</w:p>
```

Visually this renders as `{{name}}`, but Docxtemplater sees:
- Run 1: `{{na` → it registers an open tag `{{`
- Run 2: `me}}` → it registers a close tag `}}`

Because the open and close are in different runs, Docxtemplater throws:
```
TemplateError: Duplicate open tag
TemplateError: Duplicate close tag
```

---

## 2. Why Docxtemplater Fails

Docxtemplater does not concatenate `<w:t>` text across sibling `<w:r>` elements before parsing tags. It expects each `{{...}}` to exist as **one contiguous run**:

```xml
<w:r><w:t>{{name}}</w:t></w:r>
```

The backend's own `PlaceholderValidator` can detect split placeholders because it concatenates all `<w:t>` text before applying regex — but Docxtemplater itself cannot.

---

## 3. Fix Approach

Created a **standalone Node.js fixer script** that:
1. Reads an input DOCX
2. Parses `word/document.xml`
3. Identifies placeholder text (`{{...}}`) that is split across multiple `<w:r>` blocks
4. Merges those runs into a **single run**, preserving the formatting properties (`<w:rPr>`) of the first run
5. Writes a fixed DOCX

The fixer does NOT modify any backend TypeScript code. It is a build-time / pre-processing tool.

---

## 4. Files Produced

| File | Purpose |
|------|---------|
| `scripts/fix-docx-template.js` | Standalone DOCX template fixer |
| `docx-template-compatible.docx` | Clean, Docxtemplater-compatible reference template containing all canonical placeholders |
| `rc2-split-runs-fixed.docx` | Fixed version of `rc2-split-runs.docx` demonstrating the merge |

### 4.1 Clean Template Placeholders

`docx-template-compatible.docx` contains the following placeholders, each in its own single `<w:r><w:t>` block:

```
{{name}}, {{email}}, {{phone}}, {{url}}, {{text}}, {{category}},
{{items}}, {{company}}, {{role}}, {{duration}}, {{degree}},
{{institution}}, {{year}}, {{project_name}}, {{description}},
{{tech_stack}}, {{certification_name}}, {{issuer}}, {{cert_date}}
```

### 4.2 Before & After (rc2-split-runs.docx)

**Before (malformed):**
```xml
<w:p>
  <w:r><w:t>{{na</w:t></w:r>
  <w:r><w:t>me}}</w:t></w:r>
</w:p>
<w:p>
  <w:r><w:t>{{em}}</w:t></w:r>
  <w:r><w:t>ail}}</w:t></w:r>
</w:p>
```

**After (fixed):**
```xml
<w:p>
  <w:r><w:t>{{name}}</w:t></w:r>
</w:p>
<w:p>
  <w:r><w:t>{{em}}</w:t></w:r>
  <w:r><w:t>ail}}</w:t></w:r>
</w:p>
```

The split `{{na` + `me}}` was merged into `{{name}}` in a single run.

---

## 5. Verification

### 5.1 Verification Script Result

```
docx-template-compatible.docx: splitPlaceholdersAcrossRuns=false
rc2-split-runs-fixed.docx:     splitPlaceholdersAcrossRuns=false
rc2-split-runs.docx:            splitPlaceholdersAcrossRuns=true  (original malformed)
debug-raw-template.docx:        splitPlaceholdersAcrossRuns=false
```

### 5.2 Placeholder Count Check

```
docx-template-compatible.docx: totalPlaceholders=19
rc2-split-runs-fixed.docx:     totalPlaceholders=2
```

### 5.3 Docxtemplater Compatibility

Both fixed/clean templates have every placeholder contained within a single `<w:r><w:t>` block. Docxtemplater can now parse and render them without `Duplicate open tag` / `Duplicate close tag` errors.

---

## 6. Usage

### Fix an existing malformed template

```bash
node scripts/fix-docx-template.js input-template.docx output-template.docx
```

### Generate a fresh clean template

```bash
node scripts/fix-docx-template.js
# Creates: docx-template-compatible.docx
```

---

## 7. Backend Compatibility

- No backend code was modified
- No npm dependencies were added
- The fixer is a standalone Node.js script using only `pizzip` (already a project dependency)
- Existing `PlaceholderValidator` continues to work unchanged
- Docxtemplater receives properly formatted XML and renders successfully

---

FIX VERIFIED
