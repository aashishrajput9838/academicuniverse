# Product Design Backlog — Proficiency Scoring Engine v2

**Date:** 2026-07-21T00:33:01+05:30  
**Status:** Backlog — awaiting product team approval  
**Source:** BUG-004 investigation findings (closed as Not a Defect)  
**Owner:** Product / Design / Engineering  
**Backlog:** Product Design Backlog  

---

## Background

BUG-004 investigated the current proficiency calculation algorithm. The investigation concluded that the current implementation is **internally consistent but architecturally incomplete**. The algorithm measures evidence intensity, not skill proficiency. This proposal defines a path to a richer, more accurate model.

**BUG-004 Status:** CLOSED — Not a software defect. The current formula is mathematically correct; the issue is that the design does not incorporate repository depth metrics.

**Next Steps:** No engineering work until product team approves this design.

---

## 1. What Should Proficiency Actually Measure?

### Current Ambiguity

The word "proficiency" is overloaded. The current implementation measures **evidence intensity** — how much evidence exists, how recent it is, and how authoritative the source is. This is not the same as skill proficiency.

### Proposed Definition

**Skill Proficiency** = a normalized score (0–100) representing the learner's demonstrated capability in a specific skill domain, based on observable, verifiable evidence.

### Dimensions to Measure

| Dimension | Meaning | Example |
|-----------|---------|---------|
| **Breadth** | How many different contexts has the learner applied this skill? | 5 different GitHub repos using JavaScript |
| **Depth** | How complex/advanced is the work? | A 10,000-line production app vs. a 1-line script |
| **Quality** | How well-executed is the evidence? | Well-documented, tested, peer-reviewed code |
| **Activity** | How recently has the skill been exercised? | Commit within last 30 days vs. 2 years ago |
| **Experience** | How long has the learner been practicing? | First repo 3 years ago vs. 6 months ago |
| **Learning** | Is the skill growing or stagnant? | Increasing project complexity over time |

### Recommended Model

**Proficiency = f(Breadth, Depth, Quality, Activity) × SourceCredibility**

- **Breadth** = count of distinct evidence contexts (repos, certificates, projects)
- **Depth** = complexity/scale of each context (LOC, duration, scope)
- **Quality** = validation signals (stars, forks, certificate tier, assessment score)
- **Activity** = recency and frequency of engagement
- **SourceCredibility** = authority of the evidence source (certificate > GitHub > AI inference)

---

## 2. Which GitHub Metrics Should Influence Proficiency?

### Metrics We Should Use

| Metric | Weight | Rationale |
|--------|--------|-----------|
| **Repository count** | 20% | Breadth signal. More repos = more practice contexts. |
| **Bytes of code / LOC** | 25% | Depth signal. Larger repos indicate more complex work. |
| **Commit count / activity** | 15% | Activity signal. Recent commits show current engagement. |
| **Repository age + last pushed** | 15% | Experience + Activity. Long-lived, recently updated repos are strong. |
| **Topics / description richness** | 5% | Quality signal. Well-described repos show intentionality. |
| **Stars / forks / watchers** | 10% | Quality signal. Community validation. |
| **Primary language match confidence** | 5% | Certainty. Repo is primarily in the claimed language. |
| **Visibility (PUBLIC vs PRIVATE)** | 5% | Quality signal. PUBLIC repos suggest portfolio-ready work. |

### Metrics We Should NOT Use

| Metric | Reason |
|--------|--------|
| **Fork count alone** | Forks can be spam; not a reliable quality signal without context |
| **Issue count** | Negative signal if interpreted poorly; not clearly positive |
| **Pull request count** | Requires deeper GitHub API access; can be gamed |
| **License type** | Not clearly correlated with proficiency |
| **README length** | Can be templated; not a reliable quality proxy |
| **Watcher count** | Redundant with stars; lower signal-to-noise ratio |

---

## 3. Which Metrics Should NOT Influence Proficiency?

### Excluded Metrics

| Category | Metrics | Reason |
|----------|---------|--------|
| **Social vanity** | Followers, following, profile views | Not skill-specific |
| **Repository metadata** | Repo name length, default branch name, has wiki | No correlation with proficiency |
| **GitHub profile age** | Account creation date | Not skill-specific |
| **Organization membership** | Orgs joined | Can be incidental |
| **Event count** | Total events, diverse event types | Noise without context |

### Principle

**Only include metrics that are:** (a) directly observable from the evidence source, (b) correlated with skill capability, and (c) resistant to gaming.

---

## 4. How Should Different Evidence Sources Interact?

### Source Hierarchy

Not all evidence is equal. A certificate from a recognized authority should carry more weight than 100 trivial GitHub repos.

**Proposed hierarchy:**

