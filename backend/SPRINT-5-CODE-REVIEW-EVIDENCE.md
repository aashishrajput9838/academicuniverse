# Sprint 5 Code Review — Evidence Report
## Resume Parser — ResumeAIEnhancer (Stage 3)

**Date:** 2026-07-25  
**Reviewer:** Kilo  
**Scope:** Sprint 5 implementation code review evidence  
**Baseline:** `SPRINT-5-CODE-REVIEW.md`

---

## Evidence 1: normalizedSkills Counter Bug (MEDIUM)

### Finding
`normalizedSkills` increments by total skill entity count, not actual normalized count.

### Code Evidence

**File:** `src/shared/services/knowledgeDispatcher.service.ts`

```typescript
const skillEntities = result.entities.filter((e: any) => e.type === 'skill');
const normalizedSkillCount = (existing as any)?.normalizedSkills || 0;

await ResumeParseResult.findOneAndUpdate(
  { processingId },
  {
    $set: {
      ...
      normalizedSkills: normalizedSkillCount + skillEntities.length,
      ...
    },
  },
  { upsert: false }
);
```

### Issue
`s skillEntities.length` is the total number of skill entities in the result, not the number of skills that went through normalization or enhancement. If a resume has 20 skills and none needed normalization, `normalizedSkills` still increments by 20.

### Impact
Downstream consumers expecting `normalizedSkills` to mean "skills that were normalized/enhanced" will receive inflated counts.

### Recommendation
Replace `skillEntities.length` with the actual normalized/enhanced skill count:
```typescript
normalizedSkills: normalizedSkillCount + result.improvements.fieldsNormalized,
```
Or filter to only skills where data changed:
```typescript
const normalizedSkills = result.entities.filter((e: any) => {
  const original = (existing as any)?.rawCandidateFields?.entities?.find((orig: any) => orig.type === 'skill' && orig.data?.name === e.data?.name);
  return original && JSON.stringify(original.data) !== JSON.stringify(e.data);
}).length;
```

**Verdict:** ✅ CONFIRMED — must fix before merge

---

## Evidence 2: Implementation Report Test Count Mismatch (LOW)

### Finding
Implementation Report states "12 unit tests" but actual count is 21.

### Evidence

**`SPRINT-5-IMPLEMENTATION-REPORT.md` line 29:**
```
| 12 unit tests | ✅ 12 tests |
```

**`SPRINT-5-IMPLEMENTATION-REPORT.md` line 40:**
```
| `src/__tests__/resumeAIEnhancer.service.test.ts` | Unit tests (12) |
```

**Actual test count in `resumeAIEnhancer.service.test.ts`:**
- Person normalization: 1 test
- Experience date normalization: 1 test
- Education degree expansion: 1 test
- Skill name normalization: 1 test
- Project name normalization: 1 test
- Certification title/issuer: 1 test
- Achievement title: 1 test
- Language/proficiency: 1 test
- AI fallback trigger: 1 test
- Malformed AI response: 1 test
- Missing critical fields: 1 test
- Idempotency: 1 test
- No entities error: 1 test
- AI provider throws: 1 test
- Improvements metadata: 1 test
- Invalid email trigger: 1 test
- Invalid date trigger: 1 test
- GPA normalization: 1 test
- Strategy ai-only: 1 test
- Strategy normalized+ai: 1 test
- Strategy normalized: 1 test

**Total: 21 tests**

### Impact
Documentation inconsistency affects artifact verification in completion reports.

### Recommendation
Update report to reflect actual test count.

**Verdict:** ✅ CONFIRMED — recommended fix

---

## Evidence 3: Date Normalization Regex Ambiguity (LOW)

### Finding
`normalizeDate` can produce invalid ISO dates for DD-MM-YYYY formats where first part > 12.

### Code Evidence

**File:** `src/services/resume/resumeAIEnhancer.service.ts` lines 513-522

```typescript
private normalizeDate(dateStr: string): string {
    if (!dateStr || dateStr === 'Present' || dateStr === 'present') return dateStr;
    const isoMatch = dateStr.match(/^(\d{4}-\d{2}-\d{2})$/);
    if (isoMatch) return isoMatch[1];
    const parts = dateStr.match(/(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/);
    if (parts) {
      const [, m, d, y] = parts;
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    return dateStr;
  }
```

### Test Case
- Input: "31-12-2021"
- Match: m="31", d="12", y="2021"
- Output: "2021-31-12" (invalid ISO, month 31 does not exist)

### Existing Stage 2 Pattern
`ResumeEntityExtractor` in Sprint 4 uses similar regex patterns. This is an existing pattern in the codebase, not a Sprint 5 regression.

### Recovery Mechanism
`isInvalidDate("2021-31-12")` returns `true` (Date.parse returns NaN), triggering AI fallback in `needsAiEnhancement`. The resume still processes correctly; invalid dates are recovered via AI.

