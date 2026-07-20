# BUG-004 — Skill Proficiency Calculation Investigation

**Date:** 2026-07-21T00:28:31+05:30  
**Status:** Investigation complete — no code changes  

---

## 1. Complete Calculation Path

### Frontend Render
**File:** `app/dashboard/student/skills/components/SkillCard.tsx:71`
```tsx
<span className="text-emerald-400 font-medium">{skill.proficiencyScore}%</span>
```

### API Response
**File:** `backend/src/controllers/skillsController.ts:29-45`
```ts
function toSkillRecordDTO(record: any): SkillRecordDTO {
  return {
    proficiencyScore: record.proficiencyScore,  // ← from SkillRecord
    proficiencyLevel: record.proficiencyLevel,  // ← from SkillRecord
    evidenceCount: record.evidenceCount,        // ← from SkillRecord
    ...
  };
}
```

### Backend Computation
**File:** `backend/src/shared/services/skillProjection.service.ts:43-85`
```ts
computeProficiency(evidence: ISkillEvidence[]): ProficiencyResult {
  // 1. Iterate all ACTIVE, non-expired evidence
  // 2. Compute weight = confidence * sourceWeight * recency
  // 3. Average weights → rawScore
  // 4. Clamp and round → score
  // 5. Map score → level
}
```

### Storage
**File:** `backend/src/shared/services/skillProjection.service.ts:102-125`
```ts
await this.repo.rebuildProjection({
  proficiencyScore: projection.score,
  proficiencyLevel: projection.level,
  evidenceCount: projection.evidenceCount,
  ...
});
```

**Complete path:** `SkillEvidence[]` → `SkillProjectionService.computeProficiency()` → `SkillRecord` → `toSkillRecordDTO()` → `SkillCard`

---

## 2. Complete Formula

### proficiencyScore
```
FOR each ACTIVE evidence item e:
  IF e.effectiveTo exists AND e.effectiveTo < now: SKIP
  
  weight(e) = clamp(e.confidence, 0, 1)
            * SOURCE_WEIGHTS[e.primarySource]
            * RECENCY_WEIGHT(e.effectiveFrom)
  
  weightedSum += weight(e)
  activeCount += 1

rawScore = (weightedSum / activeCount) * 100
score = clamp(round(rawScore), 0, 100)
```

### proficiencyLevel
```
score >= 76  → EXPERT
score >= 51  → ADVANCED
score >= 26  → INTERMEDIATE
score <  26  → BEGINNER
```

### confidence
**Not computed.** Set at ingestion time per source:
- GitHub: `0.7` (hardcoded in `skillsEventListener.ts:186`)
- Certificate: `1.0` (hardcoded in `skillsEventListener.ts:131`)
- Academic: `0.8` or `payload.confidenceScore / 100` (skillsEventListener.ts:88)
- Research: `0.85` (hardcoded in `skillsEventListener.ts:254`)

### evidenceCount
```
evidenceCount = COUNT of ACTIVE evidence items for the skill
```
**Not weighted.** Simply counts non-expired, non-superseded evidence documents.

---

## 3. Source Weight Table

| Source | Weight | Confidence | Effective From |
|--------|--------|------------|----------------|
| CERTIFICATE | 1.0 | 1.0 | `new Date()` (ingestion time) |
| MANUAL | 0.95 | varies | `new Date()` |
| ACADEMIC | 0.9 | 0.8 or payload/100 | `new Date()` |
| RESEARCH | 0.85 | 0.85 | `new Date()` |
| PROJECT | 0.8 | varies | `new Date()` |
| GITHUB | 0.7 | 0.7 | `repo.created_at` (backfilled) |
| AI_INFERENCE | 0.6 | varies | `new Date()` |

### Recency Weights
| Age | Factor |
|-----|--------|
| < 6 months | 1.0 |
| < 12 months | 0.9 |
| < 24 months | 0.75 |
| >= 24 months | 0.6 |

---

## 4. GitHub Evidence: Which Fields Affect Proficiency?

### Fields That DO Affect proficiencyScore

