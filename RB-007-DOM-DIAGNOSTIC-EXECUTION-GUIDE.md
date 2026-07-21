# RB-007 — Live DOM Capture: Exact Execution Guide

**Date:** 2026-07-21  
**Status:** Script ready — awaiting local execution  
**Constraint:** No production code modified. No application data modified.

---

## 1. Prerequisites

Before running the script, gather these **4 required values**:

| Parameter | What it is | Where to find it |
|-----------|-----------|------------------|
| `--system-id` | Your Sharda University student system ID (numeric) | Your student ID card / Ezone login credentials |
| `--otp` | OTP sent to your registered email/phone | Request OTP at `https://student.sharda.ac.in/admin` |
| `--userId` | Your user ID in this app's database | See instructions below |
| `--organizationId` | Your organization ID in this app's database | See instructions below |

---

## 2. How to Find userId and organizationId

### Option A — From the browser (if already logged in)

1. Open browser DevTools → Application → Local Storage
2. Find the auth token (usually stored by your app)
3. Decode the JWT at https://jwt.io
4. The payload contains:
   - `userId`: your user ID
   - `organizationId`: your organization ID

### Option B — From MongoDB directly

```bash
# Connect to your MongoDB and run:
mongosh academic_universe --eval "db.users.find({email: 'your-email@ug.sharda.ac.in'}, {name: 1, email: 1, organizationId: 1}).pretty()"
```

This returns your `_id` (userId) and `organizationId`.

### Option C — From the seed file (for test accounts)

Open `backend/scripts/seed.ts` and look for your test user:

```typescript
{
  name: 'Aashish Rajput',
  email: '2023329421.aashish@ug.sharda.ac.in',
  password: '...',
  role: 'STUDENT'
}
```

The corresponding `userId` and `organizationId` are in your MongoDB `users` collection.

---

## 3. How to Get an OTP

1. Open `https://student.sharda.ac.in/admin` in your browser
2. Enter your System ID
3. Click the "OTP" button (email or phone)
4. Check your registered email/phone for the OTP
5. Use that OTP value in the script command

---

## 4. Exact Command to Run

Replace the values after `=` with your actual values.

```bash
cd backend
npx ts-node scripts/ezone-dom-diagnostic.ts \
  --system-id 2023329421 \
  --otp 123456 \
  --userId 6a58b65d816b680ebffb8b89 \
  --organizationId 6a58b59aa8c379340d290b31
```

### Concrete example based on seed data

If you're using the test account from `seed.ts`:
- System ID: `2023329421` (the numeric part of the email)
- OTP: `123456` (the seed password, or the OTP you receive)
- userId: `6a58b65d816b680ebffb8b89` (Aashish Rajput's user ID in the DB)
- organizationId: `6a58b59aa8c379340d290b31` (Sharda University org ID)

**Note:** The userId and organizationId above are from the existing test database. If your database was seeded with different values, use your actual IDs from MongoDB.

---

## 5. What the Script Does

1. Launches Playwright browser (headless Chromium)
2. Navigates to `https://student.sharda.ac.in/admin`
3. Enters your System ID
4. Triggers OTP (you must have already requested it)
5. Enters OTP and submits
6. Waits for dashboard to load
7. Captures 4 pages: dashboard, attendance, marks, timetable
8. For each page: saves HTML + PNG + metadata
9. Saves `report.json` with all extracted selectors and table headers
10. Prints the output directory path

---

## 6. Output

After successful execution, you'll see:

```
=== Ezone DOM Diagnostic Summary ===
Session ID: <generated-session-id>
Output: C:\github\academicuniverse.com\academicuniverse\backend\tmp\ezone-diagnostic-2026-07-21T21-05-56-000Z
  dashboard: OK (45.2 KB)
  attendance: OK (32.1 KB)
  marks: OK (28.7 KB)
  timetable: OK (19.3 KB)
```

Open the output directory to inspect:
- `.html` files — full page source
- `.png` files — screenshots
- `report.json` — extracted metadata, table headers, selectors

---

## 7. Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| `Missing required arguments` | Didn't pass all 4 required flags | Check command syntax |
| `System ID field is required` | System ID not entered correctly | Verify system ID format (numeric) |
| `OTP input field did not appear` | OTP not triggered or wrong OTP | Request new OTP, verify within timeout |
| `Session expired or not found` | OTP verification failed | Restart with fresh OTP |
| Page timeout | Slow network or portal down | Increase timeout in script (currently 60s) |

---

## 8. Session Reuse Removed

The script no longer supports `--session-id`. It always performs a fresh OTP flow. This ensures consistent, reproducible captures and avoids stale session issues.

---

*Script updated. Run the command above with your actual values.*
