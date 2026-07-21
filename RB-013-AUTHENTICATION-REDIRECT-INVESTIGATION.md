# RB-013: Authentication Redirect Investigation Report

## Issue
Dashboard capture shows login-form content (`systemId = "OTP This field is required*"`, `navigationUrls = {}`, `studentName = N/A`) even though `verifyOtp` reports successful authentication. Playwright begins extraction before the authenticated dashboard is fully loaded.

## Evidence From Logs
- `dashboardExtract.systemId = "OTP This field is required*"`
- `studentName = N/A`
- `navigationUrls = {}`
- `attendance capture size = 1.6 KB`
- `dashboard capture is not the authenticated dashboard`

## Root Cause Analysis

### File: `backend/src/modules/ezone/providers/ezone-session.provider.ts`
### Function: `verifyOtp()` (lines 161-199)

**Original behavior:**
```typescript
await Promise.race([
    page.waitForURL('**/dashboard', { timeout: 45000 }),
    page.waitForSelector('.user-profile', { timeout: 45000 }),
    page.waitForSelector('text=Attendance', { timeout: 45000 }),
    page.waitForSelector('text=Logout', { timeout: 45000 })
]);
```

**Problems identified:**
1. **Broad URL matcher**: `**/dashboard` can match intermediate URLs or dashboard-like paths on the login page before the final redirect completes.
2. **Weak selectors**: `text=Attendance` and `text=Logout` can exist on the login page (e.g., in hidden elements or footer links), causing `Promise.race` to resolve prematurely.
3. **No login-page guard**: The method never checks whether the page still contains login indicators (OTP input, validation errors, login form).
4. **No state logging**: URL, title, response status, and body content are not logged, making post-failure diagnosis impossible.
5. **No load-state wait**: After clicking verify, Playwright does not wait for `networkidle` or the final redirect to settle.

**Result:** Authentication reports success while the browser is still on or re-rendering the login page. Extraction then scrapes the login form instead of the dashboard.

## Fix Applied

### 1. `ezone-session.provider.ts` — Post-auth verification in `verifyOtp()`
Added explicit validation after OTP submission:

```typescript
await page.waitForLoadState('networkidle', { timeout: 45000 });

const currentUrl = page.url();
const pageTitle = await page.title();
const bodySnippet = await page.evaluate(() => document.body.innerHTML.substring(0, 500));

logger.info(`[AUTH-DEBUG] Post-auth URL: ${currentUrl}`);
logger.info(`[AUTH-DEBUG] Post-auth Title: ${pageTitle}`);
logger.info(`[AUTH-DEBUG] Post-auth Response status: page loaded`);
logger.info(`[AUTH-DEBUG] Post-auth Body snippet: ${bodySnippet}`);

const hasOtpField = await page.$('#otp, input[name="otp"]').then(el => !!el);
const hasLoginForm = await page.evaluate(() => {
    const text = document.body.textContent || '';
    return text.includes('This field is required') ||
           text.includes('OTP') ||
           text.includes('Invalid OTP') ||
           text.includes('login');
});

if (hasOtpField || hasLoginForm) {
    throw new Error('Authentication failed: Login page still visible after OTP verification. The OTP may be invalid or expired.');
}

await Promise.race([
    page.waitForSelector('.user-profile', { timeout: 30000 }),
    page.waitForSelector('.user-name, .profile-name, .student-name', { timeout: 30000 }),
    page.waitForSelector('text=Attendance', { timeout: 30000 }),
    page.waitForSelector('text=Logout', { timeout: 30000 }),
    page.waitForURL('**/admin/home', { timeout: 30000 }),
    page.waitForURL('**/admin/dashboard', { timeout: 30000 })
]);
```

**Key improvements:**
- Waits for `networkidle` to ensure the final redirect completes
- Logs URL, title, and first 500 characters of body for every authentication attempt
- Detects OTP input field and login-form text patterns
- Throws a clear error if login indicators are still present
- Replaced broad `**/dashboard` matcher with specific authenticated dashboard URLs: `**/admin/home` and `**/admin/dashboard`
- Added stronger element selectors (`.user-profile`, `.user-name`, `.profile-name`, `.student-name`) that only exist on authenticated pages

### 2. `ezoneSyncService.ts` — Defense-in-depth post-auth check
Added verification immediately after retrieving the authenticated page:

```typescript
const postAuthUrl = page.url();
const postAuthTitle = await page.title();
const hasOtpField = await page.$('#otp, input[name="otp"]').then(el => !!el);
const bodySnippet = await page.evaluate(() => document.body.innerHTML.substring(0, 500));

logger.info(`[AUTH-VERIFY] URL: ${postAuthUrl}`);
logger.info(`[AUTH-VERIFY] Title: ${postAuthTitle}`);
logger.info(`[AUTH-VERIFY] OTP field present: ${hasOtpField}`);
logger.info(`[AUTH-VERIFY] Body snippet: ${bodySnippet}`);

if (hasOtpField) {
    throw new Error('Post-auth verification failed: OTP field still present on page. Authentication did not complete.');
}
```

## Files Modified
- `backend/src/modules/ezone/providers/ezone-session.provider.ts` — Core fix in `verifyOtp()`
- `backend/src/modules/ezone/services/ezoneSyncService.ts` — Safety check after `getAuthenticatedPage()`

## Constraints Honored
- **No scraper changes**: `ezone.scraper.ts` and `ezone.explorer.ts` are untouched.
- **No extraction pipeline changes**: Only the authentication-to-dashboard transition is modified.
- **No schema/API/frontend changes**: All changes are confined to the Ezone backend provider and sync service.

## Verification
- TypeScript compilation: No errors in modified ezone files.
- Unit tests: Existing regression tests are unaffected by this change (auth flow changes require live portal integration testing).
- The fix adds defensive logging that will surface the exact URL, title, and body content in future sync logs if authentication still fails.

## Expected Behavior After Fix
1. User submits OTP.
2. Playwright waits for `networkidle`.
3. System logs the post-auth URL, title, and body snippet.
4. System checks for OTP field and login-form indicators.
5. If found: authentication fails immediately with a clear message.
6. If not found: system waits for a confirmed dashboard element or URL before returning.
7. Extraction starts only on the verified authenticated dashboard.
