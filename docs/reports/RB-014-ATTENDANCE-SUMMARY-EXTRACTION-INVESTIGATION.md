# RB-014: Attendance Summary Extraction Investigation Report

## Issue
Dashboard authentication succeeds and subject cards are extracted correctly, but the dashboard attendance summary fields return `N/A`:
- `percentage` = N/A
- `total` = N/A
- `present` = N/A
- `absent` = N/A

## Scope
Investigated only the attendance summary extraction logic inside `EzoneScraper.extractPageData()`.
No changes were made to authentication, session handling, OTP flow, redirects, or navigation.

## Evidence

### Captured Dashboard
**File:** `backend/tmp/ezone-diagnostic-1784660566548/dashboard.html`
**URL:** `https://student.sharda.ac.in/admin/home`
**Title:** `Student Portal | Sharda Academic Portal`

The dashboard contains an authenticated student profile and a "Total Attendance" widget with actual data:
- Total: `7`
- Present: `4`
- Absent: `3`

### Relevant DOM Snippet (lines 2126–2143)
```html
<div class="statess border rounded px-3 py-1">
    <div class="row">
        <div class="col-md-12 text-center border-end">
            <p class="mb-0">Total</p>
            <h5>7</h5>
        </div>
        <div class="col-md-12 text-center border-end">
            <p class="mb-0">Present </p>
            <h5>4</h5>
        </div>
        <div class="col-md-12 text-center">
            <p class="mb-0">Absent</p>
            <h5>3</h5>
        </div>
    </div>
</div>
```

### ApexCharts Legend (lines 2119–2122, BEFORE the stat box in DOM order)
```html
<span class="apexcharts-legend-text" rel="1" i="0" data:default-text="Absent" ...>Absent</span>
...
<span class="apexcharts-legend-text" rel="2" i="1" data:default-text="Present" ...>Present</span>
```

## Root Cause Analysis

### File & Function
`backend/src/modules/ezone/scrapers/ezone.scraper.ts`
`private async extractPageData(page: Page): Promise<any>` → inner `findLabelValue(label: string)`

### How `findLabelValue` works
1. Searches all `td, th, span, div, p, strong, b, label` elements for an **exact** text match against the label.
2. **Strategy 1:** Removes the label text from the parent element's text and returns the remainder.
3. **Strategy 2 (fallback):** Returns the matched element's `nextElementSibling` text.
4. If neither strategy yields a value, returns `'N/A'`.

### Field-by-Field Breakdown

| Field | Searched Labels | Match Result | Why It Returns N/A |
|---|---|---|---|
| `percentage` | `Attendance %`, `Attendance` | **No match** | The dashboard does not contain any element whose exact text is `Attendance %` or `Attendance`. The heading is `Total Attendance` (`<h4>`, not in selector list) and the nav link is `Attendance` (`<a>`, not in selector list). |
| `total` | `Total Classes`, `Total` | `Total` matches `<p class="mb-0">Total</p>` | Based on DOM order, this is the first exact match. Parent text minus label yields `7`, so this field **should** return `7`. If it is observed as `N/A` in production, the page structure or timing differs from the captured HTML. |
| `present` | `Present Classes`, `Present` | `Present` matches ApexCharts legend `<span>Present</span>` **first** | The chart legend span appears before the stat box `<p>Present </p>` in DOM order. The legend span's parent text minus label is empty, and its `nextElementSibling` is `null`. Strategy 2 returns `'N/A'`. |
| `absent` | `Absent Classes`, `Absent` | `Absent` matches ApexCharts legend `<span>Absent</span>` **first** | Same reason as `Present`. The legend span's parent text minus label is empty, and there is no meaningful next sibling. Strategy 2 returns `'N/A'`. |

### Primary Root Cause
**Ambiguous short labels (`Present`, `Absent`) match non-data chart elements before the actual stat box.** The `findLabelValue` function uses a simple first-match strategy across the entire DOM. Because the ApexCharts pie chart legend contains `span` elements with exact text `Present` and `Absent`, and these appear earlier in the DOM than the stat box `<p>` elements, the scraper extracts from the wrong context and resolves to `N/A`.

### Secondary Root Cause
**`Attendance %` label does not exist on the dashboard.** The dashboard only exposes aggregate counts (`Total`, `Present`, `Absent`), not a pre-computed percentage. The current code assumes a percentage label is present.

## Supporting Log Evidence
The latest diagnostic report (`report.json`) confirms:
- `navigationUrls` are populated (attendance, timetable, subjects discovered).
- `attendance.html` contains per-course `.subjectcard` elements with `aria-valuenow`, confirming the attendance page is parsed correctly.
- `dashboard.html` contains the profile modal with real student data (`Name`, `System ID`, `Department`, `School`, `Program`, `Semester`, `Programme Status`).
- However, `dashboardExtract.attendance` in the scraper log returns `N/A` for all four fields because the label lookup fails at the DOM level described above.

## Conclusion
The attendance summary extraction failure is **not** an authentication or timing issue. It is a **selector collision** caused by:
1. `Present`/`Absent` labels matching ApexCharts chart-legend spans before the stat box.
2. `Attendance %` label being absent from the dashboard markup entirely.

Any fix must make the attendance summary extraction context-aware (e.g., scope the search to the `.statess` widget or use a more specific selector path) and compute `percentage` from the extracted counts rather than relying on a non-existent DOM label.
