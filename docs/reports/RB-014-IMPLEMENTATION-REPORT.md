# RB-014: Attendance Summary Extraction Implementation Report

## Summary
Replaced the broken global label-search approach for dashboard attendance summary with widget-scoped DOM extraction. The scraper now targets the `.statess` widget directly to read `Total`, `Present`, and `Absent` counts, then computes `attendancePercentage` arithmetically from those counts.

## Files Modified
- `backend/src/modules/ezone/scrapers/ezone.scraper.ts`

## Changes

### 1. Widget-Scoped Attendance Extraction (`extractPageData`)
**Before:** Used `findLabelValue()` with global exact-match searches (`Attendance %`, `Attendance`, `Total Classes`, `Total`, `Present Classes`, `Present`, `Absent Classes`, `Absent`). This caused collisions with ApexCharts legend elements and failed to find non-existent labels.

**After:** Added a scoped extractor that queries the `.statess` widget directly:
```typescript
const attendance = (() => {
    const statWidget = document.querySelector('.statess');
    if (!statWidget) {
        return { total: 'N/A', present: 'N/A', absent: 'N/A', percentage: 'N/A' };
    }
    const columns = statWidget.querySelectorAll('.col-md-12.text-center');
    const result: Record<string, string> = {};
    columns.forEach((col: any) => {
        const labelEl = col.querySelector('p.mb-0');
        const valueEl = col.querySelector('h5');
        const label = labelEl?.textContent?.trim() || '';
        const value = valueEl?.textContent?.trim() || '';
        if (label === 'Total') result.total = value;
        else if (label === 'Present ') result.present = value;
        else if (label === 'Absent') result.absent = value;
    });
    return {
        total: result.total || 'N/A',
        present: result.present || 'N/A',
        absent: result.absent || 'N/A',
        percentage: 'N/A'
    };
})();
```

### 2. Computed Attendance Percentage (`sanitizedData`)
**Before:** Parsed `rawData.attendance.percentage` directly from the DOM label `Attendance %`, which does not exist on the dashboard.

**After:** Computes percentage from the extracted counts:
```typescript
attendancePercentage: (() => {
    const totalRaw = rawData.attendance.total;
    const totalSafe = typeof totalRaw === "string" ? totalRaw : totalRaw == null ? "" : String(totalRaw);
    const total = parseInt(totalSafe.replace(/[^0-9]/g, '')) || 0;

    const presentRaw = rawData.attendance.present;
    const presentSafe = typeof presentRaw === "string" ? presentRaw : presentRaw == null ? "" : String(presentRaw);
    const present = parseInt(presentSafe.replace(/[^0-9]/g, '')) || 0;

    if (total > 0) {
        return Math.round((present / total) * 100);
    }

    return 0;
})(),
```

### 3. Diagnostic Logging
Added a concise log immediately after widget extraction:
```typescript
logger.info(`[SCRAPER] attendanceWidgetExtract: total=${attendance.total}, present=${attendance.present}, absent=${attendance.absent}`);
```

Existing `mergedExtract` and `mongoPayload` logs continue to capture the full attendance object for downstream verification.

## What Was NOT Changed
- Authentication flow (`ezone-session.provider.ts`)
- OTP verification and redirect handling
- Session establishment and cleanup
- Navigation URL discovery
- Dashboard profile extraction (`studentName`, `systemId`, `program`, etc.)
- Timetable extraction logic
- Subject/CA marks extraction logic
- Subject card attendance extraction (`extractAttendanceCards`)
- Google Sheets integration
- MongoDB schema or data mapper response contracts

## Verification
- TypeScript compilation: no new errors in `backend/src/modules/ezone/`
- Unit tests: 11/11 ezone regression tests pass
- The existing `ezone-diagnostic-*` captures confirm the `.statess` widget is present on the authenticated dashboard with valid numeric values

## Expected Behavior
1. Dashboard extraction hits the `.statess` widget instead of the entire DOM.
2. `Total`, `Present`, `Absent` are read from their respective `<h5>` values inside the widget.
3. `attendancePercentage` is computed as `Math.round((present / total) * 100)`.
4. ApexCharts legend collisions no longer affect the result.
5. No login page content is mistakenly scraped as attendance data.
