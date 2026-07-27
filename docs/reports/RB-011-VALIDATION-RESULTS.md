# RB-011 Validation Results — Missing Fields Investigation

**Date:** 2026-07-21  
**Status:** Investigation Complete — No Scraper Changes  
**Scope:** Determine why semester, CGPA, attendance percentages, and attendance breakdown are still missing  
**Constraint:** Do not modify the scraper yet.

---

## 1. Confirmed Working Fields

| Field | Extracted Value | Source |
|-------|----------------|--------|
| `studentName` | `Aashish Rajput` | Dashboard profile modal `<strong>Name</strong>` |
| `systemId` | `2023329421` | Dashboard profile modal `<strong>System ID </strong>` |
| `school` | `SUSET` | Dashboard profile modal `<strong>School </strong>` |
| `status` | `MATR` | Dashboard profile modal `<strong>Programme Status </strong>` |
| `department` | `Computer Science and Engineering` | Dashboard profile modal `<strong>Department </strong>` |
| `program` | `Bachelor of Technology (Computer Science & Engineering)` | Dashboard profile modal `<strong>Program [G]</strong>` |

---

## 2. Missing Fields Analysis

### 2.1 semester

**DOM node (dashboard.html line 2233):**
```html
<li><i class="fa fa-check" aria-hidden="true"></i><strong>Semester </strong> S7</li>
```

**What `findLabelValue('Semester')` returns:**
- Target: `<strong>Semester </strong>` (textContent = "Semester")
- Parent `<li>` textContent = "Semester S7"
- Remove label "Semester" → "S7"
- Clean → "S7"
- **Result: `rawData.profile.semester` = `"S7"`**

**Where it is lost:**
In `extractData()` post-extraction sanitization (`ezone.scraper.ts:302-343`):

```ts
const sanitizedData = {
    studentName: this.sanitize(rawData.profile.studentName),
    systemId: this.sanitize(rawData.profile.systemId),
    program: this.sanitize(rawData.profile.program),
    school: this.sanitize(rawData.profile.school),
    status: this.sanitize(rawData.profile.status),
    // ⚠️ NO semester mapping here!
};
```

**Root cause:** `semester` is correctly extracted by `findLabelValue` but is **dropped in the `sanitizedData` object**. It is never passed to MongoDB.

---

### 2.2 attendance percentages / breakdown (present/absent/total)

**Dashboard attendance widget:**
- Rendered as ApexCharts pie chart with SVG `data:value` attributes
- Example: `<path ... data:value="42.86" seriesName="Absent" ...>` and `<path ... data:value="57.14" seriesName="Present" ...>`
- These values are in SVG attributes, NOT in `textContent`

**Attendance page (`admin/courses`):**
- Card-based layout with progress bars
- Example:
  ```html
  <li class="progress alert alert-success attendence_li" title="Attendance %">
    <div class="progress-bar ..." style="width: 100%;" aria-valuenow="100">
      100 %
    </div>
  </li>
  ```
- Shows per-course attendance percentage ONLY
- NO "Total Classes", "Present Classes", "Absent Classes" labels exist anywhere in captured HTML

**What `findLabelValue` returns for attendance fields:**
- `findLabelValue('Attendance %')` → `'N/A'`
- `findLabelValue('Total Classes')` → `'N/A'`
- `findLabelValue('Present Classes')` → `'N/A'`
- `findLabelValue('Absent Classes')` → `'N/A'`

**Post-extraction sanitization:**
```ts
attendancePercentage: parseFloat("N/A".replace(/[^0-9.]/g, '')) || 0,  // = 0
totalClasses: parseInt("N/A".replace(/[^0-9]/g, '')) || 0,          // = 0
presentClasses: parseInt("N/A".replace(/[^0-9]/g, '')) || 0,        // = 0
absentClasses: parseInt("N/A".replace(/[^0-9]/g, '')) || 0,        // = 0
```

**Root cause:** The portal does **not** expose aggregate attendance totals as labeled text. Attendance data is rendered in card/progress-bar UI components and SVG charts. The values exist visually but are not extractable via `findLabelValue` (text-based lookup).

---

### 2.3 CGPA

**Dashboard HTML:**
```html
<li class="nav-item"><a class="nav-link active" id="home-tab" data-toggle="tab" href="#home" role="tab">CGPA</a></li>
...
<div id="chartcgpa" style="min-height: 275px;">
...
<script>
var cgpa = 0; // Your CGPA value
var maxCgpa = 10;
var percentage = (cgpa / maxCgpa) * 100;
...
series: [percentage],
...
return cgpa.toFixed(2);
</script>
```

**What `findLabelValue('CGPA')` returns:**
- No element with textContent "CGPA" or "CGPA:" exists as a label.
- The CGPA tab exists but the value `cgpa = 0` is in a `<script>` block, not in DOM text.
- **Result: `'N/A'`**

**Root cause:** CGPA is rendered via JavaScript/ApexCharts. The actual value is in a script variable (`var cgpa = 0`), not in DOM `textContent`. It is not extractable without executing JavaScript.

---

