# RB-007 — Live DOM Capture & Scraper Fix: Diagnostic Script Report

**Date:** 2026-07-21  
**Status:** Diagnostic script delivered — awaiting local execution  
**Scope:** Reusable Playwright diagnostic script for Ezone DOM capture  
**Constraint:** No production code modified. No application data modified.

---

## 1. Deliverable

**File:** `backend/scripts/ezone-dom-diagnostic.ts`

A standalone, executable diagnostic script that captures live Ezone portal pages for scraper analysis.

---

## 2. Usage

### Option A — Reuse existing authenticated session
```bash
npx ts-node backend/scripts/ezone-dom-diagnostic.ts --session-id <existing-session-id>
```

### Option B — Fresh OTP flow (full authentication)
```bash
npx ts-node backend/scripts/ezone-dom-diagnostic.ts \
  --system-id <systemId> \
  --otp <otp> \
  --userId <userId> \
  --organizationId <organizationId> \
  --firebaseUid <firebaseUid>   # optional
```

---

## 3. What the Script Does

1. **Authenticates** (or reuses session) via existing `EzoneSessionProvider`
2. **Navigates** to 4 pages:
   - `/admin/home` (dashboard)
   - `/admin/attendance`
   - `/admin/marks`
   - `/admin/timetable`
3. **Captures** for each page:
   - Full HTML → `<page>.html`
   - Full-page screenshot → `<page>.png`
4. **Extracts metadata**:
   - `document.title`
   - Current URL
   - All table headers found
   - All IDs and class names related to: student profile, system ID, department, semester, program, school
   - Label-based values for: studentName, systemId, department, school, program, semester, status
5. **Saves** `report.json` with all captured data
6. **Prints** output directory path
7. **Preserves session** for manual inspection (does not auto-cleanup)

---

## 4. Output Files

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

### report.json structure
```json
{
  "sessionId": "<session-id>",
  "outputDir": "backend/tmp/ezone-diagnostic-<timestamp>",
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

## 5. Key Implementation Details

| Aspect | Detail |
|--------|--------|
| **Session source** | `EzoneSessionProvider.getInstance()` — reuses production singleton |
| **No production code changes** | Script is standalone; imports existing classes |
| **No data modification** | Read-only capture; does not call `upsertProfile` or modify DB |
| **Error handling** | Each page capture is independent; failure on one page does not block others |
| **Cleanup** | Session is NOT auto-cleaned up to allow manual inspection |
| **Dependencies** | Uses existing Playwright, EzoneScraper, and EzoneSessionProvider |

---

## 6. How to Run

```bash
# From project root:
cd backend
npx ts-node scripts/ezone-dom-diagnostic.ts --session-id <sessionId>
```

**Prerequisites:**
- Node.js environment with dependencies installed
- Playwright browsers installed (`npx playwright install chromium`)
- For fresh auth: valid systemId and OTP
- For session reuse: active session ID from previous sync

---

## 7. What to Do After Capture

1. Run the script and capture all 4 pages
2. Open `report.json` to see extracted metadata
3. Open `.html` files in a browser to inspect actual DOM structure
4. Open `.png` files to visually verify page rendering
5. Identify actual:
   - CSS selectors for studentName, systemId, department, etc.
   - Table headers and column order for subjects, CA marks, timetable, holidays
6. Share captured HTML with the development team for scraper/mapper fixes

---

## 8. Safety Guarantees

- **No database writes** — script does not call `upsertProfile` or any mutation
- **No API side effects** — script reads from portal only
- **No production code modified** — script is in `backend/scripts/`
- **No secrets logged** — script does not log credentials
- **Session preserved** — manual cleanup required; no forced session destruction

---

## 9. Next Steps After Execution

1. Execute the script locally
2. Inspect captured HTML files
3. Identify actual selectors and column indices
4. Proceed to RB-008 (Scraper/Mapper Implementation) with verified selectors

---

*Script delivered. Awaiting local execution results.*
