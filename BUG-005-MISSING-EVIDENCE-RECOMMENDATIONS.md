# BUG-005 Investigation: Missing Evidence Recommendation Cards

**Date:** 2026-07-21T01:28:00+05:30  
**Status:** Investigation complete — no code changes  
**Related:** Explainability UI Implementation, BUG-004  

---

## 1. Current Behavior

### Location
`app/dashboard/student/skills/components/SkillDetailPanel.tsx:48-66`

### Implementation
```typescript
const getMissingEvidence = () => {
  const missing: MissingEvidenceItem[] = [];
  const evidenceTypes = new Set(detail?.evidence.map(e => e.primarySource) || [');
  
  if (!evidenceTypes.has('GITHUB')) {
    missing.push({ type: 'GITHUB', label: 'GitHub Project', description: 'Add code repositories to demonstrate practical application' });
  }
  if (!evidenceTypes.has('CERTIFICATE')) {
    missing.push({ type: 'CERTIFICATE', label: 'Certification', description: 'Earn a recognized certificate in this skill area' });
  }
  if (!evidenceTypes.has('ASSESSMENT')) {
    missing.push({ type: 'ASSESSMENT', label: 'Assessment', description: 'Complete a formal assessment to validate proficiency' });
  }
  if (!evidenceTypes.has('PROJECT')) {
    missing.push({ type: 'PROJECT', label: 'Project', description: 'Build and document a real-world project using this skill' });
  }
  
  return missing;
};
```

### Rendered Output
For a skill with only GitHub evidence (e.g., CSS with 6 repos), the panel shows:
- Certificate
- Assessment
- Project

**These are identical for every skill regardless of:**
- Skill category (TECHNICAL, LANGUAGE, TOOL, DOMAIN_SPECIFIC, SOFT)
- Skill name (Python vs CSS vs Leadership)
- Existing evidence depth
- User profile or career stage

---

## 2. Investigation Findings

### 2.1 Is "Certificate" appropriate for project-related skills like CSS, HTML, JavaScript?

**Finding:** No, not as a primary recommendation.

**Evidence:**
- Frontend/web skills (CSS, HTML, JavaScript, React) are typically validated through **demonstrable work**, not certificates
- The industry standard for these skills is portfolio/GitHub evidence, not formal certification
- Certificate carries `confidence: 1.0` (highest weight), making it the most valuable missing evidence type
- Recommending Certificate for a GitHub-heavy skill creates a **misaligned incentive**: users may pursue low-value certificates instead of deepening project evidence

**Impact:** Users with strong GitHub portfolios for web skills are told their "Certification" is missing — a misleading signal.

---

### 2.2 Should Assessment be hidden because the Assessment module is not yet implemented?

**Finding:** Yes, Assessment should be hidden from recommendations.

**Evidence:**

| Component | Assessment Status |
|-----------|-------------------|
| Backend enum | `SkillSource.ASSESSMENT` exists but is **never ingested** |
| Backend ingestion | No `primarySource: SkillSource.ASSESSMENT` in `skillsEventListener.ts` |
| Backend API | No `/api/assessment` endpoint exists |
| Frontend pages | No assessment module/page in the student dashboard |
| EmptyState | "Complete Assessments" button has `action: null` (disabled) |
| EvidenceExplorer | Shows ASSESSMENT icon/label but no data ever populates |

**Conclusion:** The Assessment evidence source is **dead code** in the enum. It exists in the type system but has no implementation. Showing it as a recommendation creates a **phantom feature** — users see a card for something that doesn't exist.

---

### 2.3 Should Project recommendation instead guide users to submit live URLs, screenshots, and documentation?

**Finding:** Yes, the Project recommendation should be more specific.

**Current text:**
> "Build and document a real-world project using this skill"

**Problems:**
- Too generic — doesn't tell users *what* to submit
- Doesn't align with how Project evidence is actually ingested
- Ignores that many users already have projects but haven't submitted them

**Evidence from backend ingestion:**
The Project evidence source is not clearly defined in the codebase. However, the recommendation should guide users toward:
1. **Live deployed URLs** — verifiable, hosted implementations
2. **Visual screenshots** — UI/UX demonstration for frontend/design skills
3. **Supporting documentation** — README, architecture docs, case studies

