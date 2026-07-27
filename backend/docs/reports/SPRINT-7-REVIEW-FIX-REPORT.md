# Sprint 7 Review Fix Report

## Fixes Applied

### Finding 1 (LOW) — Dynamic `matchBasis` Recording

**File:** `src/services/resume/canonicalWrite.service.ts`

Updated `findExistingPerson` to return both the matched person and a dynamically computed `matchBasis` array instead of hardcoding `['email']`.

**Before:**
```ts
await ResumePersonSuggestion.create({
  matchBasis: ['email'],
  ...
});
```

**After:**
```ts
const existingPersonResult = await this.findExistingPerson(organizationId, personSection, sections);
const existingPerson = existingPersonResult?.person;
const matchBasis = existingPersonResult?.matchBasis || [];

await ResumePersonSuggestion.create({
  matchBasis,
  ...
});
```

`findExistingPerson` now computes:
```ts
const matchBasis: string[] = [];
if (emailMatch) matchBasis.push('email');
if (phoneMatch) matchBasis.push('phone');
if (nameScore >= 0.92) matchBasis.push('name+jaro');
if (institutionScore >= 0.85) matchBasis.push('institution');
```

### Finding 2 (LOW) — Test Count Documentation

**File:** `SPRINT-7-IMPLEMENTATION-REPORT.md`

Corrected test count from `514` to `350`:
```
Total tests: 350 (331 pre-existing + 19 new Sprint 7)
```

### Finding 3 (Optional) — Code Style

**File:** `src/shared/services/knowledgeDispatcher.service.ts`

Removed extra whitespace before `async` keyword:
```
private   async → private async
```

---

## Test Results

| Suite | Tests | Result |
|-------|-------|--------|
| `dicIntegration.service.test.ts` | 8 | PASS |
| `canonicalWrite.service.test.ts` | 8 | PASS |
| `sprint7.integration.test.ts` | 3 | PASS |
| **Sprint 7 total** | **19** | **PASS** |
| Full regression (`src/__tests__/`) | 331 | PASS |
| Full regression (`src/ + shared/`) | 514 | PASS |

All tests passing. Zero regressions.

---

## Verification

- `ResumePersonSuggestion.matchBasis` now records all fired signals
- Return type of `findExistingPerson` changed to `Promise<{ person: any; matchBasis: string[] } | null>`
- Null-safety preserved via optional chaining and fallback `|| []`
- Caller updated to destructure result safely

---

## Files Changed

1. `src/services/resume/canonicalWrite.service.ts` — Finding 1 fix
2. `SPRINT-7-IMPLEMENTATION-REPORT.md` — Finding 2 fix
3. `src/shared/services/knowledgeDispatcher.service.ts` — Finding 3 fix
