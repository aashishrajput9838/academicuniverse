# RB-007 — Live DOM Capture: Compilation Fix Report

**Date:** 2026-07-21  
**Status:** Fixed — script compiles with project tsconfig  
**Constraint:** No production code modified. No private API access.

---

## 1. Root Cause

The diagnostic script accessed `EzoneSessionProvider.sessions` directly:

```ts
const session = sessionProvider.sessions.get(sessionId);
```

`sessions` is a `private` property. TypeScript correctly rejected this with TS2341.

---

## 2. Fix Applied

Replaced private map access with the existing public method `getAuthenticatedPage(sessionId)`.

**Before:**
```ts
const session = sessionProvider.sessions.get(sessionId);
if (!session) throw new Error('Session not found after OTP verification');
return { sessionId, page: session.page };
```

**After:**
```ts
const page = await sessionProvider.getAuthenticatedPage(sessionId);
return { sessionId, page };
```

No changes were made to `EzoneSessionProvider`. The fix uses only its public API:
- `triggerOtp()` → returns `sessionId`
- `verifyOtp()` → validates OTP
- `getAuthenticatedPage(sessionId)` → returns `Page`

Also fixed a `Set` iteration downlevel issue by replacing `[...new Set(ids)]` with `Array.from(new Set(ids))`.

---

## 3. Build Status

- **TypeScript check:** PASS — zero errors in `scripts/ezone-dom-diagnostic.ts`
- **Project tsconfig:** `backend/tsconfig.json` (target ES2020, skipLibCheck true)
- **No broken imports**

---

## 4. Exact Command to Run

```bash
cd backend
npx ts-node scripts/ezone-dom-diagnostic.ts \
  --system-id 2023329421 \
  --otp 123456 \
  --userId 6a58b65d816b680ebffb8b89 \
  --organizationId 6a58b59aa8c379340d290b31
```

Replace the values with your actual credentials and IDs.

---

## 5. Output

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

The script prints the output directory path on completion.