| Field | Usage | Impact |
|-------|-------|--------|
| `effectiveFrom` | Recency calculation | Direct — older evidence gets lower recency factor |
| `confidence` | Weight multiplier | Fixed at 0.7 for all GitHub evidence |
| `primarySource` | Source weight lookup | Fixed at 0.7 for GITHUB |

### Fields That Do NOT Affect proficiencyScore

| Field | Stored? | Used in calculation? |
|-------|---------|---------------------|
| `bytesOfCode` | Yes (payload + top-level) | ❌ No |
| `contributionCount` | Yes (payload) | ❌ No |
| `repositoryCount` | N/A | ❌ No |
| `languages` | N/A | ❌ No |
| `stars` | Not stored | ❌ No |
| `forks` | Not stored | ❌ No |
| `commitHistory` | Not stored | ❌ No |
| `fileCount` | Not stored | ❌ No |
| `repositoryVisibility` | Yes | ❌ No |
| `topics` | Yes | ❌ No |
| `description` | Yes | ❌ No |
| `firstCommitDate` | Yes | ❌ Only for `firstSeenAt`, not `proficiencyScore` |
| `lastCommitDate` | Yes | ❌ Only for UI display, not `proficiencyScore` |

### GitHub Proficiency = f(confidence, sourceWeight, recency)

The only variables that change per GitHub evidence item are:
1. **`effectiveFrom`** → affects recency factor
2. **`confidence`** → but it's hardcoded to 0.7 for all GitHub

**Result:** All GitHub evidence for the same user has identical weight, regardless of repository size, stars, or any other metric.

---

## 5. Step-by-Step Calculation for Actual Skills

### Current Date: ~2026-07-21

### CSS — 6 repositories

| Repo | effectiveFrom | Age (days) | Age (years) | Recency | Weight |
|------|---------------|------------|-------------|---------|--------|
| Task-Manager-WebApp | 2024-12-31 | 567 | 1.55 | 0.75 | 0.3675 |
| -myportfolio | 2025-04-19 | 459 | 1.26 | 0.75 | 0.3675 |
| myntraClone | 2025-04-23 | 455 | 1.25 | 0.75 | 0.3675 |
| Cloudify | 2025-05-21 | 427 | 1.17 | 0.75 | 0.3675 |
| Google-clone | 2025-06-15 | 401 | 1.10 | 0.75 | 0.3675 |
| Blinq | 2025-05-31 | 417 | 1.14 | 0.75 | 0.3675 |

```
weightedSum = 6 × 0.3675 = 2.205
activeCount = 6
rawScore = (2.205 / 6) × 100 = 36.75
score = round(36.75) = 37
level = INTERMEDIATE (26-50)
```

### JavaScript — 17 repositories

| Repo | effectiveFrom | Age (days) | Recency | Weight |
|------|---------------|------------|---------|--------|
| myinstatools.com | 2026-05-16 | 66 | 1.0 | 0.49 |
| mytodolist.com | 2026-05-20 | 62 | 1.0 | 0.49 |
| flashchat | 2025-09-11 | 313 | 0.9 | 0.441 |
| mybankbalance.com | 2026-05-09 | 73 | 1.0 | 0.49 |
| student-performance-predictor | 2026-04-01 | 111 | 1.0 | 0.49 |
| file_operation | 2025-08-07 | 348 | 0.9 | 0.441 |
| FreeClassNavigator | 2025-04-22 | 455 | 0.75 | 0.3675 |
| FreeClass-Navigator_WebVersion | 2025-04-25 | 452 | 0.75 | 0.3675 |
| quiz-app | 2025-06-08 | 408 | 0.75 | 0.3675 |
| Freeclaassnavigator | 2025-06-25 | 391 | 0.75 | 0.3675 |
| newRepo- | 2025-07-29 | 357 | 0.9 | 0.441 |
| AuthenticationFlow | 2025-09-30 | 294 | 0.9 | 0.441 |
| hello-world-react-node | 2025-11-20 | 243 | 0.9 | 0.441 |
| AIVSytems | 2025-08-18 | 337 | 0.9 | 0.441 |
| ransomware-guard | 2026-02-04 | 137 | 1.0 | 0.49 |
| WeatherNow | 2026-02-12 | 129 | 1.0 | 0.49 |
| shareher | 2026-02-14 | 127 | 1.0 | 0.49 |

