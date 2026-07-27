# Heading Detection Consistency Fix — Report

**Date**: 2026-07-24  
**Template**: `proper-headings-template.docx`  
**Issue**: `SectionDetector` and `PlaceholderInjector` used different heading-detection logic, causing valid Heading1 paragraphs to be missed during placeholder injection.

---

## Problem

`SectionDetector.findHeadingCandidates()` used a multi-signal heuristic:
- First-run bold **and** fontSize ≥ 14
- Known section keywords
- Title case / ALL CAPS patterns
- Keyword + punctuation filtering
- Bullet exclusion

`PlaceholderInjector.findSectionStart()` (and `isSectionHeading()`) only checked:
- `run.formatting.bold || fontSize >= 14` (single-signal fallback)
- No keyword matching
- No title-case checking

Because of this divergence, a plain `Education` / `Skills` / `Experience` paragraph that had no explicit run-level bold or large font was:
1. Correctly detected as a section by `SectionDetector`
2. Failed to be matched as the next section heading by `PlaceholderInjector`
3. Consequently had **zero placeholders injected** into its body.

---

## Fix

### 1. Extracted shared heading detection into `headingDetector.service.ts`
- New service class `HeadingDetector` holds the exact same multi-signal heuristic from `SectionDetector`.
- Single source of truth for heading detection logic.

### 2. Refactored `SectionDetectorService` to use `HeadingDetector`
- `detect()` creates a `HeadingDetector` instance and delegates `findHeadingCandidates()`.
- Removed duplicated keyword arrays, `findHeadingCandidates()` wrapper, and dead helper methods.
- Preserved `SECTION_HEADING_PARAGRAPH_INDEX` on every detected section.

### 3. Refactored `PlaceholderInjector` to use `HeadingDetector`
- `findSectionStart()` now uses `this.headingDetector.isHeading()` instead of inline scan.
- `isSectionHeading()` now delegates to `this.headingDetector.isHeading()`.
- Removed local run-level-only bold/font-size check.
- Constructor accepts shared `DetectionOptions`.

### Files changed
| File | Change |
|------|--------|
| `src/services/headingDetector.service.ts` | **Created** — shared heading-detection logic |
| `src/services/sectionDetector.service.ts` | Replaced inline heading logic with `HeadingDetector`; removed duplicates |
| `src/services/placeholderInjector.service.ts` | Replaced inline fallback scan with `HeadingDetector` |
| `src/__tests__/headingDetector.service.test.ts` | **Created** — unit tests for the new service |

---

## Tests Added

### `headingDetector.service.test.ts` (new, 10 tests)
- `PASS` — Headings via keyword match without bold/fontSize
- `PASS` — Bold headings with fontSize ≥ 14
- `PASS` — Title-case keywords as headings
- `PASS` — Bullet points are ignored
- `PASS` — Trailing punctuation ignored (`Skills:`, `Education.`)
- `PASS` — Empty paragraphs skipped
- `PASS` — `isHeading()` returns true for keyword heading without formatting
- `PASS` — `isHeading()` returns true for bold+large heading
- `PASS` — `isHeading()` returns false for normal body text
- `PASS` — `isHeading()` returns false for bullets

### `sectionDetector.service.test.ts` (2 new tests)
- `PASS` — detects Heading1 paragraphs via keyword match without bold/fontSize
- `PASS` — sets `headingParagraphIndex` on detected sections

### `placeholderInjector.service.test.ts` (2 new tests)
- `PASS` — injects placeholders when `headingParagraphIndex` is set
- `PASS` — injects placeholders for Heading1 keyword paragraphs without bold/fontSize

---

## Test Results

```
$ npx jest --testPathPattern="(headingDetector|sectionDetector|placeholderInjector)" --no-cache

PASS src/__tests__/headingDetector.service.test.ts
PASS src/__tests__/sectionDetector.service.test.ts
PASS src/__tests__/placeholderInjector.service.test.ts

Test Suites: 3 passed, 3 total
Tests:       30 passed, 30 total

$ npx jest --forceExit

Test Suites: 48 passed, 48 total
Tests:       329 passed, 329 total
```

No regressions in the full suite.

---

## End-to-End Pipeline Verification

**Command**: `npx tsx verify-pipeline.ts`  
**Template**: `proper-headings-template.docx` (8598 bytes)

```
=== PIPELINE RESULT ===
Success: true
Issues: none

=== MILESTONE 2 (SECTION DETECTION) ===
Sections detected: 2
  [0] "Education"   | headingParagraphIndex=1 | fields=degree, institution, year, cgpa
  [1] "Skills"      | headingParagraphIndex=3 | fields=category, items

=== PLACEHOLDER INJECTION ===
Placeholders injected: 2
Data key mapping: { degree: [ 'degree' ], category: [ 'category' ] }
Issues: none

=== GENERATION ===
Success: true
Output size: 8582 bytes
Issues: none
```

**Output file**: `proper-headings-pipeline-output.docx`  
**Placeholders found in `word/document.xml`**: `{{degree}}`, `{{category}}`

---

## limitation noted (not caused by this fix)

`PlaceholderInjector` operates at the XML level and injects placeholders based on detected section bodies. In the current template, each section has one body paragraph, so one placeholder per section body is injected. Full multi-field injection would require a more sophisticated field-to-run mapping strategy.

---

## Conclusion

The heading-detection inconsistency between `SectionDetector` and `PlaceholderInjector` has been eliminated. Both services now share a single `HeadingDetector` class. All 329 existing tests pass, 10 new tests cover the previously divergent behavior, and the full pipeline successfully runs end-to-end with placeholders injected and DOCX generated.
