# RB-017: CA Marks Data Quality Investigation Report

## Issue
CA Marks extraction works, but invalid placeholder rows are persisted to MongoDB.

Example of persisted invalid row:
```json
{
  "courseCode": "No record found.",
  "courseName": "No record found.",
  "assignment1": "N/A",
  "assessment1": "N/A",
  "assignment2": "N/A",
  "assessment2": "N/A",
  "total": "N/A"
}
```

## Investigation Scope
- Examined: `backend/src/modules/ezone/scrapers/ezone.scraper.ts`
- Evidence: `backend/backend/tmp/ezone-diagnostic-1784649676713/dashboard.html`
- Scope: CA Marks extraction and sanitization ONLY
- No code modifications were made.

---

## 1. Current Extraction Flow

### 1.1 Parsing (inside `page.evaluate`)
```typescript
const caMarks = extractTable({ headers: ['Course'] }, {
    courseCode: 0,
    courseName: 0,
    assignment1: 1,
    assessment1: 2,
    assignment2: 3,
    assessment2: 4,
    total: 5
});
```

`extractTable` flow:
1. `findTableByHeaders(['Course'])` scans all `<table>` elements for headers containing `Course`
2. For each matched table, iterates `<tr>` rows
3. Skips header row if first row contains `<th>`
4. For each remaining row:
   - Collects all `<td>` cells
   - Skips row if `cells.length === 0`
   - Maps columns by index: `courseCode=0`, `courseName=0`, `assignment1=1`, etc.
   - Calls `clean(cells[idx]?.textContent || 'N/A')` on each mapped column
   - Pushes data object to results

### 1.2 Normalization
Inside `extractTable`, the `clean()` function:
```typescript
const clean = (text: string) => {
    if (!text) return '';
    return text.trim().replace(/\s+/g, ' ');
};
```

This **does not** filter or validate content. It only normalizes whitespace. "No record found." passes through unchanged.

### 1.3 Mongo Payload Mapping
```typescript
caMarks: (rawData.caMarks || []).map((m: any) => ({
    courseCode: this.sanitize(m.courseCode),
    courseName: this.sanitize(m.courseName),
    assignment1: this.sanitize(m.assignment1),
    assignment2: this.sanitize(m.assignment2),
    assessment1: this.sanitize(m.assessment1),
    assessment2: this.sanitize(m.assessment2),
    total: this.sanitize(m.total)
})),
```

`sanitize()` removes HTML tags and blacklisted strings, but **does not** filter placeholder text. The row reaches MongoDB unchanged.

---

## 2. DOM Analysis

### 2.1 Valid CA Marks Row (Theory Courses)
```html
<tr>
    <td>Design Patterns &amp; Microservices [CSCR3216]</td>
    <td>4.0</td>
    <td>9.5</td>
    <td>5.0</td>
    <td>5.0</td>
    <td>23.5</td>
</tr>
```

Extracted as:
```javascript
{
    courseCode: "Design Patterns & Microservices [CSCR3216]",
    courseName: "Design Patterns & Microservices [CSCR3216]",
    assignment1: "4.0",
    assessment1: "9.5",
    assignment2: "5.0",
    assessment2: "5.0",
    total: "23.5"
}
```

Note: `courseCode` and `courseName` both map to column 0, so they receive identical values. This is the current behavior for all CA marks rows.

### 2.2 Invalid Placeholder Row (Confirmed in Capture)
```html
<tr><td colspan="9">No record found.</td></tr>
```

Location: Line 2562 of `dashboard.html` (inside `tabs-2402` tab panel).

How `extractTable` processes this row:
1. `cells = Array.from(row.querySelectorAll('td'))` → returns 1 cell (the colspan="9" cell)
2. `cells.length !== 0` → row is NOT skipped
3. `courseCode = clean(cells[0]?.textContent || 'N/A')` → `"No record found."`
4. `courseName = clean(cells[0]?.textContent || 'N/A')` → `"No record found."` (same cell, index 0)
5. `assignment1 = clean(cells[1]?.textContent || 'N/A')` → `"N/A"` (index 1 does not exist)
6. All remaining fields → `"N/A"`

