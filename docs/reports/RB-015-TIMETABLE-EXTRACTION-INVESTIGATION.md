# RB-015: Timetable Extraction Investigation Report

## Issue
Timetable page navigation succeeds. `timetableExtract` reports 7 rows detected. However every extracted timetable object contains empty values.

Actual output:
```json
{
  "subject": "",
  "courseCode": "",
  "faculty": "",
  "room": "",
  "time": "",
  "day": ""
}
```

Expected output:
```json
{
  "subject": "Machine Learning",
  "courseCode": "CSE473",
  "faculty": "Mr Gouri Shankar Mishra",
  "room": "Room No 207 Block 1",
  "time": "11:45 - 12:35",
  "day": "Monday"
}
```

## Investigation Scope
- Examined: `backend/src/modules/ezone/scrapers/ezone.scraper.ts`
- Evidence: `backend/tmp/ezone-diagnostic-1784662452035/timetable.html`
- Scope: Timetable parser ONLY. No authentication, navigation, attendance, subject, CA marks, or Mongo changes.

---

## 1. Current Extraction Flow

**File:** `ezone.scraper.ts`
**Function:** `extractPageData()` → inner `extractTable()`

```typescript
const timetable = extractTable({ headers: ['HoursWeek', 'Time Table'] }, {
    timeSlot: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
    sunday: 7
});
```

Then in `sanitizedData`:
```typescript
timetable: (rawData.timetable || []).map((t: any) => ({
    subject: this.sanitize(t.subject),
    courseCode: this.sanitize(t.courseCode),
    faculty: this.sanitize(t.faculty),
    room: this.sanitize(t.room),
    time: this.sanitize(t.time)
})),
```

---

## 2. DOM Analysis (from captured HTML)

### 2.1 Table Location
```html
<!-- Line 281 -->
<table id="table" class="table table-bordered viewtimetalbe attendencetable" width="100%" cellspacing="0">
```

Only one real `<table>` exists on the timetable page (second match is an Excel template string inside JavaScript).

### 2.2 Header Row (Line 282–294)
```html
<tr>
    <th align="center" width="200px">
        <strong>Hours<br>Week</strong>
    </th>
    <th> 09:00:00 - 09:50:00 </th>
    <th> 09:55:00 - 10:45:00 </th>
    <th> 10:50:00 - 11:40:00 </th>
    <th> 11:45:00 - 12:35:00 </th>
    <th> 12:35:00 - 13:25:00 </th>
    <th> 13:25:00 - 14:15:00 </th>
    <th> 14:20:00 - 15:10:00 </th>
    <th> 15:15:00 - 16:05:00 </th>
    <th> 16:05:00 - 16:55:00 </th>
    <th> 17:00:00 - 17:50:00 </th>
</tr>
```

### 2.3 Day Row Example (Line 295–348)
```html
<tr>
    <th>Mon, July 20, 2026</th>
    <td>
        <div class="tableshaddow">
            <p>CSP473 - Machine Learning Lab</p>
            <span class="badge badge-primary" data-placement="top" title="Room Number">
                Room No 010 A Block 1
            </span>
            <span class="badge badge-danger" data-placement="top" title="PI">
                Mr Gouri Shankar Mishra
            </span>
        </div>
    </td>
    <td>
        <div class="tableshaddow">
            <p>CSP473 - Machine Learning Lab</p>
            <span class="badge badge-primary" title="Room Number">Room No 010 A Block 1</span>
            <span class="badge badge-danger" title="PI">Mr Gouri Shankar Mishra</span>
        </div>
    </td>
    <td>
        <div class="tableshaddow">
            <p>CSE062 - Mobile Computing</p>
            <span class="badge badge-primary" title="Room Number">Room No 207 Block  1</span>
            <span class="badge badge-danger" title="PI">Mekhala .</span>
        </div>
    </td>
    <td>
        <div class="tableshaddow">
            <p>CSE473 - Machine Learning</p>
            <span class="badge badge-primary" title="Room Number">Room No 207 Block  1</span>
            <span class="badge badge-danger" title="PI">Mr Gouri Shankar Mishra</span>
        </div>
    </td>
    <td>
        <div class="tableshaddow">
            <p>NV62010 - Quantam Computing with AI</p>
            <span class="badge badge-primary" title="Room Number">Room No 207 Block  1</span>
            <span class="badge badge-danger" title="PI">Kanamala Suresh</span>
        </div>
    </td>
    <!-- remaining time slots are empty <td></td> -->
</tr>
```

