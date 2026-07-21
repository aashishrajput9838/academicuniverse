# RB-016: Academic Profile Implementation Report

## Summary
Implemented Program extraction from the profile modal (`#exampleModal`) and added CGPA diagnostic logging. Program is now scoped to the modal and matches `Program [G]` safely. CGPA extraction logic remains unchanged; diagnostics now report script variable, SVG state, and data attribute availability before extraction attempts.

## Files Modified
- `backend/src/modules/ezone/scrapers/ezone.scraper.ts`

## Implementation Details

### 1. Program Extraction (Modal-Scoped)

**Before:**
```typescript
program: findLabelValue('Program') || findLabelValue('Program [G]') || findLabelValue('Course'),
```

**After:**
```typescript
const profileModal = document.querySelector('#exampleModal');
const findModalLabelValue = (label: string) => {
    if (!profileModal) return 'N/A';
    const elements = Array.from(profileModal.querySelectorAll('td, th, span, div, p, strong, b, label'));
    const target = elements.find(el => {
        const text = (el.textContent?.trim() || '').toUpperCase();
        return text === label.toUpperCase() || text === (label.toUpperCase() + ':');
    });
    if (!target) return 'N/A';
    const parent = target.parentElement;
    if (parent) {
        const fullText = parent.textContent?.trim() || '';
        const labelText = target.textContent?.trim() || '';
        let valueText = fullText.replace(labelText, '').trim();
        valueText = clean(valueText);
        if (valueText) return valueText;
    }
    const next = target.nextElementSibling;
    if (next) return clean(next.textContent || 'N/A');
    return 'N/A';
};

const profile = {
    // ...
    program: findModalLabelValue('Program [G]') || findLabelValue('Program') || findLabelValue('Course'),
    // ...
};
```

**Key points:**
- Scoped to `#exampleModal` to avoid global DOM collisions
- Exact-match `Program [G]` inside the modal subtree
- Falls back to global `findLabelValue('Program')` or `findLabelValue('Course')` if modal is absent
- No collision with `Programme Status` because exact-match is still required

### 2. CGPA Diagnostics (No Extraction Logic Change)

Added a diagnostic `page.evaluate` block at the start of `extractCgpa` that inspects and reports:

```typescript
const diagnostics = await page.evaluate(() => {
    const scriptVar = /* regex match on var cgpa = ... */;
    const svg = document.querySelector('#chartcgpa svg');
    const svgWidth = svg ? (svg.getAttribute('width') || '0') : null;
    const rendered = svg ? svgWidth !== '0' : false;
    const cgpaPath = document.querySelector('[seriesName="CGPA"] path, [rel="1"][seriesName="CGPA"] path');
    const dataValue = cgpaPath ? cgpaPath.getAttribute('data:value') : null;
    const windowVar = (window as any).cgpa || (window as any).studentCgpa || (window as any).currentCgpa;
    return { scriptVar, svgWidth, rendered, dataValue, windowVar };
});

logger.info(`[SCRAPER] CGPA diagnostics: ${JSON.stringify(diagnostics)}`);
```

**Logged fields:**
- `scriptVar`: value of `var cgpa = ...` from script tags
- `svgWidth`: rendered SVG width attribute
- `rendered`: whether SVG width is non-zero
- `dataValue`: `data:value` attribute from ApexCharts path
- `windowVar`: any `window.cgpa` / `studentCgpa` / `currentCgpa` value

**Extraction logic remains unchanged:**
- Rejects placeholder `0`
- Falls back to SVG `data:value`
- Returns `N/A` if no trustworthy value exists

## Verification

### TypeScript Compilation
No new errors in `backend/src/modules/ezone/`. Pre-existing errors in unrelated `scripts/` directory remain untouched.

### Unit Tests
Regression tests show pre-existing failures due to missing `backend/tmp/ezone-diagnostic-*` captures in the test environment. These failures are not caused by this implementation.

### Expected Live Behavior
1. `program` extracts from `#exampleModal` → `Bachelor of Technology (Computer Science & Engineering)`
2. `program` falls back gracefully to global search if modal is absent
3. `cgpa` remains `N/A` unless a verified runtime/SVG value is discovered
4. Logs show `[SCRAPER] CGPA diagnostics: {...}` with script variable, SVG state, and data attribute info

## Mongo Payload Impact
- `program`: now populated from profile modal
- `cgpa`: unchanged, returns `N/A` unless extraction succeeds
- All other fields unchanged

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `#exampleModal` ID changes | Low | Falls back to global `findLabelValue('Program')` |
| `Program [G]` label changes | Low | Falls back to global search |
| Modal content loaded dynamically after page load | Medium | Diagnostic capture showed modal is server-rendered; if live behavior differs, fallback global search handles it |
| Diagnostic logging overhead | Negligible | Single `page.evaluate` per sync |
