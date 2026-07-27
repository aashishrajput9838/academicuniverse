# RB-006 — Raw Scraper vs Mapper Investigation Report

**Date:** 2026-07-21  
**Status:** Investigation Complete — No Implementation  
**Scope:** Trace exact data corruption in Ezone sync pipeline for userId `6a58b65d816b680ebffb8b89`  
**Constraint:** No code changes. No business logic modifications.

---

## 1. Pipeline Trace

```
Playwright (page.evaluate)
        ↓
Raw scraper output (sanitizedData)
        ↓
sanitizeObject() [additional sanitization]
        ↓
mapper.toSheets() [Google Sheets format]
        ↓
mapper.fromSheetsToMongo() [MongoDB format]
        ↓
repository.upsertProfile()
        ↓
MongoDB document
```

**Note:** Google Sheets IS enabled in this environment (`GOOGLE_SHEETS_CLIENT_EMAIL` is set). The data path taken is:
1. `extractData()` → raw scraper output
2. `sanitizeObject()` → additional sanitization
3. `toSheets()` → sheets format
4. `fromSheetsToMongo()` → MongoDB format
5. `upsertProfile()` → MongoDB

---

## 2. Three Data Snapshots

### 2.1 Raw Scraper Output (BEFORE Mapping)

**Source:** `EzoneScraper.extractData()` return value

```json
{
  "studentName": "",
  "systemId": "N/A",
  "program": "N/A",
  "school": "N/A",
  "semester": "N/A",
  "status": "Active",
  "attendancePercentage": 0,
  "totalClasses": 0,
  "presentClasses": 0,
  "absentClasses": 0,
  "caMarks": [
    {
      "courseCode": "Design Patterns & Microservices [CSCR3216]",
      "courseName": "4.0",
      "assignment1": "9.5",
      "assignment2": "5.0",
      "assessment1": "5.0",
      "assessment2": "23.5",
      "total": "N/A"
    },
    ...
  ],
  "subjects": [
    {
      "courseCode": "Design Patterns & Microservices [CSCR3216]",
      "courseName": "4.0",
      "faculty": "9.5",
      "courseType": "5.0",
      "credits": 5,
      "attendancePercentage": 23.5
    },
    ...
  ],
  "timetable": [
    {
      "subject": "Design Patterns & Microservices [CSCR3216]",
      "faculty": "4.0",
      "room": "9.5",
      "time": "5.0"
    },
    ...
  ],
  "holidays": [
    {
      "name": "Design Patterns & Microservices [CSCR3216]",
      "date": "4.0"
    },
    ...
  ]
}
```

### 2.2 After EzoneDataMapper (toSheets → fromSheetsToMongo)

**Source:** `mapper.fromSheetsToMongo(mapper.toSheets(sanitizedData, ...))`

```json
{
  "studentName": "",
  "systemId": "N/A",
  "program": "N/A",
  "school": "N/A",
  "status": "Active",
  "attendancePercentage": 0,
  "totalClasses": 0,
  "presentClasses": 0,
  "absentClasses": 0,
  "caMarks": [
    {
      "courseCode": "Design Patterns & Microservices [CSCR3216]",
      "courseName": "4.0",
      "assignment1": "9.5",
      "assignment2": "5.0",
      "assessment1": "5.0",
      "assessment2": "23.5",
      "total": "N/A"
    },
    ...
  ],
  "subjects": [
    {
      "courseCode": "Design Patterns & Microservices [CSCR3216]",
      "courseName": "4.0",
      "faculty": "9.5",
      "courseType": "5.0",
      "credits": 5,
      "attendancePercentage": 23.5
    },
    ...
  ],
  "timetable": [
    {
      "subject": "Design Patterns & Microservices [CSCR3216]",
      "faculty": "4.0",
      "room": "9.5",
      "time": "5.0"
    },
    ...
  ],
  "holidays": [
    {
      "holidayName": "Design Patterns & Microservices [CSCR3216]",
      "holidayDate": "4.0"
    },
    ...
  ],
  "lastSyncedAt": "2026-07-21T15:18:48.208Z"
}
```

### 2.3 Object Passed into upsertProfile()

**Source:** `ezoneSyncService.ts` line 106: `this.repository.upsertProfile(userId, organizationId, mongoData)`

Since Google Sheets IS enabled, `mongoData` comes from `mapper.fromSheetsToMongo(sheetsData)`.

The object passed to `upsertProfile` is IDENTICAL to snapshot 2.2 above.

---

## 3. Comparison: What Changed Between Snapshots

