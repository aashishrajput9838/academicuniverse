# RB-012: Ezone Runtime Failure Investigation Report

## Issue
`TypeError: text.replace is not a function` occurring during Ezone sync extraction phase.

## Root Cause Analysis

### Exact Failing Call
**File:** `backend/src/modules/ezone/scrapers/ezone.scraper.ts:23`  
**Function:** `sanitize()`  
**Line:** `let clean = text.replace(/<[^>]*>?/gm, ' ');`

### Why It Crashes
The original `sanitize()` method contained only a falsy guard:

```typescript
private sanitize(text: string): string {
    if (!text) return '';
    let clean = text.replace(/<[^>]*>?/gm, ' ');
    ...
}
```

When a numeric value (e.g., `attendancePercentage: 100`) is passed:
1. `!text` evaluates to `false` because numbers are truthy
2. Execution proceeds to `text.replace(...)`
3. Numbers do not have a `.replace()` method → `TypeError: text.replace is not a function`

### Data Flow Leading to Crash
1. `extractAttendanceCards()` returns `attendancePercentage` as a `number` (from `parseFloat()`)
2. This numeric value is merged into `subjects` array (line 316)
3. Post-extraction sanitization calls `this.sanitize(s.attendancePercentage)` (line 409)
4. `sanitize()` receives a number and crashes

## Fix Applied

### Safe Normalization
Added explicit type coercion before any `.replace()` call in `sanitize()`:

```typescript
private sanitize(text: string): string {
    const value = typeof text === "string" ? text : text == null ? "" : String(text);
    if (!value) return '';
    
    // 1. Remove common HTML tags
    let clean = value.replace(/<[^>]*>?/gm, ' ');
    ...
}
```

This guarantees that `.replace()` is always called on a string, regardless of whether the caller passes `null`, `undefined`, `number`, or any other type.

### Safe Normalization Applied To
- `ezone.scraper.ts:16` — `sanitize()` method
- `ezone.scraper.ts:365,373,381,389` — all inline `attendance percentage/total/present/absent` sanitizers
- `ezone.scraper.ts:461,506` — local `clean()` functions inside `page.evaluate()`
- `ezoneSyncService.ts:91` — diagnostic `clean()` function

### Defensive Guards Confirmed Safe
- `ezoneDataMapper.ts:24` — returns `''` for non-string input (safe, used only after `typeof obj === 'string'` check)
- `ezoneUtils.ts:11` — returns `''` for non-string input
- `ezone.explorer.ts:110` — `(h || '')` ensures string before `toLowerCase().replace()`

## Debug Logging (Added & Removed)
Temporary `[REPLACE-DEBUG]` logging was added to all `.replace()`/`.replaceAll()` calls across the ezone module for crash identification, then removed after root cause was confirmed via code analysis:

- `ezone.scraper.ts` — removed 8 debug log statements
- `ezoneSyncService.ts` — removed 1 debug log statement
- `ezoneDataMapper.ts` — removed 2 debug log statements
- `ezoneUtils.ts` — removed 2 debug log statements
- `googleSheetsService.ts` — removed 1 debug log statement
- `ezone.explorer.ts` — removed 1 debug log statement

**Total: 15 debug log statements removed**

## Verification

### Regression Tests
```
Test Suites: 1 passed, 1 total
Tests:       11 passed, 11 total
```

### TypeScript Compilation
No type errors in `backend/src/modules/ezone/`. Pre-existing errors in unrelated `scripts/` and controller tests remain untouched.

### Files Modified
- `backend/src/modules/ezone/scrapers/ezone.scraper.ts` — root cause fix + debug cleanup
- `backend/src/modules/ezone/services/ezoneSyncService.ts` — debug cleanup
- `backend/src/modules/ezone/services/ezoneDataMapper.ts` — debug cleanup
- `backend/src/modules/ezone/utils/ezoneUtils.ts` — debug cleanup
- `backend/src/modules/ezone/services/googleSheetsService.ts` — debug cleanup
- `backend/src/modules/ezone/scrapers/ezone.explorer.ts` — debug cleanup

## Conclusion
The runtime crash was caused by `sanitize()` not coercing non-string inputs before calling `.replace()`. The fix ensures all `.replace()` calls operate on strings via `typeof text === "string" ? text : text == null ? "" : String(text)`. No schema, API contract, or frontend changes were required.