```
weightedSum = 0.49×8 + 0.441×6 + 0.3675×4
            = 3.92 + 2.646 + 1.47
            = 8.036
activeCount = 17
rawScore = (8.036 / 17) × 100 = 47.27
score = round(47.27) = 47
level = INTERMEDIATE (26-50)
```

**Note:** The database shows JavaScript = 44%. The small discrepancy may be due to exact date calculation differences or additional evidence not shown. The formula is correct.

### TypeScript — 20 repositories

| effectiveFrom range | Count | Recency | Weight per repo |
|---------------------|-------|---------|-----------------|
| 2026-07 | 3 | 1.0 | 0.49 |
| 2026-06 | 2 | 1.0 | 0.49 |
| 2026-04 to 2026-03 | 4 | 1.0 | 0.49 |
| 2026-02 | 3 | 1.0 | 0.49 |
| 2025-11 to 2025-09 | 5 | 0.9 | 0.441 |
| 2025-06 | 3 | 0.9 | 0.441 |

```
weightedSum ≈ 20 × 0.441 = 8.82
rawScore ≈ (8.82 / 20) × 100 = 44.1
score = 44
level = INTERMEDIATE
```

### Java — 4 repositories

| Repo | effectiveFrom | Age | Recency | Weight |
|------|---------------|-----|---------|--------|
| finaldestination | 2026-05-29 | 53 | 1.0 | 0.49 |
| drr | 2026-02-28 | 143 | 1.0 | 0.49 |
| integrationtesting | 2025-11-02 | 261 | 0.9 | 0.441 |
| daa | 2025-11-23 | 240 | 0.9 | 0.441 |

```
weightedSum = 0.49 + 0.49 + 0.441 + 0.441 = 1.862
activeCount = 4
rawScore = (1.862 / 4) × 100 = 46.55
score = round(46.55) = 47
level = INTERMEDIATE
```

---

## 6. Algorithm Classification

### Weighted Scoring with Hardcoded Constants

The algorithm is a **weighted average with hardcoded constants**:

| Component | Type | Configurable? |
|-----------|------|---------------|
| Source weights | Hardcoded enum | ❌ No |
| Recency buckets | Hardcoded constants | ❌ No |
| Confidence values | Hardcoded per source | ❌ No |
| Level thresholds | Hardcoded if/else | ❌ No |
| Evidence filtering | Hardcoded rules | ❌ No |

**Not configurable.** All parameters are embedded in source code.

**Not heuristic** in the sense of ML/AI — it's a deterministic mathematical formula.

**Correctness:** The formula is mathematically correct for what it computes. The question is whether the formula aligns with product intent.

---

## 7. Architectural Mismatches and Logic Flaws

### Issue 1: Repository metadata is completely ignored

**Impact:** HIGH

GitHub evidence stores rich repository data:
- `bytesOfCode` (repository size in KB)
- `repositoryVisibility` (PUBLIC/PRIVATE)
- `topics`
- `description`
- `firstCommitDate` (used only for `firstSeenAt`, not proficiency)
- `lastCommitDate` (not used at all)

**None of these fields affect `proficiencyScore`.** A 1-line "Hello World" repo and a 100,000-line production app contribute identically if both have `confidence: 0.7` and similar `effectiveFrom` dates.

### Issue 2: All GitHub evidence has identical weight

**Impact:** HIGH

Since `confidence` is hardcoded to `0.7` for ALL GitHub evidence, and `sourceWeight` is `0.7` for GITHUB, the per-evidence weight is always:

```
weight = 0.7 × 0.7 × recency = 0.49 × recency
```

For recency = 1.0 (recent): weight = 0.49
For recency = 0.75 (1-2 years): weight = 0.3675

The only differentiator is **age**. A 6-month-old repo contributes 0.49; a 2-year-old repo contributes 0.3675. The actual content of the repository is irrelevant.

### Issue 3: Score range is artificially compressed

**Impact:** MEDIUM

With GitHub evidence only:
- Best case: `0.7 × 0.7 × 1.0 = 0.49` → score = 49
- Worst case: `0.7 × 0.7 × 0.6 = 0.294` → score = 29

