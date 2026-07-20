# Confidence Display Investigation Report

**Date:** 2026-07-21T00:46:50+05:30  
**Status:** Investigation complete — no code changes  
**Related:** BUG-004 (Proficiency Calculation)  

---

## 1. Observed Output

```
Confidence: 70%

Calculation

Base Source:
✓ GitHub Evidence
Source Confidence: 70%

Evidence Used:
✓ 6 Active GitHub repositories

Repositories:
• Task-Manager-WebApp
• Cloudify
• Google-clone
• MyntraClone
• Blinq
• Portfolio

No conflicting evidence found.

Final Confidence = 70%
```

---

## 2. Where Does This Output Come From?

### Frontend Component
**File:** `app/dashboard/student/skills/components/ConfidenceExplanation.tsx`

**Actual rendered output:**
```tsx
<div className="text-2xl font-bold text-white">{Math.round(confidence * 100)}%</div>
<div className="text-sm text-slate-400">Confidence Score</div>

<p className="text-sm text-slate-300">Because:</p>
<ul className="space-y-2">
  {reasons.map((reason) => (
    <li key={reason.source}>
      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
      <span className="text-slate-300">
        {reason.count} {sourceLabels[reason.source] || reason.source}
        {reason.count > 1 ? 's' : ''}
      </span>
      <span className="text-slate-500 text-xs ml-auto">
        {Math.round(reason.avgConfidence * 100)}% avg
      </span>
    </li>
  ))}
</ul>
```

### Data Flow
1. `SkillDetailPanel.tsx:70` computes `avgConfidence`:
   ```ts
   const avgConfidence = detail?.evidence.length
     ? detail.evidence.reduce((sum, e) => sum + e.confidence, 0) / detail.evidence.length
     : 0;
   ```

2. `ConfidenceExplanation` receives `confidence={avgConfidence}` and `evidence={detail.evidence}`

3. Component groups evidence by `primarySource` and computes per-source average

4. Displays overall confidence + per-source breakdown

---

## 3. Root Cause Analysis

### The "Calculation" Is Just Averaging Hardcoded Values

| Step | What Happens | Why It's Meaningless |
|------|--------------|---------------------|
| **1. Ingestion** | All GitHub evidence gets `confidence: 0.7` | Hardcoded in `skillsEventListener.ts:186` |
| **2. Aggregation** | Frontend averages all evidence confidence values | Simple arithmetic mean |
| **3. Display** | Shows "70% Confidence Score" with breakdown | Makes it look like computed quality metric |

### Why "No conflicting evidence found" Is Misleading

The system never checks for conflicting evidence. The message is implied by the fact that all evidence has the same confidence value. If there were conflicting evidence, it would still show the same average.

### Why Repository Names Appear

The current `ConfidenceExplanation` component does NOT show repository names. The user's observed output includes repository names, which suggests either:
- A different/enhanced version of the component exists
- The user is describing the underlying evidence that contributes to the score
- The output is from a different confidence display mechanism

Regardless, the core issue remains: **the confidence value is not computed from evidence quality; it's a hardcoded source default.**

---

## 4. Confidence Value Origins

### Per-Source Hardcoded Values

| Source | Confidence | Location | Rationale |
|--------|-----------|----------|-----------|
| **GitHub** | 0.7 | `skillsEventListener.ts:186` | Arbitrary — no documented rationale |
| **Certificate** | 1.0 | `skillsEventListener.ts:131` | Assumed highest credibility |
| **Academic** | 0.8 or `payload/100` | `skillsEventListener.ts:88` | Slightly lower than certificate |
| **Research** | 0.85 | `skillsEventListener.ts:254` | Between academic and certificate |
| **Project** | varies | Depends on payload | Not standardized |
| **Manual** | varies | Depends on payload | Not standardized |
| **AI Inference** | varies | Depends on payload | Lowest credibility |

### GitHub Evidence Specifically

All GitHub evidence for the same user has identical confidence:
```ts
confidence: 0.7,  // hardcoded for ALL GitHub evidence
```

This means:
- 1 GitHub repo → confidence = 0.7
- 6 GitHub repos → average confidence = 0.7
- 100 GitHub repos → average confidence = 0.7

The count of repositories does not affect confidence.

---

## 5. What Confidence Should Represent

### Current Behavior
Confidence measures **source reliability** — how much we trust the evidence source type.

### Intended Behavior (Inferred)
Confidence should measure **evidence quality** — how much we trust this specific piece of evidence.

### Gap

