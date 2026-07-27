# HOTFIX-001 Root Cause Report

**Date:** 2026-07-22
**Hotfix:** HOTFIX-001 — Template 4 Placeholder Investigation
**Status:** BUG_FIXED

---

## 1. Executive Summary

Template 4 (`resume templet 4 conv.docx`) was the only real DOCX template in the PRG-001 expanded dataset that detected sections but injected 0 placeholders. Investigation confirmed this is a **genuine bug in the placeholder injection pipeline**, not a template-specific limitation.

**Root Cause:** `PlaceholderInjector` only inspected the first run (`runs[0]`) of each paragraph when determining section boundaries. Template 4 stores section heading text across multiple runs where the first run is empty/formatting-only and the actual text with heading formatting appears in subsequent runs.

**Fix:** Updated `findSectionStart()` and `isSectionHeading()` to inspect ALL runs in a paragraph, not just the first run.

**Result:** Template 4 now successfully injects 2 placeholders (one per detected section).

---

## 2. Investigation Trace

### 2.1 Template 4 DOCX Structure

| Observation | Detail |
|---|---|
| File size | 41,394 bytes |
| Total paragraphs | 54 |
| Total runs | 723 |
| Text storage | Characters split across individual `w:t` nodes in separate runs |
| First 16 paragraphs | Empty formatting-only paragraphs (0 runs, 0 text) |
| Section headings | P29 (TECHNICALSKILLS), P50 (EDUCATION) |

### 2.2 Section Heading Run Structure

**P29 — TECHNICALSKILLS:**
| Run Index | Text | Bold | FontSize |
|---|---|---|---|
| 0 | "" | false | undefined |
| 1 | "TEC" | true | 14 |
| 2 | "H" | true | 14 |
| 3 | "N" | true | 14 |
| 4 | "I" | true | 14 |

**P50 — EDUCATION:**
| Run Index | Text | Bold | FontSize |
|---|---|---|---|
| 0 | "" | false | undefined |
| 1 | "E" | true | 14 |
| 2 | "D" | true | 14 |
| 3 | "U" | true | 14 |
| 4 | "C" | true | 14 |

### 2.3 Original Bug Behavior

**`findSectionStart()` (buggy):**
```typescript
const firstRun = p.runs[0];
if (firstRun.formatting.bold || firstRun.formatting.fontSize >= 14) {
  return i + 1;
}
return -1; // ← Template 4 hit this
```

**`isSectionHeading()` (buggy):**
```typescript
const firstRun = paragraph.runs[0];
return firstRun.formatting.bold && (firstRun.formatting.fontSize || 0) >= 14;
```

Both methods only checked `runs[0]`, which for Template 4 is empty/formatting-only.

---

## 3. Comparison with Template 5

### 3.1 Template 5 Structure

| Paragraph | Text | First Run Bold | First Run FontSize |
|---|---|---|---|
| P0 | "(a)Education&Training" | true | 14 |
| P1 | "Body content..." | true | 11 |
| P2 | "(b)Research&ProfessionalExperience" | true | 14 |
| P3 | "Body content..." | true | 11 |

Template 5 stores section headings with formatting on the **first run**, so the original code worked correctly.

### 3.2 Template 4 Structure

| Paragraph | Text | First Run Bold | First Run FontSize | Run 1+ Bold | Run 1+ FontSize |
|---|---|---|---|---|---|
| P29 | "TECHNICALSKILLS" | false | undefined | true | 14 |
| P50 | "EDUCATION" | false | undefined | true | 14 |

Template 4 stores section headings with formatting on **subsequent runs**, exposing the first-run-only bug.

---

## 4. Root Cause Determination

| Question | Answer |
|---|---|
| Is this a code defect? | **YES** |
| Is this template-specific? | **NO** — any template with heading formatting on non-first runs would fail |
| Why wasn't it caught earlier? | Existing tests only used first-run heading formatting |
| Impact | 1 out of 5 real templates (20%) affected |

---

## 5. Conclusion

**Root Cause:** `PlaceholderInjector` made an unsafe assumption that section heading formatting is always on the first run of the paragraph. Template 4 violates this assumption by storing heading text across multiple runs with an empty/formatting-only leading run.

**Classification:** Code defect (not template limitation)

**Fix Required:** Yes — update `findSectionStart()` and `isSectionHeading()` to inspect all runs in a paragraph.
