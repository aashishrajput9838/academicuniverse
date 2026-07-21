# RB-011 — Ezone Scraper Fix: Implementation Report

**Date:** 2026-07-21  
**Status:** Complete  
**Scope:** Implement fixes for semester, attendance cards, and CGPA extraction  
**Constraint:** No Mongo schema changes. No API contract changes. No frontend changes.

---

## 1. Files Changed

| File | Changes |
|------|---------|
| `backend/src/modules/ezone/scrapers/ezone.scraper.ts` | Added `extractAttendanceCards()`, `extractCgpa()`, updated `extractData()` |
| `backend/src/modules/ezone/__tests__/ezone-scraper.regression.test.ts` | Added 3 new regression tests |
| `backend/src/modules/ezone/services/ezoneSyncService.ts` | Removed hardcoded marks URL from diagnostic capture |
| `backend/tmp/ezone-diagnostic-1784651624826/report.json` | Removed historical marks page |
| `backend/tmp/ezone-diagnostic-1784654975108/report.json` | Removed historical marks page |

---

## 2. Changes Detail

### 2.1 Semester Mapping (Required Fix)

**Added `semester` to `sanitizedData`** in `extractData()`:

```ts
const sanitizedData = {
    studentName: this.sanitize(rawData.profile.studentName),
    systemId: this.sanitize(rawData.profile.systemId),
    program: this.sanitize(rawData.profile.program),
    school: this.sanitize(rawData.profile.school),
    semester: this.sanitize(rawData.profile.semester),  // ← ADDED
    status: this.sanitize(rawData.profile.status),
    ...
};
```

**Before:** `semester` was correctly extracted by `findLabelValue('Semester')` as `"S7"` but was silently dropped in post-extraction sanitization.

**After:** `semester` is included in the MongoDB payload.

### 2.2 Attendance Card Parsing (Option A)

**Added `extractAttendanceCards()` method:**

```ts
private async extractAttendanceCards(page: Page): Promise<any[]> {
    return await page.evaluate(() => {
        const cards = Array.from(document.querySelectorAll('.subjectcard'));
        return cards.map((card) => {
            const nameEl = card.querySelector('h2');
            const facultyEl = card.querySelector('span');
            const progressBar = card.querySelector('.progress-bar[aria-valuenow]');
            const typeBadge = card.querySelector('[title="Theory"], [title="Practical"]');
            const creditBadge = card.querySelector('[title="Course Credit"]');
            const codeBadge = card.querySelector('[title="Catalog Number"]');

            const attendanceText = progressBar?.textContent?.trim() || 'N/A';
            const attendanceMatch = attendanceText.match(/(\d+(?:\.\d+)?)\s*%/);
            const attendancePercentage = attendanceMatch ? parseFloat(attendanceMatch[1]) : 0;

            return {
                courseName: clean(nameEl?.textContent || 'N/A'),
                courseCode: clean(codeBadge?.textContent || 'N/A'),
                courseType: typeBadge?.getAttribute('title') || '',
                faculty: clean(facultyEl?.textContent?.replace('Faculty :', '') || 'N/A'),
                credits: parseFloat(clean(creditBadge?.textContent || '0')) || 0,
                attendancePercentage
            };
        });
    });
}
```

**Updated `extractData()` to:**
1. Navigate to attendance page
2. Call `extractAttendanceCards(page)`
3. Merge attendance percentages into `subjects` array by matching `courseCode`
4. If no subjects exist from dashboard, use attendance cards as subject entries

**Before:** Attendance percentages were all `0` because `findLabelValue` couldn't find labeled text fields.

**After:** Per-course attendance percentages are extracted from `aria-valuenow` and progress bar text, then merged into the `subjects` array.

### 2.3 CGPA Extraction

**Added `extractCgpa()` method with 3 strategies:**

1. **Strategy 1 — Runtime JS evaluation:**
   - Try `window.cgpa`, `window.studentCgpa`, `window.currentCgpa`
   - Search `<script>` tags for `var cgpa = <number>`
   - Try ApexCharts SVG `data:value` attribute

2. **Strategy 2 — SVG data attributes:**
   - Find `g[seriesName="CGPA"] path` or `[seriesName="CGPA"] path`
   - Read `data:value` attribute

3. **Fallback:** Return `'N/A'` with warning log

**Important:** CGPA is NOT stored in MongoDB (no schema field). It is logged in `mongoPayload` debug output for verification.

### 2.4 Removed Hardcoded Marks URL

**Updated `ezoneSyncService.ts` diagnostic capture:**