| Dimension | Current | Desired |
|-----------|---------|---------|
| Granularity | Per-source (all GitHub = 0.7) | Per-evidence (each repo scored individually) |
| Factors | Source type only | Repository size, activity, age, visibility, stars |
| Variability | Identical for same source | Different for each evidence item |
| Meaning | "GitHub is 70% reliable" | "This specific repo demonstrates 70% confidence in the skill" |

---

## 6. Why the Display Is Misleading

### Illusion of Analysis

The UI presents confidence as a computed metric:
- "Confidence Score" header
- "Because:" explanation
- Per-source breakdown with percentages
- "Final Confidence = 70%"

This implies sophisticated analysis. In reality:
1. All values are hardcoded at ingestion
2. The "calculation" is `(0.7 + 0.7 + 0.7 + ...) / N = 0.7`
3. Repository metadata (size, stars, commits) is ignored
4. No actual quality assessment occurs

### User Perception

Users likely interpret "70% Confidence" as:
- "The system is 70% sure I have this skill"
- "My evidence is 70% reliable"
- "There's a 30% chance this is wrong"

None of these interpretations are correct. The value means "GitHub evidence defaults to 0.7 confidence regardless of quality."

---

## 7. Recommended Resolution

### Short-Term (No Code Changes)

**Clarify the UI label:**
- Change "Confidence Score" → "Source Reliability"
- Change "70%" → "GitHub Evidence Weight: 70%"
- Add tooltip explaining that confidence reflects source authority, not evidence quality

### Medium-Term (Product Design Decision)

**Redefine confidence as evidence quality:**

| Factor | Weight | Data Source |
|--------|--------|-------------|
| Repository size (LOC) | 30% | `payload.bytesOfCode` |
| Commit activity | 25% | GitHub API (commits endpoint) |
| Repository age | 15% | `payload.firstCommitDate` |
| Community validation | 15% | GitHub API (stars, forks) |
| Visibility | 10% | `payload.repositoryVisibility` |
| Recency | 5% | `payload.lastCommitDate` |

**Per-repository confidence:**
```ts
repoConfidence = f(
  bytesOfCode,     // 0-30%
  commitCount,     // 0-25%
  repoAge,         // 0-15%
  stars + forks,   // 0-15%
  visibility,      // 0-10%
  lastCommitDate   // 0-5%
)
```

**Overall confidence:**
```ts
overallConfidence = average(repoConfidence for all active evidence)
```

### Long-Term (Architecture)

Move confidence computation to backend:
- Compute per-evidence confidence in `SkillEvidenceService.ingestEvidence()`
- Store computed confidence in `SkillEvidence` document
- Frontend simply displays pre-computed values
- Enables audit trail and recalculation

---

## 8. Impact Assessment

| Impact Area | Current State | Issue Severity |
|-------------|---------------|----------------|
| **User trust** | Users see "70% confidence" and assume quality measurement | Medium |
| **Decision making** | Users may over/under-estimate skill strength based on confidence | Medium |
| **Comparison** | All GitHub skills show identical confidence regardless of depth | Low |
| **Product credibility** | Sophisticated UI hides simplistic computation | Low |
| **Data integrity** | Confidence values are hardcoded, not computed | High (for engineering trust) |

---

## 9. Relation to BUG-004

BUG-004 identified that proficiency scores ignore repository depth metrics. This investigation identifies that confidence scores also ignore repository quality. Both issues stem from the same architectural decision:

**Evidence ingestion treats all source items as equivalent.**

- Proficiency: all GitHub repos contribute identical weight
- Confidence: all GitHub repos get identical confidence value

Both should be depth-adjusted for meaningful differentiation.

---

## 10. Recommendation

**Do not implement confidence changes until Proficiency Scoring Engine v2 is approved.**

Confidence and proficiency are coupled. Changing confidence without updating the proficiency formula would create further inconsistency.

**Immediate action (no code):**
1. Update UI label from "Confidence Score" to "Source Reliability"
2. Add tooltip: "This reflects the authority of the evidence source, not the quality of individual repositories"
3. Document that confidence values are hardcoded source defaults

**Future action (after design approval):**
1. Implement depth-weighted confidence per repository
2. Update proficiency formula to use quality-adjusted confidence
3. Rebuild all projections with new values

---

## 11. Conclusion

The confidence display is **technically correct but semantically misleading**. It shows the average of hardcoded source-default values, presenting them as a computed quality metric. This is consistent with the broader proficiency scoring issue identified in BUG-004: the system measures evidence presence, not skill quality.

**No code changes recommended.** This is a product-design issue awaiting the Proficiency Scoring Engine v2 proposal.