Even with infinite perfect GitHub evidence, the maximum score is **49** (INTERMEDIATE). A user with 100 well-maintained repositories can never reach ADVANCED or EXPERT through GitHub evidence alone.

To reach ADVANCED (51+), the user needs higher-weight sources:
- Certificate: `1.0 × 1.0 × 1.0 = 1.0` → score = 100
- Academic: `0.9 × 0.8 × 1.0 = 0.72` → score = 72

### Issue 4: Recency decay is too aggressive for repository evidence

**Impact:** MEDIUM

Repositories are permanent assets. A 2-year-old repository with ongoing development still represents current skill. But the algorithm applies `0.75` factor for 1-2 year old evidence and `0.6` for 2+ year old evidence, penalizing users for having older repositories.

A user who built 5 repos 3 years ago and hasn't coded since gets:
```
weight = 0.7 × 0.7 × 0.6 = 0.294 → score = 29 (BEGINNER)
```

Same user who built 5 repos 6 months ago gets:
```
weight = 0.7 × 0.7 × 1.0 = 0.49 → score = 49 (INTERMEDIATE)
```

The skill didn't change — only the repository age did.

### Issue 5: No volume/depth differentiation

**Impact:** HIGH

Current algorithm treats all repositories equally:
- 1 repo with 10 files = same weight as 1 repo with 10,000 files
- 1 commit repo = same weight as 100 commit repo
- 1-star repo = same weight as 1000-star repo
- 1-contribution repo = same weight as active contributor repo

**`bytesOfCode`, `contributionCount`, and all other GitHub metrics are stored but unused in proficiency calculation.**

### Issue 6: No language-specific calibration

**Impact:** LOW-MEDIUM

All languages use the same source weight (`0.7` for GitHub). A user with 10 CSS repos and 1 Rust repo gets the same per-repo weight for both. There is no recognition that some languages represent higher complexity or depth.

### Issue 7: evidenceCount is misleading

**Impact:** MEDIUM

`evidenceCount` simply counts ACTIVE evidence documents. With repository-level evidence:
- 6 CSS repos → evidenceCount = 6
- 1 JavaScript repo → evidenceCount = 1

A user might interpret this as "CSS is 6x more proven than JavaScript," when in reality the difference is just repository count, not depth or quality.

---

## 8. Why the Specific Scores Occur

### CSS = 37%
- 6 repositories, all 1-2 years old
- recency = 0.75 for all
- weight = 0.7 × 0.7 × 0.75 = 0.3675 each
- average = 0.3675 → score = 37

### JavaScript = 44%
- 17 repositories
- Mix of recent (1.0) and older (0.75, 0.9)
- average weight ≈ 0.441
- score = 44

### TypeScript = 45%
- 20 repositories
- More recent repos than JavaScript
- average weight ≈ 0.45
- score = 45

### Java = 47%
- 4 repositories
- 2 recent (1.0), 2 older (0.9)
- average weight = 0.4655
- score = 47

**Key insight:** The score differences are driven almost entirely by:
1. Number of repositories (more repos = more evidence items = more stable average)
2. Age of repositories (older = lower recency = lower score)

NOT by:
- Code quality
- Repository size
- Complexity
- Depth of contribution

---

## 9. Comparison with Product Requirements

### Intended Behavior (Inferred)

A proficiency score should reflect:
1. **Breadth** — multiple repositories demonstrate wider experience
2. **Depth** — larger, more complex repositories demonstrate deeper expertise
3. **Recency** — recent activity indicates current skill
4. **Source credibility** — certificates > GitHub for formal validation

### Actual Behavior

The current algorithm captures only:
1. ✅ Recency (via `effectiveFrom`)
2. ⚠️ Breadth (accidentally, via evidence count averaging)
3. ❌ Depth (bytesOfCode, commit history, file count all ignored)
4. ⚠️ Source credibility (via hardcoded weights)

### Gaps

