# Sprint 7 Plan Fix — Evidence Report
## Resume Parser — DIC Integration & Canonical Model Writes (Stages 5-6)

**Date:** 2026-07-25  
**Scope:** Sprint 7 plan fix evidence

---

## Evidence 1: Finding 6.1 (MEDIUM) — Person Deduplication Formula

### Change Applied

**File:** `SPRINT-7-PLAN.md` Section 6

Replaced three-bucket strategy with Architecture v1.7 Section 7.4 deduction formula.

### New Decision Logic

```ts
const emailMatch = normalizeEmail(rawEmail) === normalizeEmail(existingEmail);
const phoneMatch = normalizePhone(rawPhone) === normalizePhone(existingPhone);
const nameScore = jaroWinkler(rawName, existingName);
const institutionScore = jaroWinkler(rawInstitution, existingInstitution);

const isDuplicate =
  emailMatch ||
  phoneMatch ||
  (nameScore >= 0.92 &&
    (emailMatch || phoneMatch || institutionScore >= 0.85));
```

### Verification Against Architecture

Architecture v1.7 Section 7.4 states:

> ```ts
> const isDuplicate =
>   emailMatch ||
>   phoneMatch ||
>   (nameScore >= 0.92 && (emailMatch || phoneMatch || institutionScore >= 0.85));
> ```

Plan now matches exactly.

### Test Update

Changed "Person deduplication: name match" to "Person deduplication: name+institution match | Reuses existing Person per architecture formula"

**Verdict:** ✅ FORMULA ALIGNED

---

## Evidence 2: Finding 2.1 (LOW) — Stage 5 Trigger Mechanism

### Change Applied

**File:** `SPRINT-7-PLAN.md` Section 5 Responsibilities

Added explicit trigger: "Subscribe to `ResumeParseCompleted` event from Stage 4"

### Consistency Check

Existing dispatcher architecture (Sprints 3–6) uses event-driven stage routing:
- `ResumeSectionDetected` → triggers Stage 2
- `ResumeEntityExtracted` → triggers Stage 3
- `ResumeAIEnhanced` → triggers Stage 4
- `ResumeConfidenceScored` → triggers Stage 5

Adding `ResumeParseCompleted` → Stage 5 follows same pattern.

**Verdict:** ✅ TRIGGER EXPLICITLY DEFINED

---

## Evidence 3: Finding 12.1 (LOW) — Scope Ambiguity

### Change Applied

**File:** `SPRINT-7-PLAN.md` Section 2 In Scope

Replaced "Resume-specific DIC UI metadata" with "DIC routing metadata"

### Verification

Out-of-scope still correctly includes "DIC UI implementation". No frontend coupling implied.

**Verdict:** ✅ SCOPE CLEAR

---

## Evidence 4: Finding 15 (LOW) — Existing Model Reference

### Change Applied

**File:** `SPRINT-7-PLAN.md` Section 11 Files to Modify

Replaced "Create if not exists" with "Update/extend if needed"

### Verification

Codebase grep confirms `ResumePersonSuggestion` model exists:
- `src/models/ResumePersonSuggestion.ts` — line 27 exports model

**Verdict:** ✅ MODEL REFERENCE CORRECTED

---

## Before/After Summary

| Finding | Before | After |
|---------|--------|-------|
| 6.1 | Three-bucket soft/hard match | Architecture formula exact |
| 2.1 | Implicit trigger | `ResumeParseCompleted` event subscription |
| 12.1 | "DIC UI metadata" | "DIC routing metadata" |
| 15 | "Create if not exists" | "Update/extend if needed" |

---

## Sprint Scope Impact

**No scope changes.** All fixes are clarifications and alignments within existing scope.

---

*End of Sprint 7 Plan Fix Evidence*
*Generated: 2026-07-25*
