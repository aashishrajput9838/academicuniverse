# Minimal Reproducible Test — Docxtemplater Brace Wrapping

**Date:** 2026-07-26  
**QA Engineer:** Kilo (Lead QA / Senior Full Stack)  
**Purpose:** Isolate the root cause of `{Alice}` output from `{{name}}` template  

---

## Test Environment

| Component | Version |
|-----------|---------|
| docxtemplater | 3.68.3 |
| pizzip | 3.2.0 |
| Node.js | 24.17.0 |
| OS | Windows (win32) |

---

## Test Template

A minimal DOCX was created containing only:

```xml
<w:t>{{name}}</w:t>
```

No additional formatting, no `xml:space="preserve"`, no extra runs or paragraphs.

---

## Test Results

### Test 1: BASIC (no relaxed syntax)

```javascript
{
  paragraphLoop: true,
  linebreaks: true
}
```

**Result:** ❌ FAILURE — `Multi error`

```
TemplateError: Duplicate open tag, expected one open tag
  xtag: '{{name'
  offset: 0

TemplateError: Duplicate close tag, expected one close tag
  xtag: 'name}}'
  offset: 6
```

**Conclusion:** Docxtemplater **cannot parse** `{{name}}` in a standard `<w:t>` XML node without relaxed syntax options. The lexer reports duplicate open/close tags.

---

### Test 2: RELAXED (allowUnclosedTag + allowUnopenedTag)

```javascript
{
  paragraphLoop: true,
  linebreaks: true,
  syntax: {
    allowUnclosedTag: true,
    allowUnopenedTag: true
  }
}
```

**Result:** ✅ RENDERS, but with braces

```
Extracted text: "{Alice}"
```

**Conclusion:** With relaxed syntax enabled, Docxtemplater successfully renders the template, but wraps the substituted value in literal curly braces: `{Alice}` instead of `Alice`.

---

### Test 3: RELAXED + nullGetter

```javascript
{
  paragraphLoop: true,
  linebreaks: true,
  syntax: {
    allowUnclosedTag: true,
    allowUnopenedTag: true
  },
  nullGetter: () => ''
}
```

**Result:** ✅ RENDERS, braces still present

```
Extracted text: "{Alice}"
```

**Conclusion:** `nullGetter` does NOT affect brace wrapping. It only controls what renders for missing/null values. The braces are introduced regardless of `nullGetter`.

---

## Definitive Evidence: `generated-debug.docx` XML Inspection

To answer the critical question — *are braces introduced during Docxtemplater rendering or during Mammoth preview conversion?* — we inspected the actual `word/document.xml` inside `generated-debug.docx`.

### Raw text extracted from `generated-debug.docx`

```
Node 0: "{Academic Universe}"
Node 1: "{undefined} | {undefined}"
Node 2: "GitHub: {Java Developer passionate about backend systems.}"
Node 3: "Professional Summary"
Node 4: "{Java Developer passionate about backend systems.}"
Node 5: "Skills"
Node 6: "{Software Engineering}"
Node 7: "Experience"
Node 8: "{OpenAI}"
Node 9: "{Backend Intern}"
Node 10: "{6 Months}"
Node 11: "{Java Developer passionate about backend systems.}"
Node 12: "Education"
Node 13: "{B.Tech CSE}"
Node 14: "{Sharda University}"
Node 15: "{2027}"
Node 16: "{Java Developer passionate about backend systems.}"
Node 17: "Projects"
Node 18: "{Academic Universe}"
Node 19: "{Student ERP platform.}"
Node 20: "{Java Developer passionate about backend systems.}"
Node 21: "Certifications"
Node 22: "Certification: {undefined}"
Node 23: "{undefined}"
Node 24: "{Java Developer passionate about backend systems.}"
Node 25: "{Amazon}"
Node 26: "{2026}"
```

### Conclusion from XML inspection

**The braces ARE present in the DOCX XML itself.** Docxtemplater writes literal `{}` around substituted values into the generated DOCX. Mammoth faithfully converts these to HTML. Therefore:

- **Docxtemplater is the source of brace wrapping.**
- **Mammoth is innocent.**
- **The preview renderer is innocent.**

---

## Key Findings

### Finding 1: Docxtemplater's Strict Parser Rejects Our Template XML

Docxtemplater cannot parse `{{name}}` in a standard `<w:t>` node without relaxed syntax options. The lexer reports "Duplicate open/close tag" errors.

**This does NOT prove the `docx` library creates invalid XML.** It only proves that Docxtemplater's strict lexer rejects this particular XML pattern. The `docx` library produces valid DOCX files that Word can open without issues.

### Finding 2: Relaxed Syntax Wraps Values in Braces

When `allowUnclosedTag: true` + `allowUnopenedTag: true` are enabled, Docxtemplater successfully renders the template but wraps substituted values in literal `{}`.