Day rows for Tue–Sun follow the same pattern (empty or populated `.tableshaddow` cards).

---

## 3. Selector Analysis

### 3.1 `findTableByHeaders(['HoursWeek', 'Time Table'])`

**Captured DOM:**  
The only table header text is:
- `Hours Week` (from `Hours<br>Week`, after whitespace sanitization)
- `09:00:00 - 09:50:00`
- ...
- `Mon, July 20, 2026`
- ...

**Comparison:**
- `'Hours Week'.toUpperCase().includes('HOURSWEEK')` = **false**
- `'Hours Week'.toUpperCase().includes('TIME TABLE')` = **false**

**Conclusion:**  
The captured DOM header `Hours<br>Week` does **not** match the search string `HoursWeek`. The `findTableByHeaders()` function would return **no matching tables** for the captured HTML. (If 7 rows are observed in a live run, the live page structure at that moment may have differed from this capture.)

### 3.2 Cell Traversal Mismatch

Even if a table were found, `extractTable()` uses this logic:
```typescript
const cells = Array.from(rows[i].querySelectorAll('td'));
Object.entries(colMap).forEach(([key, idx]) => {
    data[key] = clean(cells[idx]?.textContent || 'N/A');
});
```

**Captured DOM cell structure:**
- Each data row (`<tr>`) contains:
  - 1 `<th>`: day name (e.g., `Mon, July 20, 2026`)
  - 10 `<td>`: one per time slot

**What `querySelectorAll('td')` returns:**  
10 cells per day row. Index `0` = first time slot, index `1` = second time slot, etc.

**What the colMap assumes:**
| Key | Index | Expected content |
|-----|-------|------------------|
| `timeSlot` | 0 | time slot label |
| `monday` | 1 | Monday column |
| `tuesday` | 2 | Tuesday column |
| ... | ... | ... |
| `sunday` | 7 | Sunday column |

**Reality:**  
The timetable is transposed relative to the parser's assumption. Time slots are COLUMNS, days are ROWS. The parser indexes 8 cells per row, but each row contains 10 time-slot cells with NO day-name column inside `<td>` elements.

### 3.3 Nested Card Parsing

Each `<td>` contains:
```html
<div class="tableshaddow">
    <p>COURSE_CODE - COURSE_NAME</p>
    <span class="badge badge-primary" title="Room Number">ROOM</span>
    <span class="badge badge-danger" title="PI">FACULTY</span>
</div>
```

`clean(cells[idx]?.textContent)` collapses all nested text into one blob:
```
"CSP473 - Machine Learning Lab Room No 010 A Block 1 Mr Gouri Shankar Mishra"
```

The current parser does **not** decompose this blob into `subject`, `courseCode`, `faculty`, or `room` fields.

---

## 4. Parser Analysis

### 4.1 Schema Mismatch Between `extractTable` Output and `sanitizedData` Mapping

**`extractTable` output schema** (based on colMap keys):
```javascript
{
  timeSlot: "CSP473 - Machine Learning Lab Room No 010 A Block 1 Mr Gouri Shankar Mishra",
  monday: "CSE062 - Mobile Computing Room No 207 Block  1 Mekhala .",
  tuesday: "...",
  wednesday: "...",
  thursday: "...",
  friday: "...",
  saturday: "...",
  sunday: "..."
}
```

**`sanitizedData.timetable` mapping expects**:
```javascript
{
  subject: t.subject,       // undefined — key does not exist
  courseCode: t.courseCode, // undefined — key does not exist
  faculty: t.faculty,       // undefined — key does not exist
  room: t.room,             // undefined — key does not exist
  time: t.time              // undefined — key does not exist
}
```

Every mapped field reads from an **undefined** property because `extractTable` produces keys `timeSlot`, `monday`, `tuesday`, etc., not `subject`, `courseCode`, `faculty`, `room`, or `time`.

### 4.2 Why All Values Become Empty Strings

`sanitize(undefined)` returns `''` because the sanitizer coerces non-string inputs to empty strings. Therefore every field in the final Mongo payload is `""`.

---

## 5. Root Cause

There are two compounding root causes:

### Root Cause A: Output schema mismatch
`extractTable()` returns objects keyed by column position (`timeSlot`, `monday`, `tuesday`, etc.), but `sanitizedData` maps those objects to fields that do not exist (`subject`, `courseCode`, `faculty`, `room`, `time`). This mismatch guarantees empty strings even if extraction succeeded.

### Root Cause B: Grid orientation and selector mismatch
The live timetable is transposed relative to the parser's assumption:
- Parser assumes **vertical days, horizontal time slots**
- Actual DOM is **horizontal time slots, vertical days**
- Each cell contains nested `.tableshaddow` cards with concatenated subject/room/faculty text

The parser reads row index as column index, maps time-slot cells to day names, and never decomposes the nested card content.

### Root Cause C: Header text mismatch (potential blocker)
The header search string `HoursWeek` does not match the actual DOM text `Hours Week`. This means `findTableByHeaders()` may return zero tables in the captured HTML. If the live portal still renders `Hours<br>Week`, the table would not be found at all and `extractTable` would return `[]`. The reported "7 rows" in a live run may indicate a different live DOM structure or transient HTML state.

---

## 6. Recommended Implementation Strategy

### 6.1 Target DOM Structure
Read the grid as **days=rows, time-slots=columns**:
- First `<tr>`: extract 10 time slot headers
- Each subsequent `<tr>`: `<th>` = day name, `<td>` elements = class cards per time slot

### 6.2 Time Slot Headers
Extract from the first `<tr>` via direct indexing or `querySelectorAll('tr:first-child th')`.

### 6.3 Per-Class Row Generation
For each day row after the header:
1. Read day name from `<th>`
2. For each `<td>` at index `i` (0–9):
   - If empty, skip
   - If populated, parse `.tableshaddow > p`, `.badge-primary`, `.badge-danger`
   - Emit one flat object:
     ```javascript
     {
         day: "Monday",
         time: "09:00 - 09:50",
         subject: "Machine Learning",
         courseCode: "CSE473",
         room: "Room No 207 Block 1",
         faculty: "Mr Gouri Shankar Mishra"
     }
     ```

### 6.4 Field Decomposition from `.tableshaddow`
```javascript
const card = td.querySelector('.tableshaddow');
const pText = card?.querySelector('p')?.textContent?.trim() || '';
const [code, ...nameParts] = pText.split(' - ');
const subject = nameParts.join(' - ');
const room = card?.querySelector('.badge-primary')?.textContent?.trim() || '';
const faculty = card?.querySelector('.badge-danger')?.textContent?.trim() || '';
```

### 6.5 Align `sanitizedData` Mapping
Ensure `sanitizedData` timetable keys match the extraction keys:
```javascript
timetable: rawData.timetable.map((t: any) => ({
    subject: this.sanitize(t.subject),
    courseCode: this.sanitize(t.courseCode),
    faculty: this.sanitize(t.faculty),
    room: this.sanitize(t.room),
    time: this.sanitize(t.time),
    day: this.sanitize(t.day)
})),
```

### 6.6 Header Selector Fix
Update header matching from `['HoursWeek', 'Time Table']` to a selector that survives `<br>` and whitespace variations. Options:
- Match a single stable string present in the actual DOM, such as `'Hours'`
- Or switch to direct `document.querySelector('table.viewtimetalbe')` and validate by counting expected columns

---

## 7. Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Header text `Hours<br>Week` may vary across portal updates | Medium | Use `includes('Hours')` or ID-selector fallback instead of exact string |
| Time slot columns may change count (currently 10) | Medium | Detect dynamically via `querySelectorAll('tr:first-child th').length - 1` |
| `tableshaddow` class name or structure may change | Low | Keep fallback to raw `textContent` if nested selectors return null |
| Empty `<td>` cells for free periods | Low | Skip when `.tableshaddow` is absent |
| Day names include date suffix (`Mon, July 20, 2026`) | Low | Accept as-is or normalize; does not break extraction |

---

## 8. Files Requiring Modification (Pending Approval)

If RB-015 implementation is approved, changes are confined to:
- `backend/src/modules/ezone/scrapers/ezone.scraper.ts`
  - `extractPageData()`: replace or augment `extractTable` call for timetable
  - `sanitizedData` construction: align timetable field mapping keys

No changes to authentication, session handling, navigation, attendance, subjects, CA marks, Google Sheets, or MongoDB contracts.