| Field | Raw Scraper | After Mapper | Changed? |
|-------|-------------|--------------|----------|
| `studentName` | `""` | `""` | No |
| `systemId` | `"N/A"` | `"N/A"` | No |
| `program` | `"N/A"` | `"N/A"` | No |
| `school` | `"N/A"` | `"N/A"` | No |
| `semester` | `"N/A"` | **MISSING** | YES — dropped by mapper |
| `department` | **MISSING** | **MISSING** | YES — never extracted, never mapped |
| `status` | `"Active"` | `"Active"` | No |
| `caMarks` | shifted | shifted | No |
| `subjects` | shifted | shifted | No |
| `timetable` | shifted | shifted | No |
| `holidays` | shifted | shifted | No |

**The mapper does NOT introduce new corruption.** It preserves the scraper's output (with two exceptions: it drops `semester` and `department`).

---

## 4. Exact Corruption Points

### 4.1 `department` Disappears

**Function:** `EzoneScraper.extractData()`  
**File:** `backend/src/modules/ezone/scrapers/ezone.scraper.ts`  
**Lines:** 155-162

```typescript
const profile = {
    studentName: '',
    systemId: findLabelValue('System ID'),
    program: findLabelValue('Program') || findLabelValue('Course'),
    school: findLabelValue('School') || findLabelValue('Department'),
    semester: findLabelValue('Semester') || findLabelValue('Term'),
    status: findLabelValue('Status') || 'Active'
    // NO department field!
};
```

The `profile` object has NO `department` property. `findLabelValue('Department')` is only used as a fallback for `school`, NOT for `department`.

**Secondary loss:** `EzoneDataMapper.fromSheetsToMongo()`  
**File:** `backend/src/modules/ezone/services/ezoneDataMapper.ts`  
**Lines:** 122-172

Even if `department` were present in `sheetsData.StudentProfile`, `fromSheetsToMongo` does NOT map it:
```typescript
studentName: profileRow[3],
systemId: profileRow[2],
program: profileRow[6],
school: profileRow[7],
status: profileRow[9],
// profileRow[5] (department) is NEVER mapped
```

---

### 4.2 `studentName` Becomes ""

**Function:** `EzoneScraper.extractData()`  
**File:** `backend/src/modules/ezone/scrapers/ezone.scraper.ts`  
**Line:** 156

```typescript
studentName: '',
```

Initialized to empty string. Then populated by name selectors (lines 165-175):
```typescript
const nameSelectors = ['.user-name', '.profile-name', '.student-name', '#student_name', '.navbar-user .name'];
for (const s of nameSelectors) {
    const el = document.querySelector(s);
    if (el) {
        let text = clean(el.textContent || '');
        if (text && text.length > 2 && !text.toUpperCase().includes('WELCOME')) {
            profile.studentName = text;
            break;
        }
    }
}
```

If none of the selectors match the portal's current DOM, `studentName` remains `""`.

---

### 4.3 `systemId` Becomes "N/A"

**Function:** `EzoneScraper.extractData()` → `findLabelValue()`  
**File:** `backend/src/modules/ezone/scrapers/ezone.scraper.ts`  
**Lines:** 135-152, 157

```typescript
const findLabelValue = (label: string) => {
    const elements = Array.from(document.querySelectorAll('td, th, span, div, p, strong, b, label'));
    const target = elements.find(el => {
        const text = el.textContent?.trim().toUpperCase() || '';
        return text === label.toUpperCase() || text === (label.toUpperCase() + ':');
    });
    
    if (!target) return 'N/A';
    
    // Try next sibling
    if (target.nextElementSibling) return clean(target.nextElementSibling.textContent || 'N/A');
    
    // Try parent's next sibling
    const parent = target.parentElement;
    if (parent && parent.nextElementSibling) return clean(parent.nextElementSibling.textContent || 'N/A');

    return 'N/A';
};
```

If the portal's dashboard no longer has a label with exact text "System ID" or "System ID:", `findLabelValue` returns `'N/A'`.

---

### 4.4 `program` Becomes "N/A"

**Function:** `EzoneScraper.extractData()`  
**File:** `backend/src/modules/ezone/scrapers/ezone.scraper.ts`  
**Line:** 158

```typescript
program: findLabelValue('Program') || findLabelValue('Course'),
```

If neither "Program" nor "Course" labels exist in the portal DOM, returns `'N/A'`.

---

### 4.5 `school` Becomes "N/A"

**Function:** `EzoneScraper.extractData()`  
**File:** `backend/src/modules/ezone/scrapers/ezone.scraper.ts`  
**Line:** 159

```typescript
school: findLabelValue('School') || findLabelValue('Department'),
```

If neither "School" nor "Department" labels exist in the portal DOM, returns `'N/A'`.

---

### 4.6 Array Fields Become Shifted

**Function:** `EzoneScraper.extractData()` → `extractTable()`  
**File:** `backend/src/modules/ezone/scrapers/ezone.scraper.ts`  
**Lines:** 115-133, 186-218