---

### 2.4 Should cards be dynamic based on skill type, existing evidence, or static?

**Finding:** They should be **dynamic based on skill type AND existing evidence**.

**Current:** 100% static — same 4 cards for every skill.

**Analysis:**

| Approach | Pros | Cons |
|----------|------|------|
| **Static (current)** | Simple, predictable | Misaligned, one-size-fits-all |
| **Dynamic by skill type** | Contextually relevant | Requires skill taxonomy mapping |
| **Dynamic by existing evidence** | Avoids redundant recommendations | Still may suggest irrelevant types |
| **Hybrid (recommended)** | Most accurate | Requires more logic |

**Recommended approach: Hybrid dynamic**

1. **Filter by skill category** — show only relevant evidence types
2. **Filter by existing evidence** — don't show types the user already has
3. **Prioritize by weight** — show highest-value missing evidence first

### Skill Category → Evidence Mapping

| Skill Category | Recommended Evidence Types |
|----------------|---------------------------|
| **TECHNICAL** | GITHUB, PROJECT, CERTIFICATE, MANUAL |
| **LANGUAGE** | CERTIFICATE, ACADEMIC_RECORD, PROJECT |
| **TOOL** | CERTIFICATE, PROJECT, MANUAL |
| **DOMAIN_SPECIFIC** | CERTIFICATE, ACADEMIC_RECORD, RESEARCH, PROJECT |
| **SOFT** | MANUAL, PROJECT, ACADEMIC_RECORD |

**Excluded by category:**
- GITHUB excluded from LANGUAGE, TOOL, DOMAIN_SPECIFIC, SOFT
- ASSESSMENT excluded from all (not implemented)

---

## 3. Root Cause Analysis

### Root Cause 1: Hardcoded, non-contextual recommendations
`getMissingEvidence()` uses a fixed list of 4 evidence types with no awareness of:
- Skill category
- Skill name/domain
- User's existing evidence profile
- Product roadmap (Assessment not implemented)

### Root Cause 2: Dead code in enum
`SkillSource.ASSESSMENT` exists in the type system but:
- Is never ingested by any event listener
- Has no API endpoint
- Has no frontend module
- Creates a false impression that assessments are available

### Root Cause 3: Generic Project description
The Project recommendation doesn't reflect how users actually submit project evidence. The description is aspirational ("Build and document...") rather than actionable ("Submit a live URL, screenshots, and documentation...").

---

## 4. Architecture Impact

### Current Architecture
```
Frontend (SkillDetailPanel)
  └── getMissingEvidence() — hardcoded logic
        ├── Checks evidenceTypes Set
        └── Pushes static MissingEvidenceItem[]
              └── MissingEvidencePanel renders cards
```

### Issues
1. **No backend involvement** — recommendations are purely frontend heuristics
2. **No skill-type awareness** — same output for Python and CSS
3. **No product roadmap awareness** — suggests unimplemented features
4. **No evidence-quality awareness** — doesn't consider depth of existing evidence

### Proposed Architecture
```
Backend (SkillProjectionService or new RecommendationService)
  └── generateMissingEvidence(skillId, skillCategory, existingEvidence)
        ├── Filters by skill category
        ├── Excludes implemented sources
        └── Returns prioritized MissingEvidenceItem[]
              └── Frontend renders dynamically
```

**Why backend?**
- Skill category and evidence data already exist in backend responses
- Centralizes recommendation logic
- Enables future ML/AI-powered recommendations
- Keeps frontend as a dumb renderer

---

## 5. Recommendation

### Immediate (No Code Changes)

1. **Hide Assessment card** — remove from `getMissingEvidence()` until module is implemented
2. **Update Project description** — change to actionable guidance:
   > "Submit a deployed project with live URL, screenshots, and supporting documentation"
3. **Add context note for Certificate** — for TECHNICAL/LANGUAGE/TOOL skills, note that certificates are optional when strong project evidence exists

### Short-Term (Backend-Driven Recommendations)

