# RB-009 — Integrate DOM Capture into Existing Ezone Sync: Implementation Report

**Date:** 2026-07-21  
**Status:** Complete  
**Scope:** Fixed diagnostic capture integration and production scraper URL discovery  
**Constraint:** No business logic changed. No separate diagnostic script needed.

---

## 1. Issues Addressed

| # | Issue | Fix |
|---|-------|-----|
| 1 | Attendance/marks pages returned 404 | Added URL discovery from dashboard navigation DOM |
| 2 | Metadata extraction crashed on null elements | Made all selector lookups null-safe |
| 3 | Output path resolved to `backend/backend/tmp/...` | Fixed path to `backend/tmp/...` |
| 4 | Hardcoded URLs in production scraper | Updated scraper to discover and use actual navigation URLs |

---

## 2. Changed Files

| File | Changes |
|------|---------|
| `backend/src/modules/ezone/services/ezoneSyncService.ts` | Fixed output path, added `discoverNavigationUrls()`, added `captureDiagnosticPages()`, integrated into `verifyAndSync` |
| `backend/src/modules/ezone/scrapers/ezone.scraper.ts` | Added `extractPageData()` helper, added URL discovery, multi-page extraction with merge, null-safe selectors |

---

## 3. Exact Changes

### 3.1 Output Path Fix

**Before:**
```typescript
const diagnosticDir = path.join(process.cwd(), 'backend', 'tmp', `ezone-diagnostic-${Date.now()}`);
```

**After:**
```typescript
const diagnosticDir = path.join(process.cwd(), 'tmp', `ezone-diagnostic-${Date.now()}`);
```

### 3.2 Null-Safe Selectors (Diagnostic + Scraper)

**Before:**
```typescript
const text = el.textContent?.trim().toUpperCase() || '';
```

**After:**
```typescript
const text = (el.textContent?.trim() || '').toUpperCase();
```

**Before:**
```typescript
if (target.nextElementSibling) return clean(target.nextElementSibling.textContent || 'N/A');
const parent = target.parentElement;
if (parent && parent.nextElementSibling) return clean(target.nextElementSibling.textContent || 'N/A');
```

**After:**
```typescript
const next = target.nextElementSibling;
if (next) return clean(next.textContent || 'N/A');
const parent = target.parentElement;
if (parent?.nextElementSibling) return clean(parent.nextElementSibling.textContent || 'N/A');
```

### 3.3 URL Discovery (Both Diagnostic and Scraper)

Added `discoverNavigationUrls()` in `ezoneSyncService.ts`:

```typescript
private async discoverNavigationUrls(page: any): Promise<Record<string, string>> {
    return await page.evaluate(() => {
        const urls: Record<string, string> = {};
        const keywords: Record<string, string[]> = {
            attendance: ['attendance', 'attend'],
            marks: ['marks', 'grade', 'result', 'ca marks'],
            timetable: ['timetable', 'schedule', 'time table'],
            subjects: ['subjects', 'course', 'syllabus']
        };

        document.querySelectorAll('a[href]').forEach((a) => {
            const href = (a as HTMLAnchorElement).href || '';
            const text = (a.textContent || '').trim().toLowerCase();

            for (const [key, terms] of Object.entries(keywords)) {
                if (terms.some(term => text.includes(term) || href.includes(term))) {
                    urls[key] = href;
                    break;
                }
            }
        });

        return urls;
    });
}
```

### 3.4 Multi-Page Extraction (Scraper)

Added `extractPageData()` helper and updated `extractData()` to:

1. Extract data from dashboard
2. Discover navigation URLs
3. Navigate to each discovered URL
4. Extract data from each page
5. Merge all data into one object
6. Navigate back to home

```typescript
private async extractPageData(page: Page): Promise<any> {
    return await page.evaluate(() => {
        // ... extraction logic (null-safe) ...
    });
}

async extractData(page: Page, ...): Promise<any> {
    // Navigate to home
    // Discover URLs
    // Extract from dashboard: mergedData = await this.extractPageData(page);
    // For each discovered URL:
    //   await page.goto(url);
    //   const pageData = await this.extractPageData(page);
    //   if (pageData[dataKey].length > 0) mergedData[dataKey] = pageData[dataKey];
    // Navigate back to home
    // Return mergedData
}
```

---

## 4. Build Status

- **Production build:** PASS
- **TypeScript check:** PASS — zero new errors
- **No broken imports**

---

## 5. Runtime Behavior

### Diagnostic Capture Flow

```
After OTP verification
  → Navigate to dashboard
  → Discover navigation URLs from dashboard DOM
  → Capture dashboard.html/png
  → Navigate to attendance (if URL discovered) → capture
  → Navigate to marks (if URL discovered) → capture
  → Navigate to timetable (if URL discovered) → capture
  → Save report.json
  → Continue normal sync
```

### Production Scraper Flow

```
Navigate to dashboard
  → Discover navigation URLs
  → Extract data from dashboard
  → Navigate to attendance → extract → merge
  → Navigate to marks → extract → merge
  → Navigate to timetable → extract → merge
  → Navigate back to home
  → Sanitize, validate, save to MongoDB
```

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

---

## 6. Safety Guarantees

| Guarantee | How |
|-----------|-----|
| **No data modification** | Capture is read-only |
| **No API side effects** | Only reads from portal |
| **Business logic unchanged** | Scraper still returns same data shape |
| **Error isolation** | Failed page captures don't block sync |
| **Null-safe** | All DOM accesses guarded against null |

---

## 7. What to Expect After This Fix

1. Click "Sync Ezone" in Academic Universe
2. Complete OTP verification
3. Diagnostic artifacts saved to `backend/tmp/ezone-diagnostic-<timestamp>/`
4. `report.json` contains discovered navigation URLs
5. Scraper uses discovered URLs instead of hardcoded 404 routes
6. No more `backend/backend/tmp/...` path duplication
7. No more crashes from null `textContent` access

---

*Fixes implemented. Ready for testing.*