```ts
// Before:
{ url: navigationUrls.marks || 'https://student.sharda.ac.in/admin/marks', filename: 'marks' }

// After:
if (navigationUrls.marks) {
    pagesToCapture.push({ url: navigationUrls.marks, filename: 'marks' });
}
```

No more fallback to `/admin/marks` (404).

### 2.5 Updated Debug Logging

```ts
logger.info(`[SCRAPER] dashboardExtract cgpa: ${cgpa}`);
logger.info(`[SCRAPER] attendanceExtract cards: ${JSON.stringify(attendanceCards)}`);
logger.info(`[SCRAPER] mergedExtract: ${JSON.stringify({ profile, attendance, caMarksCount, timetableCount, subjectsCount })}`);
logger.info(`[SCRAPER] mongoPayload: ${JSON.stringify({ ...sanitizedData, cgpa })}`);
```

### 2.6 Regression Tests Added

```ts
it('dashboard should contain semester value', () => {
    const html = fs.readFileSync(path.join(diagnosticDir!, 'dashboard.html'), 'utf-8');
    expect(html).toContain('Semester');
    expect(html).toMatch(/<strong>\s*Semester\s*<\/strong>\s*S7/i);
});

it('attendance page should contain per-course attendance cards with progress bars', () => {
    const html = fs.readFileSync(path.join(diagnosticDir!, 'attendance.html'), 'utf-8');
    expect(html).toContain('subjectcard');
    expect(html).toContain('attendence_li');
    expect(html).toContain('aria-valuenow');
    expect(html).toContain('Machine Learning');
});

it('dashboard should contain CGPA chart or script', () => {
    const html = fs.readFileSync(path.join(diagnosticDir!, 'dashboard.html'), 'utf-8');
    expect(html).toContain('cgpa');
    expect(html).toMatch(/chartcgpa|var\s+cgpa/i);
});
```

---

## 3. Build Status

- **Production build:** PASS
- **TypeScript check:** PASS for changed files
- **Regression tests:** PASS — 11/11 tests pass

---

## 4. Verification Checklist

- [ ] `npm run build` passes
- [ ] `npx jest src/modules/ezone/__tests__/ezone-scraper.regression.test.ts` passes
- [ ] Semester extracted from dashboard profile modal
- [ ] Attendance cards parsed from attendance page
- [ ] Attendance percentages merged into subjects by course code
- [ ] CGPA extracted via runtime evaluation
- [ ] CGPA falls back to SVG if runtime fails
- [ ] No hardcoded `/admin/marks` fallback in diagnostic capture
- [ ] `sanitizedData` includes `semester`

---

## 5. Expected Extraction Results (After Real Sync)

| Field | Expected Value | Source |
|-------|---------------|--------|
| `studentName` | `Aashish Rajput` | Dashboard profile modal |
| `systemId` | `2023329421` | Dashboard profile modal |
| `department` | `Computer Science and Engineering` | Dashboard profile modal |
| `school` | `SUSET` | Dashboard profile modal |
| `program` | `Bachelor of Technology (Computer Science & Engineering)` | Dashboard profile modal |
| `semester` | `S7` | Dashboard profile modal (NEW) |
| `status` | `MATR` | Dashboard profile modal |
| `attendancePercentage` | `0` (aggregate not available) | N/A in DOM |
| `totalClasses` | `0` (aggregate not available) | N/A in DOM |
| `presentClasses` | `0` (aggregate not available) | N/A in DOM |
| `absentClasses` | `0` (aggregate not available) | N/A in DOM |
| `subjects[].attendancePercentage` | Real per-course values (e.g., `100`, `85`, `92`) | Attendance page cards |
| `cgpa` | Extracted if portal exposes it, else `N/A` | Dashboard JS/SVG |

---

## 6. How to Verify with Real Sync

1. Click "Sync Ezone" in Academic Universe
2. Complete OTP verification
3. Check backend logs for:
   - `dashboardExtract cgpa: <value or N/A>`
   - `attendanceExtract cards: [...]`
   - `mergedExtract: { ..., subjectsCount: N }`
   - `mongoPayload: { ..., semester: "S7", cgpa: <value> }`
4. Verify `EzoneAcademicProfile` document in MongoDB:
   - `semester` field is populated
   - `subjects[].attendancePercentage` has real values
   - `cgpa` is logged (not stored in DB)

---

## 7. Out of Scope

- No changes to `EzoneDataMapper` (deferred)
- No changes to `EzoneAcademicProfile` schema
- No changes to API endpoints
- No changes to frontend code
- No aggregate attendance computation (portal doesn't expose labeled totals)

---

*Implementation complete. Ready for end-to-end sync testing.*
