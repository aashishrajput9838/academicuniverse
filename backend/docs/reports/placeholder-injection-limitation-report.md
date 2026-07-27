# Placeholder Injection Limitation Report

**Date**: 2026-07-24  
**Template**: `proper-headings-template.docx`  
**Services examined**: `PlaceholderInjector` (`src/services/placeholderInjector.service.ts`)

---

## Symptom

The pipeline detects six logical fields:

| Section | Fields detected |
|---------|-----------------|
| Education | `degree`, `institution`, `year`, `cgpa` |
| Skills | `category`, `items` |

But only **two** placeholders are injected:

```
{{degree}}
{{category}}
```

---

## Runtime Evidence

Debug mode was enabled and the full pipeline was run against `proper-headings-template.docx`.

### Generated debug log

```
[PARA] p[2] run[0] BEFORE:
<w:r><w:t xml:space="preserve">BS Computer Science, MIT, 2020</w:t></w:r>
[INJECT] paragraph run[0] textNode[0]
  BEFORE: "BS Computer Science, MIT, 2020"
  AFTER:  "{{degree}}"
  Full run text: "BS Computer Science, MIT, 2020"
[PARA] p[2] run[0] AFTER:
<w:r><w:t xml:space="preserve">{{degree}}</w:t></w:r>

[PARA] p[4] run[0] BEFORE:
<w:r><w:t xml:space="preserve">JavaScript, TypeScript, React, Node.js</w:t></w:r>
[INJECT] paragraph run[0] textNode[0]
  BEFORE: "JavaScript, TypeScript, React, Node.js"
  AFTER:  "{{category}}"
  Full run text: "JavaScript, TypeScript, React, Node.js"
[PARA] p[4] run[0] AFTER:
<w:r><w:t xml:space="preserve">{{category}}</w:t></w:r>
```

### Summary from debug-report block

```
Original XML length: 3115 chars
Modified XML length: 3128 chars
Total placeholders injected: 2

--- Injected Placeholders ---
  raw: "degree" -> unique: [degree]
  raw: "category" -> unique: [category]
```

The original body text of paragraphs `p[2]` and `p[4]` is **completely overwritten** by the first field of each section. Fields `institution`, `year`, `cgpa`, and `items` are never mapped and never injected.

---

## Root-Cause Method

`PlaceholderInjector.mapFieldsToRuns` (`src/services/placeholderInjector.service.ts:281–325`).

### Exact logic

```typescript
private mapFieldsToRuns(
    extractedDoc: ExtractedDocument,
    section: DetectedSection,
    startIdx: number,
    sectionIndex: number,
    rawKeysSeen: Set<string>,
    dataKeyMapping: Record<string, string[]>,
    xmlParagraphs?: any[]
): Array<{ paragraphIndex: number; runIndex: number; fieldKey: string }> {
    const targets = [];
    const fields = section.fields;
    let fieldIdx = 0;

    for (let pIdx = startIdx;
         pIdx < extractedDoc.paragraphs.length && fieldIdx < fields.length;
         pIdx++) {

        const paragraph = extractedDoc.paragraphs[pIdx];
        if (!paragraph.runs || paragraph.runs.length === 0) continue;

        const isNextSection = this.isSectionHeading(extractedDoc, pIdx);
        if (isNextSection) break;          // ← stops at the next section heading

        const isHeading = this.headingDetector.isHeading(paragraph, extractedDoc);
        if (isHeading) {
            break;                          // ← stops at any other heading
        }

        if (fieldIdx < fields.length && paragraph.runs.length > 0) {
            targets.push({
                paragraphIndex: pIdx,
                runIndex: 0,
                fieldKey: `{{${uniqueKey}}}`,
            });
            fieldIdx++;                    // ← only ONE field per paragraph
        }
    }
    return targets;
}
```

### Why only the first field is emitted

The loop has **two stop conditions** that are triggered after processing just one paragraph:

1. **Next-section heading break** (`isNextSection`)
   - After `Education` (paragraph index 1), `startIdx` = 2.
   - Paragraph 2 is the Education body ("BS Computer Science, MIT, 2020").
   - The method consumes **one field** (`degree`) for paragraph 2, increments `fieldIdx` to `1`.
   - Paragraph 3 is the next section heading (`Skills`).
   - `isNextSection` returns `true`; the loop **breaks immediately**.
   - Remaining fields (`institution`, `year`, `cgpa`) are never visited.

