# RB-017: CA Marks Data Quality Implementation Report

## Summary
Added a row-level filter to the CA Marks sanitization pipeline to prevent placeholder rows from being persisted to MongoDB. Filtering is confined to the `caMarks` mapping and does not affect the generic `extractTable` parser.

## Files Modified
- `backend/src/modules/ezone/scrapers/ezone.scraper.ts`

## Implementation Details

### Filter Added (caMarks sanitization)
```typescript
const rawCaMarks = rawData.caMarks || [];
const validCaMarks = rawCaMarks.filter((m: any) => {
    const code = (m.courseCode || '').trim();
    const name = (m.courseName || '').trim();
    if (code === 'No record found.' || name === 'No record found.') return false;
    if (!code && !name) return false;
    if (code === '-' && name === '-') return false;
    return true;
});
logger.info(`[SCRAPER] caMarksFilter: raw=${rawCaMarks.length} valid=${validCaMarks.length} removed=${rawCaMarks.length - validCaMarks.length}`);

caMarks: validCaMarks.map((m: any) => ({
    courseCode: this.sanitize(m.courseCode),
    courseName: this.sanitize(m.courseName),
    assignment1: this.sanitize(m.assignment1),
    assignment2: this.sanitize(m.assignment2),
    assessment1: this.sanitize(m.assessment1),
    assessment2: this.sanitize(m.assessment2),
    total: this.sanitize(m.total)
})),
```

### What Is Rejected
- Rows where `courseCode` or `courseName` equals `"No record found."`
- Rows where both `courseCode` and `courseName` are empty/whitespace-only
- Rows where both `courseCode` and `courseName` are `"-"`

### What Is Preserved
- Valid CA marks rows with real course names/codes
- Rows containing `"-"` in assignment/assessment columns only
- All other extraction, sanitization, and payload logic

### Diagnostics
Added one concise log line:
```
[SCRAPER] caMarksFilter: raw=X valid=Y removed=Z
```

### What Was NOT Changed
- `extractTable()` generic parser
- Authentication, OTP, session, navigation
- Attendance, subjects, timetable, profile, CGPA
- Mongo schema, API contracts, Google Sheets
- Numeric mark normalization (deferred)

## Regression Risk
- **Very Low**: Filter only rejects exact placeholder strings. No legitimate CA row matches `"No record found."` or `"-"`.
- **No cross-module impact**: Filter is confined to `caMarks` mapping only.
- **No schema changes**: MongoDB receives fewer rows, but field structure is unchanged.

## Verification Checklist
- [x] TypeScript compilation: no new errors in `src/modules/ezone/`
- [x] Unit tests pass: 11/11 ezone regression tests
- [ ] Live verification: confirm `caMarksFilter` log shows removed count when `No record found.` row exists
- [ ] Live verification: confirm Mongo payload does not contain `{ courseCode: "No record found.", ... }`
- [ ] Live verification: confirm valid CA marks rows are unaffected
