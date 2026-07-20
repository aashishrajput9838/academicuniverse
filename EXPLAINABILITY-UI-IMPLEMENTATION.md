# Explainability UI Implementation Report

**Date:** 2026-07-21T01:08:00+05:30  
**Status:** Implementation complete  
**Related:** BUG-004 (Proficiency Calculation), CONFIDENCE-DISPLAY-INVESTIGATION.md  

---

## 1. Summary

Implemented transparent explainability UI for proficiency and confidence calculations without changing any underlying formulas. The system now clearly labels confidence as a source default, shows proficiency thresholds, and explains how scores are derived.

**Calculations unchanged.** Only display and transparency improved.

---

## 2. What Was Implemented

### 2.1 Backend Changes

#### New DTOs (`backend/src/shared/dtos/skills.dto.ts`)

```typescript
export interface SourceDefaultInfo {
  source: string;
  defaultConfidence: number;
  isSourceDefault: boolean;
  description: string;
}

export interface ConfidenceExplanationDTO {
  overallConfidence: number;
  isSourceDefault: boolean;
  source: string;
  sourceDefaultConfidence: number;
  description: string;
  perSourceBreakdown: Array<{
    source: string;
    count: number;
    avgConfidence: number;
    isSourceDefault: boolean;
  }>;
}

export interface ProficiencyExplanationDTO {
  score: number;
  level: string;
  thresholds: {
    BEGINNER: number;
    INTERMEDIATE: number;
    ADVANCED: number;
    EXPERT: number;
  };
  formula: string;
  evidenceCount: number;
  activeEvidenceCount: number;
  description: string;
  sourceBreakdown: Array<{
    source: string;
    count: number;
    avgWeight: number;
    sourceWeight: number;
    isSourceDefault: boolean;
  }>;
}
```

#### `SkillProjectionService` additions (`backend/src/shared/services/skillProjection.service.ts`)

- `getSourceWeight(source: SkillSource): number` — public accessor for source weights
- `generateProficiencyExplanation(evidence: ISkillEvidence[]): ProficiencyExplanationDTO` — computes and returns proficiency breakdown
- `generateConfidenceExplanation(evidence: ISkillEvidence[]): ConfidenceExplanationDTO` — computes and returns confidence breakdown

#### Controller updates (`backend/src/controllers/skillsController.ts`)

- `getMySkills` now attaches `explanation` to each skill record
- `getMySkillEvidence` now attaches `explanation` to each evidence item and returns proficiency explanation in the detail response

---

### 2.2 Frontend Changes

#### Type updates (`app/dashboard/student/skills/types/skills.ts`)

- `SkillEvidenceDTO` now includes optional `explanation` field
- `SkillDetailDTO` now includes optional `explanation` field
- `SkillProfileResponse.skills` items now include optional `explanation` field

#### `ConfidenceExplanation` component (`app/dashboard/student/skills/components/ConfidenceExplanation.tsx`)

**New features:**
- Header label changes between "Source Default Confidence" and "Average Confidence" based on whether all evidence uses source defaults
- Amber info banner when confidence is a source default: *"This confidence value is a source default, not a repository quality assessment."*
- Blue alert banner when confidence values vary across evidence
- "default" badge next to per-source breakdown items
- Footer note for GitHub evidence: *"GitHub evidence confidence is currently a fixed source default. Future versions will assess each repository individually based on size, activity, and community engagement."*

#### `SkillCard` component (`app/dashboard/student/skills/components/SkillCard.tsx`)

**New expanded section:**
- Proficiency Score (X/100)
- Level badge
- Thresholds display: `INTERMEDIATE ≥26 | ADVANCED ≥51 | EXPERT ≥76`
- Formula: `weighted_average`
- Active evidence count vs total evidence count
- Source breakdown with weights and default flags
- Description text

#### `SkillDetailPanel` component (`app/dashboard/student/skills/components/SkillDetailPanel.tsx`)

**New "Proficiency Breakdown" section** inserted between "Skill Details" and "Resume Readiness":
- Score and level display
- Thresholds, formula, and active evidence count
- Source weights breakdown
- Description text

---

## 3. Calculation Verification

### Proficiency Formula (unchanged)

```
weight = confidence × sourceWeight × recency
score = average(weight for all active evidence) × 100
level = scoreToLevel(score)
```

**Thresholds:**
- BEGINNER: 0–25
- INTERMEDIATE: 26–50
- ADVANCED: 51–75
- EXPERT: 76–100

### Confidence Formula (unchanged)

```
overallConfidence = average(confidence for all active evidence)
```

**Source defaults:**
| Source | Default Confidence |
|--------|-------------------|
| CERTIFICATE | 100% |
| MANUAL | 95% |
| ACADEMIC | 90% |
| RESEARCH | 85% |
| PROJECT | 80% |
| GITHUB | 70% |
| AI_INFERENCE | 60% |

---

## 4. Example Output

