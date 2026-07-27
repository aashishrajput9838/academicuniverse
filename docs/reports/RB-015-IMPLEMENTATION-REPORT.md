# RB-015: Timetable Extraction Implementation Report

## Summary
Replaced the broken `extractTable`-based timetable parser with a DOM-aware parser that matches the actual Ezone timetable structure. The new parser reads time slots from the header row, iterates day rows, decomposes `.tableshaddow` cards into structured objects, and aligns the output schema with `sanitizedData`.

## Files Modified
- `backend/src/modules/ezone/scrapers/ezone.scraper.ts`

## Implementation Details

### 1. Custom Timetable Parser (inside `extractPageData`)

Replaced:
```typescript
const timetable = extractTable({ headers: ['HoursWeek', 'Time Table'] }, {
    timeSlot: 0,
    monday: 1,
    tuesday: 2,
    ...
});
```

With a scoped parser targeting `table.viewtimetalbe`, `table.attendencetable`, or `#table.table`:
- **Header row**: Extracts time slot labels (`09:00:00 - 09:50:00`, etc.) from `<th>` cells after the first column.
- **Day rows**: Reads day name from `<th>`, then iterates each `<td>`.
- **Card decomposition**: For each populated cell, reads `.tableshaddow`:
  - `<p>` text → split on ` - ` into `courseCode` and `subject`
  - `.badge-primary` → `room`
  - `.badge-danger` → `faculty`
- **Empty cells**: Skipped and counted in metadata.
- **Metadata**: Returns `{ rows, classes, skipped }` alongside the timetable array.

### 2. Header Robustness
The parser no longer relies on exact header-text matching against `HoursWeek` or `Time Table`. Instead it:
- Targets the timetable table by CSS class/ID (`viewtimetalbe`, `attendencetable`, `#table.table`)
- Uses direct DOM traversal of the first `<tr>` for time slot headers
- Is resilient to `<br>`, whitespace, and header text variations

### 3. Schema Alignment
Updated `sanitizedData` timetable mapping to match the new extraction schema:

```typescript
timetable: (rawData.timetable || []).map((t: any) => ({
    day: this.sanitize(t.day),
    time: this.sanitize(t.time),
    subject: this.sanitize(t.subject),
    courseCode: this.sanitize(t.courseCode),
    faculty: this.sanitize(t.faculty),
    room: this.sanitize(t.room)
})),
```

Previous schema only mapped `subject`, `faculty`, `room`, `time` — which did not match the keys produced by `extractTable`. The new schema aligns extraction output with persistence mapping.

### 4. Diagnostic Logs
Added concise Node.js-context logs in `extractData`:
```typescript
const meta = pageData.timetableMeta || {};
logger.info(`[SCRAPER] timetableExtract: rows=${meta.rows || 0}, classes=${meta.classes || 0}, skipped=${meta.skipped || 0}`);
```

Existing `dashboardExtract timetable count` and `mergedExtract` logs remain for cross-checking.

### 5. Unchanged Areas
- Authentication, OTP flow, session handling
- Navigation discovery
- Attendance extraction (dashboard + attendance cards)
- Subject extraction
- CA Marks extraction
- Google Sheets integration
- MongoDB contracts / API response contracts

## Regression Risk Assessment

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Time slot header count changes | Low | Dynamic discovery via `querySelectorAll('th')` |
| `.tableshaddow` class renamed | Low | Falls back to empty cell (skipped) without crashing |
| `badge-primary` / `badge-danger` removed | Low | Room/faculty degrade to empty strings, not a crash |
| Multiple tables match selector | Very Low | `querySelector` returns first match; timetable table is unique |
| Dashboard page also matches selector | Very Low | Dashboard lacks `.viewtimetalbe` / `attendencetable` class (verified in diagnostics) |

## Verification Checklist

- [x] TypeScript compilation: no new errors in `src/modules/ezone/`
- [x] Unit tests pass: 11/11
- [ ] Live verification: timetable page returns populated objects instead of empty strings
- [ ] Live verification: `day`, `time`, `courseCode`, `subject`, `faculty`, `room` are all populated
- [ ] Live verification: logs show `timetableExtract: rows=X, classes=Y, skipped=Z`

## Expected Live Behavior

1. Parser finds table by CSS class/ID, not header text.
2. First row yields 10 time slots.
3. Subsequent rows produce one object per populated `.tableshaddow`.
4. `CSE473 - Machine Learning` → `courseCode: "CSE473"`, `subject: "Machine Learning"`
5. `Room No 207 Block 1` → `room: "Room No 207 Block 1"`
6. `Mr Gouri Shankar Mishra` → `faculty: "Mr Gouri Shankar Mishra"`
7. Empty slots skipped without producing empty objects.
8. `sanitizedData.timetable` objects contain all six expected fields.
