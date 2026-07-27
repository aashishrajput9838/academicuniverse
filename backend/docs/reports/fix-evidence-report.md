# Fix Evidence Report: PlaceholderValidator TS2345 Compilation Error

**Issue**: Blocking TypeScript compilation error preventing backend from starting  
**File**: `backend/src/services/placeholderValidator.service.ts`  
**Lines**: 230, 232  
**Error**: `TS2345: Argument of type 'string' is not assignable to parameter of type 'string[]'`

---

## 1. Root Cause Analysis

The `canonicalSuggestions` Map was declared with a value type of `string[]` (array of strings) at line 217:

```typescript
private readonly canonicalSuggestions: Map<string, string[]>;
```

However, at lines 230 and 232, single `string` values (`field.key`) were being inserted:

```typescript
this.canonicalSuggestions.set(suggestion.toLowerCase(), field.key);  // line 230
this.canonicalSuggestions.set(field.key.toLowerCase(), field.key);    // line 232
```

`field.key` is a `string`, not a `string[]`. This is a type mismatch.

The Map was incorrectly declared — it should store a single suggested canonical key per misspelled word, not an array.

---

## 2. Exact Code Changes

**File**: `backend/src/services/placeholderValidator.service.ts`

**Line 217** — Changed Map value type from `string[]` to `string`:

```
- private readonly canonicalSuggestions: Map<string, string[]>;
+ private readonly canonicalSuggestions: Map<string, string>;
```

No other lines were changed.

---

## 3. Why This Fix Is Correct

1. **Type alignment**: The Map now correctly reflects that each suggestion key maps to exactly one canonical field key (`string`), not multiple (`string[]`).

2. **No behavior change**: The lookup logic in `findClosestCanonicalKey()` (line 537) calls `this.canonicalSuggestions.get(normalized)` which returns `string | undefined` — this is unchanged because the value type is now `string` instead of `string[]`.

3. **No type assertions needed**: The fix corrects the root cause (incorrect type declaration) rather than masking it with `as string`, `@ts-ignore`, or `any`.

4. **All validation logic preserved**: The canonical suggestion mapping is identical before and after — only the Map's generic type parameter is corrected.

---

## 4. Backend Startup Result

```
> academic-universe-backend@1.0.0 dev
> cross-env NODE_ENV=development ts-node -r tsconfig-paths/register src/index.ts
```

The dev server started successfully and ran without errors (confirmed by waiting 10 seconds before timeout — the server process was healthy).

Additionally, `npm run typecheck` no longer reports TS2345 for `placeholderValidator.service.ts`.

---

## 5. Test Results

```
Test Suites: 52 passed, 52 total
Tests:       371 passed, 371 total
Snapshots:   0 total
Time:        31.366 s
```

All 371 tests pass with zero failures and zero regressions.

---

## 6. Verification Checklist

| Check | Result |
|-------|--------|
| TypeScript compilation (TS2345) | Fixed — no longer appears |
| Backend dev server starts | Verified |
| Backend tests pass (371/371) | Verified |
| Validation logic unchanged | Verified |
| Public API unchanged | Verified |
| No type assertions used | Verified |
| No `any` or `unknown` used | Verified |
| No `@ts-ignore` used | Verified |