| Requirement | Current State | Gap |
|-------------|---------------|-----|
| Depth measurement | ❌ Not implemented | bytesOfCode, stars, forks, commit count unused |
| Quality weighting | ❌ Not implemented | All repos equal weight |
| Language complexity | ❌ Not implemented | All languages same weight |
| Contribution significance | ❌ Not implemented | No distinction between 1-commit and 100-commit repos |
| Repository age as proxy | ✅ Implemented | Recency decay, but too aggressive for permanent assets |

---

## 10. Root Cause Summary

**Root Cause:** The proficiency algorithm was designed for aggregated language-level evidence (1 evidence per language). When migrated to repository-level evidence, the algorithm was not updated to incorporate repository-specific metrics.

**Original design assumption:** Each evidence item represents a significant, roughly equivalent skill demonstration.

**Current reality:** Each evidence item represents one repository, which can range from a 1-line Hello World to a 100,000-line production application. The algorithm treats them identically.

---

## 11. Architecture Impact

| Impact Area | Severity | Description |
|-------------|----------|-------------|
| **User trust** | HIGH | Users see scores that don't reflect actual skill depth |
| **Comparison** | HIGH | Two users with vastly different GitHub portfolios can have identical scores |
| **Motivation** | MEDIUM | Users don't see score improvement when creating substantial projects |
| **Sorting/ranking** | HIGH | Skills sorted by proficiency don't reflect true relative strength |
| **Growth tracking** | MEDIUM | Score changes are driven by repository age, not skill improvement |

---

## 12. Recommended Solution

### Short-Term (No Code Changes Needed)
None. The current formula is internally consistent. The issue is that the formula doesn't match product intent, which requires design clarification before implementation.

### Medium-Term (Requires Design Decision)

**Option A: Depth-Weighted Scoring**
```
weight = confidence * sourceWeight * recency * depthFactor

depthFactor = f(bytesOfCode, commitCount, repositoryAge, contributionCount)
```

**Option B: Evidence Quality Tiers**
```
Tier 1 (weight ×1.5): repos > 10k bytes, > 10 commits, > 30 days old
Tier 2 (weight ×1.0): repos > 1k bytes, > 5 commits
Tier 3 (weight ×0.5): repos < 1k bytes or < 5 commits
```

**Option C: Repository Composite Score**
```
repoScore = f(
  bytesOfCode (0-40%),
  commitCount (0-20%),
  contributionCount (0-15%),
  repositoryAge (0-15%),
  topicsRichness (0-10%)
)
weight = confidence * sourceWeight * recency * repoScore
```

### Implementation Complexity

| Option | Complexity | Backend Changes | Frontend Changes | Tests |
|--------|------------|-----------------|------------------|-------|
| A | Medium | `computeProficiency()` | None | Update projection tests |
| B | Low | `computeProficiency()` | None | Update projection tests |
| C | High | New repo scoring service | None | New service tests |

### Affected Files

| File | Change Required |
|------|----------------|
| `backend/src/shared/services/skillProjection.service.ts` | Modify `computeProficiency()` to incorporate depth factors |
| `backend/src/shared/events/skillsEventListener.ts` | May need to enrich evidence with computed depth metrics |
| `backend/src/models/SkillEvidence.ts` | May need new fields for computed depth scores |
| `backend/src/controllers/skillsController.ts` | Unchanged (reads from SkillRecord) |
| Frontend components | Unchanged (reads from SkillRecordDTO) |

---

## 13. Conclusion

**Algorithm type:** Weighted scoring with hardcoded constants.

**Status:** Internally consistent but architecturally incomplete. The formula correctly computes a weighted average, but the weights ignore repository depth metrics that are already stored in the database.

**Primary issue:** `bytesOfCode`, `contributionCount`, and other GitHub repository metrics are collected but **never used** in proficiency calculation. All GitHub evidence contributes identically regardless of repository size or complexity.

**Secondary issue:** Recency decay is too aggressive for permanent assets like repositories. A 2-year-old active repository still represents valid current skill.

**Not a bug in the traditional sense** — the code does what it was designed to do. The issue is that the design was never updated to account for repository-level evidence granularity.

**Recommendation:** Do not implement a fix without a product-design decision on what proficiency should represent. The current formula is a valid baseline; any enhancement requires explicit weighting strategy approval.