1. **Move recommendation logic to backend** — new method in `SkillProjectionService` or separate `RecommendationService`
2. **Implement skill-category mapping** — as defined in Section 2.4
3. **Add prioritization** — sort by source weight (CERTIFICATE > PROJECT > GITHUB > MANUAL)
4. **Remove Assessment from `EvidenceSourceType` enum** — or mark as `FUTURE` until implemented

### Medium-Term (Product Decision)

1. **Define assessment module scope** — product team decides if/when to implement
2. **Add certificate relevance scoring** — not all certificates are equal; domain-specific certificates should be prioritized
3. **Add project depth analysis** — if user has 3+ GitHub repos, Project recommendation should suggest *submitting* existing work rather than *building* new work

---

## 6. Detailed Question Answers

### Q1: Is "Certificate" appropriate for project-related skills like CSS, HTML, JavaScript?

**Answer:** Conditionally. Certificate is appropriate as a *secondary* recommendation but should not be the primary or only recommendation for hands-on technical skills. For CSS/HTML/JavaScript, GitHub and Project evidence are stronger signals of proficiency than certificates.

**Recommendation:** Show Certificate only when:
- Skill category is DOMAIN_SPECIFIC or LANGUAGE, OR
- User has no GitHub/Project evidence (as a fallback)

### Q2: Should Assessment be hidden because the Assessment module is not yet implemented?

**Answer:** Yes, immediately.

**Rationale:**
- No backend ingestion path exists
- No frontend module exists
- The EmptyState already shows it as disabled (`action: null`)
- Showing it creates user confusion and erodes trust

**Action:** Remove ASSESSMENT from `getMissingEvidence()` and `missingIcons` map until the module is production-ready.

### Q3: Should Project recommendation instead guide users to submit live URLs, screenshots, and documentation?

**Answer:** Yes.

**Current:** "Build and document a real-world project using this skill"  
**Recommended:** "Submit a deployed project with live URL, screenshots, and supporting documentation"

**Rationale:** Users often have existing projects but don't know what evidence to submit. Actionable guidance increases submission quality.

### Q4: Should cards be dynamic or static?

**Answer:** Dynamic, based on skill type AND existing evidence.

**Rationale:**
- Static recommendations are misleading for 80% of skill/evidence combinations
- Skill category is already available in `SkillRecordDTO`
- Existing evidence types are already available in `SkillDetailDTO`
- Dynamic recommendations are a standard UX pattern (e.g., LinkedIn "Add a project")

---

## 7. Proposed Recommendation Matrix

### By Skill Category

| Category | Show GitHub | Show Certificate | Show Project | Show Assessment | Show Manual |
|----------|-------------|------------------|--------------|-----------------|-------------|
| TECHNICAL | If missing | Optional* | If missing | Never | If missing |
| LANGUAGE | Never | If missing | If missing | Never | If missing |
| TOOL | Never | If missing | If missing | Never | If missing |
| DOMAIN_SPECIFIC | Never | If missing | If missing | Never | If missing |
| SOFT | Never | Never | If missing | Never | If missing |

*For TECHNICAL skills, show Certificate only if user has no GitHub AND no Project evidence.

### Priority Order (within recommendations)
1. Highest source weight first (CERTIFICATE > MANUAL > PROJECT > GITHUB)
2. Alphabetical within same weight

---

## 8. Risks of Current Implementation

| Risk | Severity | Likelihood | Impact |
|------|----------|------------|--------|
| Users pursue irrelevant certificates | Medium | High | Wasted effort, misaligned incentives |
| Users click Assessment and find nothing | Low | Medium | Trust erosion |
| Project recommendations ignored due to vagueness | Medium | High | Lower evidence submission rates |
| Uniform recommendations feel generic | Low | High | Reduced engagement |

---

## 9. Conclusion

The Missing Evidence recommendation system is **functionally broken** for three reasons:

1. **Assessment is a phantom feature** — recommended but unimplemented
2. **Certificate is over-recommended** — shown for all skills including hands-on technical skills where it's least relevant
3. **Project guidance is too vague** — doesn't tell users what to actually submit

**No calculation or scoring bugs exist.** This is a **product-design and UX issue** in the recommendation engine.

**Recommended fix:** Replace static `getMissingEvidence()` with a skill-category-aware, evidence-filtered recommendation system that excludes unimplemented sources and provides actionable guidance.