```typescript
const extractTable = (options: string | { headers: string[] }, colMap: Record<string, number>) => {
    // ...find table by headers...
    const rows = Array.from(table.querySelectorAll('tr')).slice(1);
    return rows.map(row => {
        const cells = Array.from(row.querySelectorAll('td'));
        const data: any = {};
        Object.entries(colMap).forEach(([key, idx]) => {
            data[key] = clean(cells[idx]?.textContent || 'N/A');
        });
        return data;
    });
};
```

The corruption begins here because `colMap` uses **hardcoded column indices** that assume a specific table structure on the portal.

**Affected extractions:**

| Array | Line | Hardcoded Indices | Problem |
|-------|------|-------------------|---------|
| `caMarks` | 186-194 | `courseCode: 0, courseName: 1, assignment1: 2, ...` | Assumes 7 columns (0-6). Actual portal table has different column order. |
| `subjects` | 197-204 | `courseCode: 0, courseName: 1, faculty: 2, ...` | Assumes 6 columns (0-5). Actual portal table has different column order. |
| `timetable` | 207-212 | `subject: 0, faculty: 1, room: 2, time: 3` | Assumes 4 columns (0-3). Actual portal table has different column order. |
| `holidays` | 215-218 | `name: 0, date: 1` | Assumes 2 columns (0-1). Actual portal table has different column order. |

**Evidence from MongoDB document:**

For `subjects[0]`:
- `courseCode` = "Design Patterns & Microservices [CSCR3216]" (column 0 — appears correct)
- `courseName` = "4.0" (column 1 — should be course name, but is a numeric value)
- `faculty` = "9.5" (column 2 — should be faculty name, but is a numeric value)
- `courseType` = "5.0" (column 3 — should be course type, but is a numeric value)
- `credits` = 5 (column 4 — matches)
- `attendancePercentage` = 23.5 (column 5 — matches)

The pattern shows that columns 1-3 contain numeric values that look like they belong to columns 4-6 or elsewhere. This confirms the portal's actual table structure differs from the scraper's assumptions.

---

## 5. Summary: Where Corruption Begins

| Symptom | Exact Function | Exact File | Exact Line(s) |
|---------|---------------|------------|---------------|
| `department` missing | `extractData()` — `profile` object has no `department` field | `ezone.scraper.ts` | 155-162 |
| `studentName` = "" | `extractData()` — initialized to `''`, name selectors fail | `ezone.scraper.ts` | 156, 165-175 |
| `systemId` = "N/A" | `extractData()` → `findLabelValue('System ID')` returns `'N/A'` | `ezone.scraper.ts` | 135-152, 157 |
| `program` = "N/A" | `extractData()` → `findLabelValue('Program') || findLabelValue('Course')` returns `'N/A'` | `ezone.scraper.ts` | 158 |
| `school` = "N/A" | `extractData()` → `findLabelValue('School') || findLabelValue('Department')` returns `'N/A'` | `ezone.scraper.ts` | 159 |
| Arrays shifted | `extractData()` → `extractTable()` with hardcoded column indices | `ezone.scraper.ts` | 115-133, 186-218 |
| `semester` dropped | `fromSheetsToMongo()` — does not map `profileRow[8]` | `ezoneDataMapper.ts` | 122-172 |
| `department` dropped (secondary) | `fromSheetsToMongo()` — does not map `profileRow[5]` | `ezoneDataMapper.ts` | 122-172 |

**Primary corruption source:** `EzoneScraper.extractData()` in `ezone.scraper.ts`

**Secondary corruption source:** `EzoneDataMapper.fromSheetsToMongo()` in `ezoneDataMapper.ts` (drops `department` and `semester`)

---

## 6. Root Cause Summary

The Ezone portal's HTML structure has changed since the scraper was written. The scraper relies on:

1. **Exact label text matching** (`findLabelValue`) — The portal no longer uses labels like "System ID", "Program", "School", "Department" in the expected format.
2. **Fixed column indices** (`extractTable`) — The portal's table structures have different column orders than what the scraper assumes.
3. **CSS class name matching** (name selectors) — The portal no longer uses `.user-name`, `.profile-name`, etc.

The mapper (`fromSheetsToMongo`) compounds the problem by silently dropping `department` and `semester` fields during the sheets-to-Mongo round-trip.

---

## 7. Recommended Fix Direction (For Approval)

These are investigation findings only. No implementation has been performed.

1. **Update scraper selectors** — Inspect the live portal HTML and update `findLabelValue` targets and name selectors to match current DOM structure.
2. **Update column indices** — Inspect actual table headers and adjust `colMap` indices in `extractTable` calls.
3. **Add `department` extraction** — Include `department` in the `profile` object in `extractData()`.
4. **Fix `fromSheetsToMongo`** — Add mappings for `department` (profileRow[5]) and `semester` (profileRow[8]).

---

*Investigation complete. No implementation performed.*