| Tier | Source | Base Weight | Rationale |
|------|--------|-------------|-----------|
| **Tier 1** | Certificate / Certification | 1.0 | Formal validation by recognized authority |
| **Tier 2** | Academic Record | 0.9 | Institutional validation, structured curriculum |
| **Tier 3** | Manual / Verified Project | 0.95 | Curated, human-verified evidence |
| **Tier 4** | Research / Publication | 0.85 | Peer-reviewed or published work |
| **Tier 5** | Project (documented) | 0.8 | Real-world application with documentation |
| **Tier 6** | GitHub (repository) | 0.7 | Code evidence, self-reported, variable quality |
| **Tier 7** | AI Inference | 0.6 | Extracted by algorithm, lowest confidence |

### Interaction Model

**Independent accumulation:** Each evidence source contributes independently. A certificate doesn't replace GitHub evidence — it complements it.

```
proficiencyScore = weighted_average(all_evidence_weights)
```

Not:
```
proficiencyScore = max(source_scores)
```

And not:
```
proficiencyScore = source_priority_winner
```

### Source-Specific Adjustments

| Source | Special Rules |
|--------|---------------|
| **GitHub** | Depth-weighted by repo metrics (LOC, commits, stars) |
| **Certificate** | Tier-based multiplier (AWS > Udemy > unknown) |
| **Academic** | Grade-adjusted (A+ > A > B > C) |
| **Project** | Scope-adjusted (team project > solo tutorial) |
| **Research** | Impact-adjusted (journal tier, citation count) |
| **AI Inference** | Confidence-capped (never exceeds manual evidence weight) |

---

## 5. Should GitHub Alone Be Capable of Reaching EXPERT?

### Current Limitation

With the current formula, GitHub evidence maxes out at:
```
weight = 0.7 (confidence) × 0.7 (sourceWeight) × 1.0 (recency) = 0.49
score = 0.49 × 100 = 49 (INTERMEDIATE)
```

Even with infinite perfect GitHub evidence, a user cannot reach ADVANCED (51) or EXPERT (76) through GitHub alone.

### Arguments For Allowing GitHub-Only EXPERT

| Argument | Support |
|----------|---------|
| Some developers are self-taught and exceptional | ✅ Valid |
| GitHub is a valid proxy for real-world coding skill | ✅ Valid |
| Certificate gatekeeping is elitist | ✅ Valid |
| Open-source contributors often exceed formally educated peers | ✅ Valid |

### Arguments Against Allowing GitHub-Only EXPERT

| Argument | Support |
|----------|---------|
| GitHub evidence is self-reported and unverified | ✅ Valid |
| Repos can be cloned, forked, or minimal | ✅ Valid |
| No guarantee of understanding vs. copying | ✅ Valid |
| Certificates represent structured learning paths | ✅ Valid |
| Real-world hiring often values credentials for senior roles | ✅ Valid |

### Recommended Position

**Yes, GitHub alone should be capable of reaching EXPERT, but only with depth-weighted metrics.**

A user with:
- 20+ repositories
- Average 5,000+ LOC per repo
- Active commit history (last push < 30 days)
- Mix of PUBLIC and complex projects
- Stars/forks indicating community recognition

...should be able to reach EXPERT through GitHub evidence alone.

**Mechanism:** Increase effective source weight based on depth metrics:
```
effectiveGitHubWeight = baseWeight (0.7) × depthMultiplier (1.0 – 1.4)

depthMultiplier = f(averageLOC, commitCount, starCount, recency)
```

| Depth Tier | Criteria | Multiplier |
|------------|----------|------------|
| **Shallow** | < 1k LOC, < 5 commits | 0.5 × base |
| **Basic** | 1k-5k LOC, 5-20 commits | 0.75 × base |
| **Intermediate** | 5k-20k LOC, 20-100 commits | 1.0 × base |
| **Advanced** | 20k-100k LOC, 100-500 commits, some stars | 1.2 × base |
| **Expert** | 100k+ LOC, 500+ commits, significant stars/forks | 1.4 × base |

With multiplier 1.4:
```
weight = 0.7 × 1.4 × 1.0 = 0.98
score = 0.98 × 100 = 98 (EXPERT)
```

---

## 6. Should Repository Count Matter More Than Repository Quality?

### Answer: No. Quality should dominate, but breadth provides a floor.

### Problem with Count-Only

A user with 50 "Hello World" repos should NOT outrank a user with 3 production applications.

### Proposed Model

**Score = QualityAdjustedCount**

```
for each repository:
  repoScore = f(LOC, commits, stars, recency, visibility)
  
  // Diminishing returns for quantity
  breadthBonus = log(repoCount) × 5  // 1 repo = 0, 3 repos = ~7.5, 10 repos = ~11.5
  
totalDepth = sum(repoScore for all repos)
totalBreadth = breadthBonus

proficiency = (totalDepth × 0.7) + (totalBreadth × 0.3)
```

| Component | Weight | Rationale |
|-----------|--------|-----------|
| **Depth** | 70% | Quality and complexity of work |
| **Breadth** | 30% | Diversity of experience |

### Why 70/30?

