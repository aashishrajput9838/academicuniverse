# RB-010 — Root Cause Investigation: Ezone Scraper Extraction Failures

**Date:** 2026-07-21  
**Status:** Investigation Complete — No Implementation  
**Scope:** Why extractPageData() returns N/A despite data existing in DOM  
**Constraint:** No code changes. No business logic modifications.

---

## 1. Evidence from Diagnostic Artifacts

### 1.1 Dashboard HTML — Profile Data EXISTS

```html
<li><i class="fa fa-check" aria-hidden="true"></i>  <strong>System ID </strong></li>
<li><strong>Department </strong> <i class="fa fa-check" aria-hidden="true"></i>Computer Science and Engineering </li>
<li><strong>School </strong> <i class="fa fa-check" aria-hidden="true"></i>SUSET </li>
<li><i class="fa fa-check" aria-hidden="true"></i><strong>Program [G]</strong> Bachelor of Technology (Computer Science &amp; Engineering)</li>
<li><i class="fa fa-check" aria-hidden="true"></i><strong>Semester </strong> S7</li>
<li><strong>Programme Status </strong> MATR</li>
```

### 1.2 Attendance HTML — System ID EXISTS

```html
<h3>Enrolled Course List <small>( System ID : 2023329421 WITH Term : 2601 )</small></h3>
<th colspan="5">System ID: 2023329421</th>
```

### 1.3 Diagnostic report.json — All N/A

```json
{
  "studentName": "N/A",
  "systemId": "N/A",
  "department": "N/A",
  "school": "N/A",
  "program": "N/A",
  "semester": "Programme Status MATR",
  "status": "N/A"
}
```

### 1.4 Navigation URLs Discovered

```json
{
  "attendance": "https://student.sharda.ac.in/admin/courses",
  "timetable": "https://student.sharda.ac.in/admin/timetable"
}
```

**No marks URL discovered.**

---

## 2. Root Causes

### 2.1 `findLabelValue` Fails Because of Text Nodes

**Function:** `extractPageData()` → `findLabelValue()`  
**File:** `backend/src/modules/ezone/scrapers/ezone.scraper.ts`

The DOM structure is:
```html
<li><i class="fa fa-check"></i>  <strong>System ID </strong></li>
```

`findLabelValue('System ID')` finds `<strong>System ID </strong>`, then:
1. `target.nextElementSibling` → `null` (text node "2023329421" is NOT an element)
2. `parent.nextElementSibling` → next `<li>` element (Department)
3. Returns "Computer Science and Engineering" instead of the System ID value

**This is why ALL profile fields return N/A or wrong values.**

### 2.2 `findLabelValue` Exact Matching Fails on Variations

| Actual DOM Text | Expected Pattern | Match? |
|-----------------|-----------------|--------|
| `System ID ` (trailing space) | `SYSTEM ID` or `SYSTEM ID:` | Partial — finds element but can't get value |
| `Department ` (trailing space) | `DEPARTMENT` or `DEPARTMENT:` | Partial — finds element but can't get value |
| `School ` (trailing space) | `SCHOOL` or `SCHOOL:` | Partial — finds element but can't get value |
| `Program [G]` (brackets) | `PROGRAM` or `PROGRAM:` | Partial — finds element but can't get value |
| `Semester ` (trailing space) | `SEMESTER` or `SEMESTER:` | Partial — finds element but can't get value |
| `Programme Status ` (no colon) | `STATUS` or `STATUS:` | **WRONG MATCH** — finds "Programme Status" for "Status" query |

### 2.3 `semester` Returns "Programme Status MATR"

**Exact failure chain:**
1. `findLabelValue('Semester')` searches for "SEMESTER" or "SEMESTER:"
2. Finds `<strong>Semester </strong>` in `<li>`
3. `nextElementSibling` = null (text node "S7" is not an element)
4. `parent.nextElementSibling` = next `<li>` containing `<strong>Programme Status </strong> MATR`
5. Returns "Programme Status MATR" instead of "S7"

### 2.4 Marks URL Not Discovered

**Why:** There is NO separate marks page navigation link on the dashboard.

Evidence from dashboard HTML:
- Found: `admin/timetable` (Time Table)
- Found: `admin/courses` (Attendance)
- NOT found: Any link to marks/CA marks/grades/results

The marks data is rendered **directly on the dashboard** in CA Marks tables with headers:
```
Theory Courses | Assignment 1 (Max : 5) | Assessment 1 (Max : 10) | ...
```

**Conclusion:** `/admin/marks` is a guessed URL that does not exist. Marks are on the dashboard.

### 2.5 System ID Extraction Fails on Attendance Page

The attendance page contains:
```html
<th colspan="5">System ID: 2023329421</th>
```

`findLabelValue('System ID')` finds this `<th>` element, but:
- `nextElementSibling` = null (no sibling in `<th>`)
- `parent.nextElementSibling` = next `<tr>` or sibling element
- Returns wrong value or N/A

The actual value "2023329421" is part of the SAME element's text content, not a sibling.

---

## 3. Why Current Selector Strategy Fails

