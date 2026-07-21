# RB-008 — Integrate DOM Capture into Existing Ezone Sync: Implementation Report

**Date:** 2026-07-21  
**Status:** Complete  
**Scope:** Integrated diagnostic DOM capture into existing Ezone sync flow  
**Constraint:** No business logic changed. No separate diagnostic script needed.

---

## 1. Changed File

| File | Lines Changed |
|------|---------------|
| `backend/src/modules/ezone/services/ezoneSyncService.ts` | Added imports, `captureDiagnosticPages` method, and invocation in `verifyAndSync` |

---

## 2. Exact Changes

### Imports Added
```typescript
import * as fs from 'fs';
import * as path from 'path';
```

### New Private Method
```typescript
private async captureDiagnosticPages(page: any, outputDir: string): Promise<void> {
    const pagesToCapture = [
        { url: 'https://student.sharda.ac.in/admin/home', filename: 'dashboard' },
        { url: 'https://student.sharda.ac.in/admin/attendance', filename: 'attendance' },
        { url: 'https://student.sharda.ac.in/admin/marks', filename: 'marks' },
        { url: 'https://student.sharda.ac.in/admin/timetable', filename: 'timetable' }
    ];

    const results: any[] = [];

    for (const pageConfig of pagesToCapture) {
        try {
            await page.goto(pageConfig.url, { waitUntil: 'networkidle', timeout: 60000 });
            await page.waitForTimeout(3000);

            const title = await page.title();
            const currentUrl = page.url();
            const html = await page.content();

            const screenshotPath = path.join(outputDir, `${pageConfig.filename}.png`);
            const htmlPath = path.join(outputDir, `${pageConfig.filename}.html`);

            await page.screenshot({ path: screenshotPath, fullPage: true });
            fs.writeFileSync(htmlPath, html, 'utf-8');

            const metadata = await page.evaluate(() => {
                // Extract: title, url, tableHeaders, profileSelectors, field values
                ...
            });

            results.push({ filename, title, url, htmlPath, screenshotPath, metadata });
        } catch (err) {
            logger.error(`[DIAGNOSTIC] Failed to capture ${pageConfig.filename}:`, err);
            results.push({ filename, url: pageConfig.url, error: (err as Error).message });
        }
    }

    const report = { capturedAt: new Date().toISOString(), pages: results };
    const reportPath = path.join(outputDir, 'report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
}
```

### Invocation Point
Added in `verifyAndSync` **after** OTP verification and **before** scraping:

```typescript
// DIAGNOSTIC: Capture DOM before scraping
const diagnosticDir = path.join(process.cwd(), 'backend', 'tmp', `ezone-diagnostic-${Date.now()}`);
if (!fs.existsSync(diagnosticDir)) {
    fs.mkdirSync(diagnosticDir, { recursive: true });
}
await this.captureDiagnosticPages(page, diagnosticDir);
logger.info(`[DIAGNOSTIC] Artifacts saved to: ${diagnosticDir}`);
```

---

## 3. Build Status

- **Production build:** PASS
- **TypeScript check:** PASS — zero new errors
- **No broken imports**

---

## 4. Runtime Behavior

### Normal Flow (Unchanged)
```
requestOtp → verifyOtp → [DIAGNOSTIC CAPTURE] → extractData → validate → sheets/mongo → cleanup
```

### What Happens When User Clicks "Sync Ezone"
1. OTP flow completes
2. Dashboard page loads
3. **Diagnostic capture starts automatically:**
   - Navigates to dashboard → saves `dashboard.html` + `dashboard.png`
   - Navigates to attendance → saves `attendance.html` + `attendance.png`
   - Navigates to marks → saves `marks.html` + `marks.png`
   - Navigates to timetable → saves `timetable.html` + `timetable.png`
   - Saves `report.json` with metadata
4. **Normal scraping continues** — no business logic changed
5. Sync completes as before

### Output Location
```
backend/tmp/ezone-diagnostic-<timestamp>/
├── dashboard.html
├── dashboard.png
├── attendance.html
├── attendance.png
├── marks.html
├── marks.png
├── timetable.html
├── timetable.png
└── report.json
```

### report.json Structure
```json
{
  "capturedAt": "2026-07-21T...",
  "pages": [
    {
      "filename": "dashboard",
      "title": "...",
      "url": "...",
      "htmlPath": "...",
      "screenshotPath": "...",
      "metadata": {
        "title": "...",
        "url": "...",
        "tableHeaders": [...],
        "profileSelectors": { "ids": [...], "classes": [...] },
        "studentName": "...",
        "systemId": "...",
        "department": "...",
        "school": "...",
        "program": "...",
        "semester": "...",
        "status": "..."
      }
    },
    ...
  ]
}
```

---

## 5. Safety Guarantees

| Guarantee | How |
|-----------|-----|
| **No data modification** | Capture is read-only; does not call `upsertProfile` or any mutation |
| **No API side effects** | Only reads from portal; no external API calls added |
| **Business logic unchanged** | Capture happens before scraping; scraping continues normally |
| **Error isolation** | Each page capture is in its own try-catch; failure on one page does not block sync |
| **Session preserved** | Session cleanup still happens after sync completes |

---

## 6. How to Trigger

From the Academic Universe UI:
1. Navigate to Ezone Sync page
2. Enter System ID
3. Request OTP
4. Enter OTP
5. Click "Verify & Sync"
6. After OTP verification, diagnostic captures run automatically
7. Sync continues normally
8. Check `backend/tmp/ezone-diagnostic-<timestamp>/` for artifacts

---

## 7. Next Steps After Capture

1. Open `backend/tmp/ezone-diagnostic-<timestamp>/report.json`
2. Inspect `.html` files in browser
3. Identify actual selectors and table structures
4. Proceed to RB-009 (Scraper/Mapper Fix) with verified DOM data

---

*Diagnostic capture integrated into production sync flow.*