**Evidence:**
- Test 2 output: `{Alice}`
- Test 3 output: `{Alice}` (braces persist regardless of `nullGetter`)
- `generated-debug.docx` XML confirms braces are written into the DOCX

### Finding 3: This Is a Docxtemplater Behavior Quirk

Docxtemplater's own test suite expects output WITHOUT braces:
```javascript
expect(doc.getFullText()).to.be.equal("Edgar Hipp");
```

Yet in our environment, the same library version produces `{Alice}`. This indicates the behavior is:
- Not a documented feature
- Not expected by the library maintainers
- Likely an interaction between relaxed syntax and the XML pattern in our templates

---

## Root Cause (Proven — With Correct Attribution)

**The brace wrapping is caused by Docxtemplater's rendering pipeline when `allowUnclosedTag` + `allowUnopenedTag` are enabled.**

The `docx` library is **not proven to be the root cause**. It creates valid DOCX XML. Docxtemplater's lexer happens to reject that XML pattern in strict mode, forcing us to enable relaxed syntax, which then introduces brace wrapping as a side effect.

**Chain:**
```
Template XML: <w:t>{{name}}</w:t>
    ↓
Docxtemplater strict lexer: cannot parse → "Duplicate open/close tags"
    ↓
Required workaround: allowUnclosedTag + allowUnopenedTag
    ↓
Docxtemplater renders: {{name}} → {Alice}
    ↓
Braces written into word/document.xml
    ↓
Mammoth converts DOCX → HTML (faithfully preserves braces)
```

### What We Do NOT Know Yet

- Whether the brace wrapping is a **Docxtemplater bug** or **intended behavior** under relaxed syntax
- Whether a different DOCX creation method (MS Word, LibreOffice, `html-to-docx`) would produce XML that Docxtemplater can parse without relaxed syntax
- Whether there exists a Docxtemplater configuration that preserves strict parsing while accepting our XML pattern

---

## Why XML Post-Processing Is Rejected

Even with root cause better understood, XML post-processing remains an unacceptable fix because:

1. **Treats the symptom, not the cause** — removes braces after they're written into the DOCX
2. **Risk of data loss** — legitimate resume content could contain `{Java}`, `{React}`, `{C++}`, etc.
3. **Brittle** — regex on XML is fragile and hard to maintain
4. **Wrong layer** — the fix should be at the DOCX generation layer

---

## Recommended Fixes (Without XML Hacking)

### Option 1: Create Templates With MS Word / LibreOffice

Instead of using the `docx` library's `TextRun` API, create templates using:
- MS Word directly (saved as DOCX)
- LibreOffice Writer
- `html-to-docx` with clean HTML

This may produce XML that Docxtemplater can parse without relaxed syntax options.

**Test:** Create a template in MS Word with `{{name}}`, save as DOCX, and run Docxtemplater with strict syntax. If braces are absent, the `docx` library's XML structure is the contributing factor.

### Option 2: Report to Docxtemplater Maintainers

File a minimal reproducible case showing:
1. Template: `<w:t>{{name}}</w:t>` in a valid DOCX
2. Options: `paragraphLoop: true, linebreaks: true, syntax: { allowUnclosedTag: true, allowUnopenedTag: true }`
3. Expected: `Alice`
4. Actual: `{Alice}`

This appears to be a library bug or undocumented behavior.

### Option 3: Explore Alternative DOCX Libraries

If Docxtemplater cannot be configured to avoid brace wrapping, consider:
- `docxtemplater` with a different module/preset
- Alternative templating engines for DOCX
- Server-side HTML → PDF generation (bypassing DOCX entirely)

---

## Next Steps

1. **Create a DOCX template using MS Word** (not the `docx` library) with the same `{{name}}` placeholder
2. **Test with Docxtemplater strict syntax** — if it renders without braces, the `docx` library's XML is a contributing factor
3. **If MS Word template also needs relaxed syntax**, the issue is in Docxtemplater itself → file bug report
4. **Do NOT implement XML post-processing** until root cause is confirmed and no upstream fix exists

---

## Conclusion

**The brace wrapping is real, reproducible, and originates in Docxtemplater's rendering pipeline.**

**However, we do NOT yet have proof that the `docx` library is the root cause.** The evidence only proves:
1. Our template XML pattern causes Docxtemplater's strict lexer to fail
2. Relaxed syntax is required to make it work
3. Relaxed syntax introduces brace wrapping as a side effect

The `docx` library may be a contributing factor, or it may be completely innocent. We need to test with an MS Word–created template to determine this.

**Recommended action:** Do NOT blame the `docx` library yet. Do NOT implement XML post-processing. Do test with an MS Word template and, if needed, escalate to Docxtemplater maintainers.