### SkillCard (expanded)
```
Proficiency Score: 37/100
Level: INTERMEDIATE
Thresholds: INTERMEDIATE ≥26 | ADVANCED ≥51 | EXPERT ≥76
Formula: weighted_average
Active evidence: 6 of 6

Sources:
GITHUB (default) ×6 · weight=0.70

Proficiency is calculated as the weighted average of all active evidence...
```

### ConfidenceExplanation
```
70%
Source Default Confidence

⚠️ This confidence value is a source default, not a repository quality assessment.
All evidence comes from GITHUB, which uses a default confidence value of 70%...

Because:
✓ 6 GitHub Repositories 70% avg [default]

ℹ️ GitHub evidence confidence is currently a fixed source default...
```

### SkillDetailPanel — Proficiency Breakdown
```
Score: 37/100
Level: INTERMEDIATE

Thresholds: INTERMEDIATE ≥26 | ADVANCED ≥51 | EXPERT ≥76
Formula: weighted_average
Active evidence: 6 of 6

Source weights:
GITHUB (default) ×6 · weight=0.70

Proficiency is calculated as the weighted average of all active evidence...
```

---

## 5. Test Results

### Backend
- `skillProjection.service.test.ts`: **17/17 passed**
- `skillsController.test.ts`: **19/19 passed**

### Frontend
- Typecheck: **0 errors** in skills components/types

---

## 6. Files Changed

### Backend
| File | Changes |
|------|---------|
| `backend/src/shared/dtos/skills.dto.ts` | Added `SourceDefaultInfo`, `ConfidenceExplanationDTO`, `ProficiencyExplanationDTO`; added `explanation` to `SkillRecordDTO`, `SkillEvidenceDTO`, `SkillDetailDTO`, `SkillProfileResponse` |
| `backend/src/shared/services/skillProjection.service.ts` | Added `getSourceWeight()`, `generateProficiencyExplanation()`, `generateConfidenceExplanation()` |
| `backend/src/controllers/skillsController.ts` | Updated `getMySkills` and `getMySkillEvidence` to include explanations in responses |
| `backend/src/controllers/__tests__/skillsController.test.ts` | Added mocks for new service methods and `evidenceRepo.findByPerson` |

### Frontend
| File | Changes |
|------|---------|
| `app/dashboard/student/skills/types/skills.ts` | Added `explanation` fields to `SkillRecordDTO`, `SkillEvidenceDTO`, `SkillDetailDTO`, `SkillProfileResponse` |
| `app/dashboard/student/skills/components/ConfidenceExplanation.tsx` | Added source-default transparency labels, info banners, default badges |
| `app/dashboard/student/skills/components/SkillCard.tsx` | Added proficiency breakdown in expanded view |
| `app/dashboard/student/skills/components/SkillDetailPanel.tsx` | Added "Proficiency Breakdown" section; imported `ProficiencyLevel` and `proficiencyColors` |

---

## 7. What Was NOT Changed

- Proficiency calculation formula
- Confidence calculation formula
- Source weights
- Recency factors
- Database schema
- Evidence ingestion logic
- Skill projection logic

**Zero calculation changes.** This is purely a transparency/display improvement.

---

## 8. Future Work: Confidence Model V2

**Status:** Deferred to Product Design Backlog

### Planned improvements
1. **Per-repository confidence scoring** based on:
   - Repository size (LOC) — 30%
   - Commit activity — 25%
   - Repository age — 15%
   - Community validation (stars, forks) — 15%
   - Visibility — 10%
   - Recency — 5%

2. **Depth-adjusted proficiency** — integrate quality-weighted confidence into proficiency formula

3. **Backend computation** — move confidence computation from frontend averaging to backend `SkillEvidenceService.ingestEvidence()`

### Why deferred
Confidence and proficiency are coupled. Changing confidence without updating the proficiency formula would create inconsistency. Both should be redesigned together as part of "Proficiency Scoring Engine v2".

---

## 9. User-Visible Changes

### Before
- Confidence displayed as "70%" with no explanation of what it means
- Proficiency displayed as "37%" with no explanation of how it was calculated
- Level displayed as "Intermediate" with no visible thresholds
- No indication that confidence is a source default

### After
- Confidence clearly labeled as "Source Default Confidence" when applicable
- Info banner explains that confidence reflects source reliability, not repository quality
- Proficiency shows score, level, thresholds, formula, and source breakdown
- Future roadmap note visible for GitHub evidence
- All calculations remain identical — only transparency improved

---

## 10. Rollout Notes

- **No database migration required** — explanations are computed at API response time
- **No breaking changes** — all new fields are optional
- **Backward compatible** — existing API consumers ignore new fields
- **Performance impact** — negligible; explanation generation is O(n) over evidence already loaded for the response

---

## 11. Conclusion

Explainability UI successfully implemented. Users can now understand:
1. **Why** their confidence is 70% (source default for GitHub)
2. **Why** their proficiency is 37% (weighted average formula, thresholds, source weights)
3. **What** level they are (Intermediate) and what it takes to advance
4. **Which** evidence was used and how it contributed

**Confidence Model V2 remains in the Product Design Backlog** for future implementation.