## 3. Data Flow Trace

```
extractPageData(page)
  ├── profile.semester = "S7" ✅
  │
  ├── attendance.percentage = "N/A" ❌ (no labeled field in DOM)
  │   attendance.total = "N/A" ❌
  │   attendance.present = "N/A" ❌
  │   attendance.absent = "N/A" ❌
  │
  └── NO cgpa field ❌

extractData() sanitization
  ├── rawData.profile.semester = "S7" ✅
  │   ↓
  │   sanitizedData.semester = ??? ❌ NOT MAPPED
  │
  ├── rawData.attendance.percentage = "N/A" ❌
  │   → sanitizedData.attendancePercentage = 0
  │
  ├── rawData.attendance.total = "N/A" ❌
  │   → sanitizedData.totalClasses = 0
  │
  ├── rawData.attendance.present = "N/A" ❌
  │   → sanitizedData.presentClasses = 0
  │
  └── rawData.attendance.absent = "N/A" ❌
      → sanitizedData.absentClasses = 0

upsertProfile(userId, organizationId, sanitizedData)
  └── MongoDB document missing: semester, attendance breakdown, CGPA
```

---

## 4. Exact Where Each Field is Lost

| Field | Extracted Correctly? | Lost Where | Exact Location |
|-------|----------------------|------------|----------------|
| `semester` | ✅ Yes (`"S7"`) | Post-extraction sanitization drops it | `ezone.scraper.ts:302-307` — `sanitizedData` object has no `semester` key |
| `attendancePercentage` | ❌ No (`"N/A"`) | Not in DOM as labeled text | `ezone.scraper.ts:160-165` — `findLabelValue` returns N/A |
| `totalClasses` | ❌ No (`"N/A"`) | Not in DOM as labeled text | Same as above |
| `presentClasses` | ❌ No (`"N/A"`) | Not in DOM as labeled text | Same as above |
| `absentClasses` | ❌ No (`"N/A"`) | Not in DOM as labeled text | Same as above |
| `cgpa` | ❌ Not extracted | Not implemented + rendered in JS | `ezone.scraper.ts:151-158` — no `cgpa` field in `profile` |

---

## 5. Evidence from Logs

The existing debug logs will show:

1. `dashboardExtract` → `profile.semester` = `"S7"` (if RB-011 parent-text strategy is active)
2. `dashboardExtract attendance` → `{ percentage: "N/A", total: "N/A", present: "N/A", absent: "N/A" }`
3. `attendanceExtract` → same N/A values (attendance page also has no labeled totals)
4. `mergedExtract` → same values merged
5. `mongoPayload` → `semester` is ABSENT from JSON; attendance fields are all `0`

---

## 6. Recommendations (For Approval)

### 6.1 semester
**Fix:** Add `semester` to `sanitizedData` in `extractData()`:
```ts
semester: this.sanitize(rawData.profile.semester),
```
**Risk:** None. Field already exists in schema.

### 6.2 attendance percentages / breakdown
**Option A (preferred):** Accept that the portal does not expose aggregate totals. Store per-course attendance percentages from the attendance page cards instead.
- Parse `<li class="progress ..." title="Attendance %">` elements
- Extract course name + percentage from each card
- Store as `subjects[].attendancePercentage` (already partially working)

**Option B:** Compute totals from per-course data (not recommended without credit-weighted calculation).

**Option C:** Leave as 0 and document that the portal does not provide aggregate totals.

### 6.3 CGPA
**Option A:** Extract from JavaScript execution in page context:
```ts
const cgpa = await page.evaluate(() => {
    // Look for cgpa variable in script tags or window object
    return (window as any).cgpa || null;
});
```
**Risk:** Depends on portal's JS implementation. `var cgpa = 0` suggests it's a local variable, not global.

**Option B:** Read from ApexCharts SVG `data:value` attributes:
```ts
const cgpaPath = document.querySelector('[seriesName="CGPA"] path');
const cgpa = cgpaPath?.getAttribute('data:value');
```
**Risk:** Fragile; depends on chart rendering.

**Option C:** Leave CGPA unextracted and document limitation.

---

## 7. Summary

| Field | Status | Root Cause | Fix Complexity |
|-------|--------|-----------|----------------|
| `semester` | Extracted but dropped | Missing mapping in `sanitizedData` | Trivial — add one line |
| `attendancePercentage` | Not extractable | Portal uses pie chart/progress bars, no labeled text | Medium — need card-based parsing |
| `totalClasses` | Not extractable | Same as above | Medium — need card-based parsing |
| `presentClasses` | Not extractable | Same as above | Medium — need card-based parsing |
| `absentClasses` | Not extractable | Same as above | Medium — need card-based parsing |
| `cgpa` | Not extractable | Rendered in JS variable / chart, not DOM text | Medium — need JS evaluation or SVG parsing |

---

## 8. Next Steps

Awaiting your decision on:
1. Add `semester` mapping immediately?
2. For attendance: parse cards, compute totals, or accept 0?
3. For CGPA: attempt JS evaluation, SVG parsing, or skip?

*No implementation performed.*