Result:
```javascript
{
    courseCode: "No record found.",
    courseName: "No record found.",
    assignment1: "N/A",
    assessment1: "N/A",
    assignment2: "N/A",
    assessment2: "N/A",
    total: "N/A"
}
```

This matches the reported bug exactly.

### 2.3 Other Invalid Row Types Found in Capture

| Row Type | DOM Evidence | Risk |
|----------|-------------|------|
| `No record found.` | `<tr><td colspan="9">No record found.</td></tr>` | **High** — confirmed in capture |
| Empty `<td>` cells | `<td>-</td>` used as dash placeholder in practical courses | **Low** — `-` is not a course identifier, but could be confused with valid data if isolated |
| Empty row | Not observed in capture, but possible if all cells are blank | **Low** — would produce all `''` values, visible but harmless |

---

## 3. Root Cause

`extractTable` is a generic table parser with **no row-level validation**. It processes every `<tr>` with at least one `<td>`, regardless of whether the row represents actual data or a portal placeholder/empty-state message.

The specific failure chain:
1. Portal renders `<tr><td colspan="9">No record found.</td></tr>` when a term has no CA marks
2. `extractTable` treats this as a valid data row because it contains one `<td>`
3. Column 0 text `"No record found."` is assigned to both `courseCode` and `courseName`
4. Missing columns 1–5 are filled with `'N/A'`
5. `sanitizedData` mapping does not filter the row
6. Invalid row is persisted to MongoDB

---

## 4. Filtering Strategy

### 4.1 Location: During `sanitizedData` mapping

**Recommended filter point:**
```typescript
caMarks: (rawData.caMarks || [])
    .filter((m: any) => {
        const code = (m.courseCode || '').trim();
        const name = (m.courseName || '').trim();
        return code !== 'No record found.' && name !== 'No record found.';
    })
    .map((m: any) => ({
        courseCode: this.sanitize(m.courseCode),
        courseName: this.sanitize(m.courseName),
        assignment1: this.sanitize(m.assignment1),
        assignment2: this.sanitize(m.assignment2),
        assessment1: this.sanitize(m.assessment1),
        assessment2: this.sanitize(m.assessment2),
        total: this.sanitize(m.total)
    })),
```

### 4.2 Justification

| Location | Pros | Cons |
|----------|------|------|
| **Inside `extractTable`** | Catches invalid rows at source | `extractTable` is generic — CA-specific filtering would couple it to CA domain knowledge; subjects/timetable/holidays use the same function |
| **During `sanitizedData` mapping** | **Chosen** — closest to persistence boundary, CA-specific, does not affect other table extractions, easy to test and extend | Slightly later in pipeline, but invalid rows are caught before MongoDB |
| **After sanitization** | Same effect as during mapping | Less idiomatic — filtering belongs before `map`, not after |

**Conclusion:** Filtering during the `sanitizedData` `caMarks` mapping is the safest point. It:
- Is confined to the CA marks domain
- Does not modify the generic `extractTable` function
- Is easy to extend with additional placeholder patterns (`'N/A'`, `'-'`, empty strings) if needed
- Keeps invalid rows visible in logs (`mergedExtract`) but prevents persistence

### 4.3 Additional Invalid Patterns to Consider

From the captured DOM, these patterns may also appear:
- `'-'` — used in practical courses when a CA component is not applicable. If a row had ONLY `'-'` values, it should be filtered.
- Empty string — if `clean()` returns `''` for all fields.

Recommended filter predicate:
```typescript
const isValidCaMark = (m: any) => {
    const code = (m.courseCode || '').trim();
    const name = (m.courseName || '').trim();
    if (!code && !name) return false;
    if (code === 'No record found.' || name === 'No record found.') return false;
    if (code === '-' || name === '-') return false;
    return true;
};
```