2. **End-of-document termination**
   - After `Skills` (paragraph index 3), `startIdx` = 4.
   - Paragraph 4 is the Skills body ("JavaScript, TypeScript, React, Node.js").
   - The method consumes **one field** (`category`) for paragraph 4, increments `fieldIdx` to `1`.
   - There are no more paragraphs (`pIdx = 5 >= extractedDoc.paragraphs.length`).
   - Loop terminates because `pIdx < extractedDoc.paragraphs.length` is `false`.
   - Remaining field (`items`) is never visited.

In both cases, `mapFieldsToRuns` assumes a **1:1 mapping between content paragraphs and fields**.

---

## Repair Strategy (not yet implemented)

The correct strategy is to move from **one field per paragraph** to **one field per logical value within a section**, independent of paragraph count.

### Core idea

Instead of iterating paragraphs and consuming exactly one field per paragraph:

1. For each field needed by the section, locate a target text-bearing run.
2. If the section body contains fewer runs/paragraphs than fields, **create additional runs/paragraph nodes** inside the current paragraph.
3. When replacing text, preserve the original paragraph structure and extend it with additional runs if needed.
4. If no run remains for a field, append a new `<w:r>` block with a placeholder text node.

### Concrete algorithm for multiple placeholders

**Input section**: `Education` with fields `[degree, institution, year, cgpa]`  
**Body paragraph**: 1 paragraph containing 1 run with text `"BS Computer Science, MIT, 2020"`

**Step 1** — Collect candidates
- Gather all body paragraphs from `startIdx` up to (but not including) the next section heading.
- Flatten every paragraph into its runs and text nodes, preserving paragraph index and run index.

**Step 2** — Over-allocate placeholders across runs
- Assign one placeholder per field, round-robin or linearly across the collected runs.
- If fields > runs, clone the last existing run (`w:r`) and append new runs to the same paragraph.
- If fields > runs and no runs exist, append entirely new paragraph nodes.

**Step 3** — Replace text nodes
- For every (paragraphIndex, runIndex, fieldKey) in the target list, call `replaceRunTextWithPlaceholder`.
- Because each placeholder targets a **distinct run**, no overwrite occurs.
- Original formatting (`w:rPr`) is preserved on every run.

**Step 4** — Preserve original text gracefully
- Instead of replacing original text with a single placeholder, either:
  - Replace the original text with a **comma-separated sequence of placeholders** when all fields fit in one run, **or**
  - Create one additional placeholder run per extra field and append them to the paragraph.

### Example outcome for `proper-headings-template.docx`

**Education** body (p[2]):
```xml
<w:p>
  <w:r><w:rPr>...</w:rPr><w:t>{{degree}}</w:t></w:r>
  <w:r><w:rPr>...</w:rPr><w:t>{{institution}}</w:t></w:r>
  <w:r><w:rPr>...</w:rPr><w:t>{{year}}</w:t></w:r>
  <w:r><w:rPr>...</w:rPr><w:t>{{cgpa}}</w:t></w:r>
</w:p>
```

**Skills** body (p[4]):
```xml
<w:p>
  <w:r><w:rPr>...</w:rPr><w:t>{{category}}</w:t></w:r>
  <w:r><w:rPr>...</w:rPr><w:t>{{items}}</w:t></w:r>
</w:p>
```

### Preserving formatting

- Each new run inherits `w:rPr` from the first existing run in the paragraph (or uses paragraph defaults).
- `replaceRunTextWithPlaceholder` continues to operate at the lowest level (`w:t` text node), so formatting markup is untouched.

### What to keep

- The `headingDetector` refactor stays intact.
- `headingParagraphIndex` field on `DetectedSection` stays intact.
- `findSectionStart` behavior stays intact.

---

## Conclusion

This is **not intentional**. It is a one-field-per-paragraph limitation in `PlaceholderInjector.mapFieldsToRuns` that causes the method to break out of its loop as soon as it hits the next section heading or runs out of paragraphs. The correct fix is to decouple field count from paragraph count and generate one run per field, appending runs when the existing body is too small.