### Impact
Minor performance cost for ambiguous dates; no data loss.

### Recommendation
Add month/day swap guard:
```typescript
if (parts) {
  let [, m, d, y] = parts;
  const month = parseInt(m, 10);
  const day = parseInt(d, 10);
  if (month > 12 && day <= 12) {
    [m, d] = [d, m];
  }
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}
```

**Verdict:** ✅ CONFIRMED — not blocking, but recommended

---

## Evidence 4: Error Classification Gap (LOW)

### Finding
Dispatcher catch block does not classify JSON parse failures from AI as `malformed_response`.

### Code Evidence

**File:** `src/shared/services/knowledgeDispatcher.service.ts`

```typescript
} catch (err: any) {
  let reason: 'no_entities' | 'ai_exhausted' | 'malformed_response' | 'unknown' = 'unknown';
  const message = err.message || '';
  if (message === 'no_entities') {
    reason = 'no_entities';
  } else if (message.includes('AI') || message.includes('quota') || message.includes('rate limit')) {
    reason = 'ai_exhausted';
  } else if (message.includes('JSON') || message.includes('parse') || message.includes('malformed')) {
    reason = 'malformed_response';
  }
  ...
}
```

### Issue
If `JSON.parse(response)` in `invokeAiEnhancement` throws `SyntaxError: Unexpected end of JSON input`, the error message does not contain "AI", "quota", "rate limit", "JSON", "parse", or "malformed". It falls into `unknown`.

### Impact
Debugging difficulty; operational dashboards may undercount malformed AI responses.

### Recommendation
Add generic parse error detection:
```typescript
} else if (message.includes('JSON') || message.includes('parse') || message.includes('malformed') || message.includes('Unexpected')) {
  reason = 'malformed_response';
}
```

**Verdict:** ✅ CONFIRMED — not blocking

---

## Evidence 5: Stage 5 Overwrites entityExtractionStrategy (VERIFIED — NOT A FINDING)

### Code Evidence

**File:** `src/shared/services/knowledgeDispatcher.service.ts`

```typescript
entityExtractionStrategy: result.strategy === 'normalized' 
  ? (existing as any)?.entityExtractionStrategy || 'heuristic' 
  : result.strategy,
```

### Analysis
When Stage 5 uses AI (`normalized+ai` or `ai-only`), it overwrites Stage 2's `entityExtractionStrategy`. This is acceptable because:
- The plan defines Stage 3 as producing "enhancement strategy" metadata
- Downstream Stage 4 uses `entityExtractionStrategy` as a penalty factor in confidence scoring
- If AI was used in Stage 5, the strategy should reflect the combined extraction+enhancement approach

**Verdict:** ✅ NOT A FINDING

---

## Verified Non-Findings

### Statelessness
`ResumeAIEnhancer` imports: `ResumeEntity`, `IAIProvider`, `AIConfig`, `Logger`. No DB, queue, or event bus imports. ✅

### Event Contracts
- `ResumeAIEnhanced` payload matches frozen plan: `entitiesEnhanced`, `strategy`, `aiFallbackUsed`, `entityTypes`, `improvements`, `reviewStatus`, `timestamp`, `correlationId`. ✅
- `ResumeAIEnhancementFailed` payload matches frozen plan: `processingId`, `errorMessage`, `reason`, `timestamp`, `correlationId`. ✅

### Idempotency
`rawCandidateFields.aiEnhanced` check in dispatcher matches plan fix. No schema migration. ✅

### Multi-Tenant Isolation
Dispatcher queries scope by `processingId`. Parent `ResumeParseResult` carries `organizationId`. ✅

### Retry Semantics
Dispatcher error path throws after publishing failure event. Upstream queue handles retry (backoff 1s, 2s, 4s; max 3 attempts). ✅

### Performance
Single `findOne` + single `findOneAndUpdate` per stage. Linear normalization loop. Per-entity AI calls. No N+1 queries. ✅

### Future Sprint Compatibility
Stage 4 can read `rawCandidateFields.entities`, `strategy`, and `reviewStatus` without modification. No schema changes block future stages. ✅

---

## Summary

| # | Severity | Finding | Must Fix? |
|---|----------|---------|-----------|
| 1 | Medium | `normalizedSkills` counts all skills, not normalized | Yes |
| 2 | Low | Implementation report says "12 tests" but actual is 21 | No |
| 3 | Low | Date regex can produce invalid ISO for DD-MM-YYYY | No |
| 4 | Low | JSON parse errors may misclassify as `unknown` | No |

**No critical or high-severity findings.**

---

## Verdict

### APPROVED WITH FIXES

Resolve finding #1 (`normalizedSkills` accuracy) before merge. Finding #2 should be fixed for documentation accuracy. Findings #3 and #4 are recommended improvements for future sprints.

---

*End of Sprint 5 Code Review Evidence*
*Generated: 2026-07-25*
