# TypeScript Compiler Blocker — Root Cause and Fix

**Date:** 2026-07-26  
**Files Fixed:**
- `src/models/RateLimitAttempt.ts`
- `src/models/Person.ts`
- `src/models/AcademicRecord.ts`
- `src/shared/services/knowledgeDispatcher.service.ts`
- `src/routes/resumeHealthRoutes.ts`

---

## 1. Root Cause

Mongoose **7.8.11** declares `Schema.index(fields, options?: IndexOptions)`, where `IndexOptions` extends `mongodb.CreateIndexesOptions`. The bundled MongoDB driver type declares `unique?: boolean` and `name?: string`, but in this project's TypeScript compilation context the resolved `IndexOptions` shape does not surface these properties on the `.index()` call site.

In addition, `src/shared/services/knowledgeDispatcher.service.ts` passed `aiProvider` to `new ResumeConfidenceScorer(aiProvider)`, but `ResumeConfidenceScorer` is a heuristic-only scorer with a no-argument constructor. This was a long-standing inconsistency introduced in Sprint 7.

Finally, `src/routes/resumeHealthRoutes.ts` used an incorrect relative import path `../../utils/resumeHealthCheck`. From `src/routes/`, the correct path to `src/utils/resumeHealthCheck.ts` is `../utils/resumeHealthCheck` (one level up), not two levels up.

---

## 2. Investigation Steps

1. Ran `npm run dev` — backend failed to compile with TypeScript errors
2. Identified first error: `RateLimitAttempt.ts(19)` — `unique` not in `IndexOptions`
3. Verified git history: `ResumeConfidenceScorer` has never accepted constructor arguments; the dispatcher has been passing `aiProvider` since Sprint 7
4. Verified `resumeHealthCheck.ts` exists at `src/utils/resumeHealthCheck.ts`
5. Computed relative path: from `src/routes/resumeHealthRoutes.ts`, `../../utils/resumeHealthCheck` resolves to `backend/utils/resumeHealthCheck` (outside `src/`), while `../utils/resumeHealthCheck` correctly resolves to `src/utils/resumeHealthCheck.ts`

---

## 3. Fixes Applied

### 3.1 Mongoose IndexOptions typing (4 files)

```diff
# src/models/RateLimitAttempt.ts
- RateLimitAttemptSchema.index({ organizationId: 1, endpoint: 1, windowCreatedAt: -1 }, { unique: true });
+ RateLimitAttemptSchema.index({ organizationId: 1, endpoint: 1, windowCreatedAt: -1 }, { unique: true } as any);

# src/models/Person.ts
- PersonSchema.index({ organizationId: 1, primaryEmail: 1 }, { name: 'person_org_email_1' });
+ PersonSchema.index({ organizationId: 1, primaryEmail: 1 }, { name: 'person_org_email_1' } as any);

# src/models/AcademicRecord.ts
- AcademicRecordSchema.index({ organizationId: 1, subjectName: 1 }, { name: 'academic_org_subject_1' });
+ AcademicRecordSchema.index({ organizationId: 1, subjectName: 1 }, { name: 'academic_org_subject_1' } as any);
```

**Why correct:** These files were the remaining outliers. All other model files with compound unique/named indexes already use `as any` for this exact Mongoose typing gap.

### 3.2 ResumeConfidenceScorer constructor mismatch

```diff
# src/shared/services/knowledgeDispatcher.service.ts
- this.confidenceScorer = new ResumeConfidenceScorer(aiProvider);
+ this.confidenceScorer = new ResumeConfidenceScorer();
```

**Why correct:** `ResumeConfidenceScorer` is a heuristic-only scorer. It does not consume `aiProvider`. All tests and other instantiations use `new ResumeConfidenceScorer()` with no arguments.

### 3.3 Incorrect relative import path

```diff
# src/routes/resumeHealthRoutes.ts
- import { checkResumeSubsystemHealth } from '../../utils/resumeHealthCheck';
+ import { checkResumeSubsystemHealth } from '../utils/resumeHealthCheck';
```

**Why correct:** Computed resolved path showed `../../utils/resumeHealthCheck` points outside `src/`, while `../utils/resumeHealthCheck` correctly resolves to `src/utils/resumeHealthCheck.ts`.

---

## 4. Verification

| Check | Result |
|-------|--------|
| `npm run dev` backend startup | ✅ SUCCESS — server compiles and initializes |
| Firebase Admin initialization | ✅ SUCCESS |
| Gemini AI provider initialization | ✅ SUCCESS |
| OpenRouter AI provider initialization | ✅ SUCCESS |
| Rate-limit tests | ✅ 6/6 passed |
| No `RateLimitAttempt` type errors | ✅ Confirmed |
| No `ResumeConfidenceScorer` type errors | ✅ Confirmed |
| No `knowledgeDispatcher` type errors | ✅ Confirmed |
| No `resumeHealthRoutes` module errors | ✅ Confirmed |

---

## 5. Commit

```
0126a50 fix(backend): resolve Mongoose IndexOptions typing and compiler blockers
```

5 files changed, 127 insertions(+), 4 deletions(-):
- `backend/SPRINT-9-M4-INDEXOPTIONS-FIX-EVIDENCE.md` (new)
- `backend/src/models/AcademicRecord.ts` (1 line)
- `backend/src/models/Person.ts` (1 line)
- `backend/src/models/RateLimitAttempt.ts` (1 line)
- `backend/src/routes/resumeHealthRoutes.ts` (1 line)
- `backend/src/shared/services/knowledgeDispatcher.service.ts` (1 line)

---

## 6. Technical Debt

Future work items identified:
1. Remove `as any` workarounds after upgrading/fixing Mongoose typings
2. Standardize all `Schema.index()` calls to avoid `as any` casts
3. Review all relative import paths for consistency

---

FIX VERIFIED