---

## 5. Numeric Marks Normalization

### 5.1 Observed Formats in Capture

| Field | Raw Values |
|-------|-----------|
| assignment1 | `4.0`, `4.50`, `4.00`, `5.00`, `5`, `9.5` |
| assessment1 | `9.5`, `10`, `8.50`, `9.00`, `3.5` |
| assignment2 | `5.0`, `5.00`, `5`, `4.75`, `4.25` |
| assessment2 | `5.0`, `5.00`, `5`, `4.75`, `4.25` |
| total | `23.5`, `24.25`, `17.5`, `23.75`, `55`, `58`, `84` |

### 5.2 Current Storage
Marks are stored as **strings** via `this.sanitize(m.total)`. No numeric conversion occurs.

### 5.3 Normalization Need
**Low risk, optional improvement.**

Since marks are stored as strings, variations like `4`, `4.0`, `4.00` are all valid string representations. No data corruption occurs.

If normalization is desired for consistency:
- Parse with `parseFloat()` to strip trailing zeros
- Re-stringify with `String(value)` or keep as number

Example:
```typescript
const normalizeMark = (value: string): string => {
    const num = parseFloat(value);
    return isNaN(num) ? value : String(num);
};
```

This would convert `4.00` → `4`, `9.50` → `9.5`, `23.5` → `23.5`.

### 5.4 Recommendation
**Defer numeric normalization.** It does not cause data corruption and is not part of the reported bug. If requested later, apply it as a separate enhancement after the filtering fix is verified.

---

## 6. Risk Assessment

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Filter removes legitimate rows with unusual text | Very Low | Filter only matches exact placeholder strings; real course names never equal `"No record found."` |
| Filter pattern changes in portal | Low | Filter uses exact string match; if portal changes text, new pattern can be added |
| Empty rows with `'-'` values incorrectly filtered | Low | `'-'` filter only applies if BOTH `courseCode` and `courseName` are `'-'`, which cannot be a valid course |
| Regression in other table extractions | None | Filter is confined to `caMarks` mapping only |
| Performance impact | Negligible | Single array filter on small dataset |

---

## 7. Implementation Plan

### 7.1 Files to Modify
- `backend/src/modules/ezone/scrapers/ezone.scraper.ts`

### 7.2 Change Summary
Add `.filter()` before `.map()` in the `sanitizedData.caMarks` construction:

```typescript
caMarks: (rawData.caMarks || [])
    .filter((m: any) => {
        const code = (m.courseCode || '').trim();
        const name = (m.courseName || '').trim();
        return code !== 'No record found.' && name !== 'No record found.';
    })
    .map((m: any) => ({
        courseCode: this.sanitize(m.courseCode),
        courseName: this.sanitize(m.courseName),
        assignment1: this.sanitize(m.assignment1),
        assignment2: this.sanitize(m.assignment2),
        assessment1: this.sanitize(m.assessment1),
        assessment2: this.sanitize(m.assessment2),
        total: this.sanitize(m.total)
    })),
```

### 7.3 Diagnostic Log (Optional)
Add count logging to confirm filter effectiveness:
```typescript
const rawCount = rawData.caMarks?.length || 0;
const validCount = filtered.length;
logger.info(`[SCRAPER] caMarks filter: raw=${rawCount}, valid=${validCount}, removed=${rawCount - validCount}`);
```

### 7.4 Verification Checklist
- [ ] Capture dashboard with `No record found.` row present
- [ ] Confirm `extractTable` still returns the placeholder row
- [ ] Confirm `sanitizedData.caMarks` excludes the placeholder row
- [ ] Confirm valid CA marks rows are unaffected
- [ ] Confirm MongoDB no longer receives `{ courseCode: "No record found.", ... }`
