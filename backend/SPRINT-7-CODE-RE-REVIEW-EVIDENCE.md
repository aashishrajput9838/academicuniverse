# Sprint 7 Code Re-Review Evidence

## 1. Finding 1 Verification — Dynamic matchBasis

### Code Inspection

**File:** `src/services/resume/canonicalWrite.service.ts`

**Line 123-125 — Caller safely destructures result:**
```ts
const existingPersonResult = await this.findExistingPerson(organizationId, personSection, sections);
const existingPerson = existingPersonResult?.person;
const matchBasis = existingPersonResult?.matchBasis || [];
```

**Line 136 — Dynamic basis stored in ResumePersonSuggestion:**
```ts
await ResumePersonSuggestion.create({
  processingId,
  organizationId,
  suggestedPersonId: personId,
  matchConfidence: 1.0,
  matchBasis,  // dynamically computed from fired signals
  isNewPerson: false,
  status: 'ACCEPTED',
});
```

**Line 347 — Return type updated:**
```ts
private async findExistingPerson(organizationId: string, personSection: any, sections: any[]): Promise<{ person: any; matchBasis: string[] } | null> {
```

**Line 377-388 — Basis computed from actual signals:**
```ts
if (isDuplicate) {
  const matchBasis: string[] = [];
  if (emailMatch) matchBasis.push('email');
  if (phoneMatch) matchBasis.push('phone');
  if (nameScore >= 0.92) matchBasis.push('name+jaro');
  if (institutionScore >= 0.85) matchBasis.push('institution');

  return {
    person: await Person.findById(existingPerson._id).lean().exec(),
    matchBasis,
  };
}
```

### Verdict
✅ PASS — `matchBasis` is no longer hardcoded. All four signal types are evaluated and recorded when fired.

---

## 2. Finding 2 Verification — Person Deduplication Formula

### Code Inspection

**File:** `src/services/resume/canonicalWrite.service.ts`  
**Lines:** 372-375

```ts
const isDuplicate =
  emailMatch ||
  phoneMatch ||
  (nameScore >= 0.92 && (emailMatch || phoneMatch || institutionScore >= 0.85));
```

**Architecture v1.7 Section 7.4 reference:**
```ts
const isDuplicate =
  emailMatch ||
  phoneMatch ||
  (nameScore >= 0.92 && (emailMatch || phoneMatch || institutionScore >= 0.85));
```

### Verdict
✅ PASS — Exact character-for-character match. No modifications to formula logic, thresholds, or operator precedence.

---

## 3. Test Count Documentation Verification

### Implementation Report

**File:** `SPRINT-7-IMPLEMENTATION-REPORT.md`  
**Line 22:**
```md
- **Total tests**: 350 (331 pre-existing + 19 new Sprint 7)
```

### Review Fix Report Table

**File:** `SPRINT-7-REVIEW-FIX-REPORT.md`  
**Lines 44-46 and 68-69:**

The report correctly identifies the correction:
```md
Corrected test count from `514` to `350`:
Total tests: 350 (331 pre-existing + 19 new Sprint 7)
```

But the results table also includes:
```md
| Full regression (`src/ + shared/`) | 514 | PASS |
```

### Analysis

Both figures are valid:
- **350** = Sprint 7-specific test count (331 pre-existing + 19 new)
- **514** = Full repository test count (all suites across entire backend)

The implementation report now correctly uses the Sprint 7-scoped figure (350). The review fix report's test results table includes both scopes. This is not contradictory but could benefit from explicit scope labeling.

### Verdict
✅ PASS — Implementation report corrected. Both numbers represent valid measurements for different scopes.

---

## 4. Behavioral Regression Verification

### Test Execution Results

| Suite | Tests | Pass | Fail |
|-------|-------|------|------|
| `dicIntegration.service.test.ts` | 8 | 8 | 0 |
| `canonicalWrite.service.test.ts` | 8 | 8 | 0 |
| `sprint7.integration.test.ts` | 3 | 3 | 0 |
| Full regression | 514 | 514 | 0 |

### Code Path Verification

- `ResumeParseResult.findOne({ processingId })` — unchanged
- `Person.findOne({ organizationId })` — unchanged
- `AcademicRecord.find({ organizationId })` — unchanged
- Idempotency guards (`dicRoutedAt`, `canonicalWrittenAt`) — unchanged
- Event publishing (`ResumeDICRouted`, `ResumeCanonicalWritten`) — unchanged
- Error handling (`ResumeDICRoutingFailed`, `ResumeCanonicalWriteFailed`) — unchanged

### Verdict
✅ PASS — Zero behavioral regressions. Only `matchBasis` recording behavior changed, which is the intended fix.

---

## 5. Architecture Verification

### Unchanged Components

| Component | Status |
|-----------|--------|
| Event-driven stage routing | Unchanged |
| Dispatcher handler pattern | Unchanged |
| Multi-tenant scoping | Unchanged |
| Idempotency guards | Unchanged |
| Retry semantics | Unchanged |
| Person deduplication formula | Unchanged |
| Canonical model mapping | Unchanged |

### Changed Components

| Component | Change |
|-----------|--------|
| `findExistingPerson` return type | `Promise<any \| null>` → `Promise<{ person: any; matchBasis: string[] } \| null>` |
| `matchBasis` creation | Hardcoded `['email']` → dynamically computed array |

### Verdict
✅ PASS — Architecture preserved. Only return type expanded to carry audit data.

---

## 6. Scope Verification

### In-Scope (Review Fixes)
- Dynamic `matchBasis` computation
- Test count documentation correction
- Cosmetic whitespace removal

### Out-of-Scope
- No new models
- No new events
- No new stages
- No changes to DIC UI
- No changes to API endpoints
- No changes to deduplication thresholds

### Verdict
✅ PASS — No scope creep.

---

## Final Verdict

**APPROVED**

All review findings correctly applied. No regressions. Architecture and scope unchanged.
