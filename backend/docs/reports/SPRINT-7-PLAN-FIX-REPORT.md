# Sprint 7 Plan Fix Report
## Resume Parser — DIC Integration & Canonical Model Writes (Stages 5-6)

**Date:** 2026-07-25  
**Review Reference:** `SPRINT-7-PLAN-REVIEW.md`  
**Plan Baseline:** `SPRINT-7-PLAN.md`

---

## Findings Applied

### Finding 6.1 (MEDIUM) — Person Deduplication Strategy

**Change:** Replaced three-bucket strategy with Architecture v1.7 Section 7.4 deduction formula.

**Before:**
- If deterministic match (email/phone): reuse existing `Person`
- If soft match above threshold: create `ResumePersonSuggestion` for DIC review
- If no match: create new `Person`

**After:**
```ts
const isDuplicate =
  emailMatch ||
  phoneMatch ||
  (nameScore >= 0.92 &&
    (emailMatch || phoneMatch || institutionScore >= 0.85));

if (isDuplicate) {
  // Reuse existing Person
  // Create ResumePersonSuggestion for audit/override
  // matchConfidence, matchBasis, isNewPerson = false
} else {
  // Create new Person
  // Create ResumePersonSuggestion with isNewPerson = true
}
```

**Test update:** Changed "Person deduplication: name match" to "Person deduplication: name+institution match | Reuses existing Person per architecture formula"

---

### Finding 2.1 (LOW) — Stage 5 Trigger Mechanism

**Change:** Added explicit trigger definition in Section 5 Responsibilities.

**Before:**
- Read `ResumeParseResult` documents by `reviewStatus`

**After:**
- Subscribe to `ResumeParseCompleted` event from Stage 4
- Read `ResumeParseResult` documents by `reviewStatus`

---

### Finding 12.1 (LOW) — Scope Ambiguity

**Change:** Replaced "Resume-specific DIC UI metadata" with "DIC routing metadata" in Section 2 In Scope.

**Before:**
- Resume-specific DIC UI metadata

**After:**
- DIC routing metadata

---

### Finding 15 (LOW) — Existing Model Reference

**Change:** Updated `ResumePersonSuggestion` file status from "create" to "update/extend".

**Before:**
| `src/models/ResumePersonSuggestion.ts` | Create if not exists |

**After:**
| `src/models/ResumePersonSuggestion.ts` | Update/extend if needed |

---

## Files Modified

| File | Changes |
|------|---------|
| `SPRINT-7-PLAN.md` | Applied all 4 findings |

---

## Verification

- Architecture v1.7 Section 7.4 formula now exactly followed
- Trigger mechanism explicitly defined
- Scope ambiguity resolved
- Existing model status corrected

---

*End of Sprint 7 Plan Fix Report*
*Generated: 2026-07-25*