- A single excellent project should beat 10 trivial projects
- But breadth still matters — a specialist with 1 repo is less proven than a generalist with 10 solid repos
- 70/30 rewards quality without completely ignoring quantity

---

## 7. What Mathematical Model Best Represents Our Product Goals?

### Current Model: Simple Weighted Average

```
score = average(confidence × sourceWeight × recency) × 100
```

**Pros:** Simple, deterministic, fast  
**Cons:** Ignores depth, treats all evidence equally, max score capped by source weight

### Proposed Model: Weighted Evidence Aggregation with Depth Adjustment

```
FOR each evidence item e:
  baseWeight = confidence(e) × sourceWeight(e) × recency(e)
  
  IF e.primarySource === GITHUB:
    depthFactor = computeDepthFactor(e)
    adjustedWeight = baseWeight × depthFactor
  ELSE:
    adjustedWeight = baseWeight
  
  weightedSum += adjustedWeight
  activeCount += 1

score = clamp(round((weightedSum / activeCount) × 100), 0, 100)
level = scoreToLevel(score)
```

### Depth Factor for GitHub

```
depthFactor(e) = f(
  bytesOfCode,       // 0-40% contribution
  commitCount,       // 0-20% contribution  
  contributionCount, // 0-15% contribution
  lastCommitDate,    // 0-15% contribution (recency within repo)
  repositoryVisibility, // 0-10% contribution
  starCount / forkCount  // 0-10% contribution (if available)
)

depthFactor range: 0.5 (shallow) to 1.5 (expert-level repo)
```

### Level Thresholds (Recommended Update)

Current thresholds may need adjustment if depth factors allow scores > 50 from GitHub alone:

| Level | Current Threshold | Recommended Threshold | Rationale |
|-------|------------------|----------------------|-----------|
| BEGINNER | < 26 | < 25 | Slightly lower to account for broader range |
| INTERMEDIATE | 26–50 | 25–50 | Unchanged |
| ADVANCED | 51–75 | 51–75 | Unchanged |
| EXPERT | 76–100 | 76–100 | Unchanged, but now achievable via GitHub |

### Alternative: Bayesian Updating Model

For future consideration, a Bayesian approach could model skill as a probability distribution updated by evidence:

```
prior = base_assumption (e.g., BEGINNER, score=20)
for each evidence item:
  likelihood = f(evidence_quality, source_credibility)
  posterior = bayesian_update(prior, likelihood)
  
score = expected_value(posterior)
```

**Not recommended for immediate implementation** — higher complexity, harder to explain to users, requires careful prior calibration.

---

## 8. Implementation Roadmap

### Phase 1: Design Finalization (No Code)

- [ ] Product team reviews and approves proficiency definition
- [ ] UX team defines how proficiency is displayed and explained to users
- [ ] Engineering validates that required GitHub metrics are available via API
- [ ] Define minimum viable depth factors

### Phase 2: Backend Changes

- [ ] Extend `SkillEvidence` model with computed depth fields (or compute on-the-fly)
- [ ] Update `SkillProjectionService.computeProficiency()` with depth adjustment
- [ ] Add `SkillProjectionSnapshot` model for historical tracking (separate from BUG-003)
- [ ] Update `skillsEventListener` to pass GitHub metrics to evidence service

### Phase 3: Frontend Changes

- [ ] Update `SkillCard` to display new score (if formula changes)
- [ ] Update `EvidenceExplorer` to show depth factors per repository
- [ ] Add proficiency explanation tooltip (shows breakdown by dimension)

### Phase 4: Migration

- [ ] Backfill depth factors for existing GitHub evidence
- [ ] Rebuild all `SkillRecord` projections
- [ ] A/B test old vs. new scores with user cohort

---

## 9. Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| **Score inflation** — users game the system with trivial repos | Implement minimum quality thresholds; cap breadth bonus |
| **Score deflation** — legitimate deep work scores lower than expected | Calibrate depth factors against known expert profiles |
| **User confusion** — scores change dramatically after update | Provide explanation UI; gradual rollout |
| **Performance** — depth calculation adds compute per evidence item | Cache depth factors; batch compute during projection rebuild |
| **GitHub API limits** — fetching stars/forks/commits per repo | Batch requests; cache in `GithubRecord`; fallback gracefully |

---

## 10. Open Questions for Product Team

1. Should proficiency be displayed as a single number or as a radar chart (Breadth/Depth/Quality/Activity)?
2. Should users be able to see which evidence contributed most to their score?
3. Should non-GitHub sources be depth-weighted as well (e.g., certificate tier, project scope)?
4. Should proficiency decay over time, or only update with new evidence?
5. Should we show a "max possible score" for each skill based on available evidence?
6. Should EXPERT level require multiple source types, or is single-source EXPERT acceptable?

---

## 11. Conclusion

The current proficiency algorithm is internally consistent but incomplete. It measures evidence intensity, not skill proficiency. This proposal defines a path to a richer, more accurate model that incorporates repository depth without sacrificing simplicity.

**No code changes are recommended until the product team approves this design.**