| Strategy | Assumption | Reality |
|----------|-----------|---------|
| `findLabelValue` with exact match | Labels are separate elements followed by sibling value elements | Labels and values are often in the same element or separated by text nodes |
| `nextElementSibling` | Value is in the next ELEMENT sibling | Value is often in a text node, same element, or non-element sibling |
| `parent.nextElementSibling` | Value is in parent's next sibling | Often returns wrong parent's sibling |
| Hardcoded label names | Portal uses consistent label text | Portal uses variations: "System ID ", "Program [G]", "Programme Status" |
| Table headers as `th` or first `tr td` | Headers are always in dedicated header cells | Some tables use `<th>` inside data rows |

---

## 4. Correct DOM Patterns Found

### 4.1 Profile Data Pattern

```html
<li>
  <i class="fa fa-check" aria-hidden="true"></i>
  <strong>System ID </strong> 2023329421
</li>
```

**Value is a TEXT NODE after the `<strong>` label, inside the same `<li>` parent.**

### 4.2 Attendance Table Header Pattern

```html
<h3>Enrolled Course List <small>( System ID : 2023329421 WITH Term : 2601 )</small></h3>
```

**Value is inside the SAME element, in parentheses or after colon.**

### 4.3 CA Marks Table Pattern (Dashboard)

```
Headers: Theory Courses | Assignment 1 (Max : 5) | Assessment 1 (Max : 10) | Assignment 2 (Max : 5) | Assessment 2 (Max : 5) | Total
```

**No dedicated header row — first row contains data.**

### 4.4 Timetable Pattern

```
Headers: HoursWeek | 09:00:00 - 09:50:00 | 09:55:00 - 10:45:00 | ... | Mon, July 20, 2026 | Tue, July 21, 2026 | ...
```

**First column is time slot, remaining columns are days with date headers.**

---

## 5. Marks URL Investigation

### 5.1 Discovered URLs

```json
{
  "attendance": "https://student.sharda.ac.in/admin/courses",
  "timetable": "https://student.sharda.ac.in/admin/timetable"
}
```

### 5.2 Missing Marks URL

The dashboard HTML contains NO anchor (`<a>`) element with text or href matching:
- "marks"
- "grade"
- "result"
- "ca marks"

The only navigation links found on the dashboard are:
- `admin/timetable` — Time Table
- `admin/courses` — Attendance

### 5.3 Conclusion

**There is no separate marks page.** The CA marks data is embedded directly in the dashboard page. The current scraper already tries to extract `caMarks` from the dashboard, but:
1. The table header detection fails because headers are not in `<th>` or first `<tr>`
2. The column indices are wrong for the actual table structure

---

## 6. Required Fixes (For Approval Only)

### 6.1 Fix `findLabelValue` to Handle Text Nodes

```typescript
const findLabelValue = (label: string) => {
    const elements = Array.from(document.querySelectorAll('td, th, span, div, p, strong, b, label'));
    const target = elements.find(el => {
        const text = (el.textContent?.trim() || '').toUpperCase();
        return text === label.toUpperCase() || text === (label.toUpperCase() + ':');
    });
    
    if (!target) return 'N/A';
    
    // Get all text content after the label within the same parent
    const parent = target.parentElement;
    if (!parent) return 'N/A';
    
    const fullText = parent.textContent?.trim() || '';
    const labelText = target.textContent?.trim() || '';
    const valueText = fullText.replace(labelText, '').trim();
    
    if (valueText) return clean(valueText);
    
    // Fallback: try next element sibling
    const next = target.nextElementSibling;
    if (next) return clean(next.textContent || 'N/A');
    
    return 'N/A';
};
```

### 6.2 Remove Hardcoded Marks URL

```typescript
// Remove from pagesToVisit:
{ key: 'marks', dataKey: 'caMarks' },
```

Marks are already extracted from the dashboard.

### 6.3 Fix Table Extraction for Dashboard CA Marks

The CA Marks table on the dashboard does NOT have a header row. The current `extractTable` skips the first row assuming it's a header. Need to detect if the first row contains headers or data.

### 6.4 Add Debug Logging

Add logging at each stage to print actual extracted JSON.

---

## 7. Summary

| Issue | Root Cause | Location |
|-------|-----------|----------|
| All profile fields = N/A | `findLabelValue` can't handle text nodes between label and value | `ezone.scraper.ts:111-127` |
| `semester` = "Programme Status MATR" | `nextElementSibling` skips text nodes, falls through to next parent sibling | `ezone.scraper.ts:120-124` |
| Marks 404 | No separate marks page exists; marks are on dashboard | `ezone.scraper.ts:244-248` |
| System ID not extracted | Value is in same element as label (text node), not sibling element | `ezone.scraper.ts:111-127` |
| `studentName` = N/A | No `.user-name` or similar selector matches actual DOM | `ezone.scraper.ts:138-148` |

**Primary fix needed:** Rewrite `findLabelValue` and `extractTable` to match the actual DOM structure found in captured HTML files.

---

*Investigation complete. No implementation performed.*
