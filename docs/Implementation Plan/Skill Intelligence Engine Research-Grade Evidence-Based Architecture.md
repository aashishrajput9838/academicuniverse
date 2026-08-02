# Skill Intelligence Engine: Research-Grade Evidence-Based Architecture

This document details the technical implementation plan for transforming the Skills Intelligence module from a single-source parser into an **explainable, scientific, multi-source Skill Intelligence Engine**. This engine serves as the core intelligence layer for Academic Universe and the foundational framework for **Paper 2: AI-Powered Student Holistic Growth Intelligence**.

---

## Architectural Vision & Layered Pipeline

The engine separates **evidence ingestion** from **skill inference**, allowing any past, present, or future evidence provider (GitHub, LeetCode, Certificates, Resumes, Ezone AU DIC, Research Papers) to feed into a single unified normalization pipeline:

```
[ GitHub API ]   [ LeetCode API ]   [ Ezone AU DIC ]   [ Resume / Papers ]
       │                │                  │                    │
       └────────────────┴────────┬─────────┴────────────────────┘
                                 │
                                 ▼
                 ┌───────────────────────────────┐
                 │ Evidence Normalization Layer  │ (Standardizes artifacts & confidence)
                 └───────────────┬───────────────┘
                                 │
                                 ▼
                 ┌───────────────────────────────┐
                 │   Skill Intelligence Engine   │ (Scoring, Taxonomy & Ontologies)
                 └───────────────┬───────────────┘
                                 │
                                 ▼
                 ┌───────────────────────────────┐
                 │   Growth Intelligence Engine  │ (Timeline, Skill Graph & Predictions)
                 └───────────────┬───────────────┘
                                 │
                                 ▼
                 ┌───────────────────────────────┐
                 │ Student Holistic Growth Profile│ (Student UI, Recruiter Summary, Paper 2 Data)
                 └───────────────────────────────┘
```

---

## User Review Required

> [!IMPORTANT]
> **Key Architectural Guarantees**:
> 1. **Zero Breaking Changes to OAuth**: The existing GitHub OAuth token exchange, security state, and callback endpoints (`githubOAuthController.ts`, `githubOAuthService.ts`) remain 100% untouched.
> 2. **Multi-Source Ready**: GitHub is treated as one adapter in an open `IEvidenceAdapter` contract. When LeetCode, AU DIC transcripts, or certificate parsers are connected in the future, zero changes to the core scoring model or Skill UI will be required.
> 3. **Mathematical Reproducibility**: All proficiency and confidence scores are calculated using documented deterministic formulas ($S \in [1, 100]$, $C \in [0.0, 1.0]$) so research paper peer reviewers can reproduce scores from raw evidence payloads.

---

## Open Questions

> [!NOTE]
> **Design Intent & Feedback**:
> - **Category Hierarchy**: Does the proposed 10-category taxonomy (Programming Languages, Frontend, Backend, Database, Cloud, DevOps, AI/ML, Data Science, Tools, Soft Skills) cover all current academic and industry domain requirements for your students?
> - **Recruiter View Access**: Should the Recruiter View toggle be available directly on each student's skill card or in a dedicated "Export Evidence Summary / Resume Proof" modal? (Defaulting to both).

---

## Proposed Changes

### Core Engine & Services

---

#### [NEW] [evidenceNormalizationLayer.ts](file:///c:/github/academicuniverse.com/academicuniverse/backend/src/services/evidenceNormalizationLayer.ts)
- Implement abstract `IEvidenceAdapter` interface:
  ```typescript
  export interface NormalizedEvidence {
    source: SkillSource; // GITHUB, LEETCODE, CERTIFICATE, AU_DIC, RESUME, PAPER
    sourceId: string;
    skillId: string;
    skillName: string;
    category: SkillCategory;
    subcategory?: string;
    timestamp: Date;
    volumeMetric: number; // e.g. bytes of code, commits, problem count, course credits
    recencyWeight: number; // exponential time decay [0.1, 1.0]
    payload: Record<string, any>;
    confidenceBonus: number;
  }
  ```
- Implement `GithubEvidenceAdapter` to transform raw repository payloads, commit histories, file extensions, and topic tags into standardized `NormalizedEvidence` objects.

#### [NEW] [skillsIntelligenceEngine.ts](file:///c:/github/academicuniverse.com/academicuniverse/backend/src/services/skillsIntelligenceEngine.ts)
- Implement the **Scientific Proficiency Scoring Engine**:
  $$S = \min\left(100, \left[ \sum_{i=1}^{N} \left( V_i \times R_i \times O_i \times D_i \right) \right] \times K_{\text{complexity}} \times 20\right)$$
  Where:
  - $V_i$: Normalized volume (code bytes / commit count scaling factor)
  - $R_i$: Recency decay ($e^{-\lambda \cdot t_{\text{months}}}$)
  - $O_i$: Ownership factor ($1.0$ for non-fork owned repos, $0.5$ for forks/contributions)
  - $D_i$: Language dominance ratio (e.g. 82% of repo codebase)
  - $K_{\text{complexity}}$: Multi-file / multi-framework project complexity multiplier ($1.0 - 1.5$)

- Implement the **Scientific Confidence Scoring Model**:
  $$C = \min\left(0.99, \log_{10}(E + 1) \times 0.35 + C_{\text{sources}} \times 0.25 + F_{\text{recency}} \times 0.20 + T_{\text{consistency}} \times 0.20\right)$$
  Where:
  - $E$: Evidence count (commits + file artifacts)
  - $C_{\text{sources}}$: Multi-provider verification ratio ($1$ provider = $0.5$, $2+$ providers = $1.0$)
  - $F_{\text{recency}}$: Activity within 90 days ($1.0$) vs older ($0.4$)
  - $T_{\text{consistency}}$: Language/framework topic consistency

- Implement the **Recruiter Explanation Synthesizer**: Generates natural language evidence justifications (e.g., *"Intermediate proficiency supported by 44 verified code artifacts across 12 repositories and 341 commits in the past 6 months (Confidence: 97%)"*).

#### [NEW] [skillGraphService.ts](file:///c:/github/academicuniverse.com/academicuniverse/backend/src/services/skillGraphService.ts)
- Implement Directed Acyclic Graph (DAG) relationship inference for skills:
  - Framework -> Language (e.g. `Next.js` -> `TypeScript`, `React`; `NestJS` -> `Node.js`, `TypeScript`)
  - Framework -> Database (e.g. `Express` + `Mongoose` -> `MongoDB`)
  - Framework -> DevOps (e.g. `Next.js` + `Dockerfile` -> `Docker`)
- Compute co-occurrence confidence scores for related skills.

---

### Backend Data Models & Shared Types

---

#### [MODIFY] [skills.enum.ts](file:///c:/github/academicuniverse.com/academicuniverse/backend/src/shared/enums/skills.enum.ts)
- Expand `SkillCategory` enum with hierarchical taxonomy:
  - `PROGRAMMING_LANGUAGES` = 'Programming Languages'
  - `FRONTEND` = 'Frontend Development'
  - `BACKEND` = 'Backend Development'
  - `DATABASE` = 'Database Systems'
  - `CLOUD` = 'Cloud Computing'
  - `DEVOPS` = 'DevOps & CI/CD'
  - `AI_ML` = 'AI & Machine Learning'
  - `DATA_SCIENCE` = 'Data Science & Analytics'
  - `TOOLS` = 'Developer Tools & Platforms'
  - `SOFT_SKILLS` = 'Soft Skills & Leadership'

#### [MODIFY] [SkillRecord.ts](file:///c:/github/academicuniverse.com/academicuniverse/backend/src/models/SkillRecord.ts)
- Add research metrics & timeline attributes:
  - `confidenceScore: number` (0.0 to 1.0)
  - `recruiterExplanation: string`
  - `relatedSkillIds: string[]`
  - `timelineData: Array<{ year: number; evidenceCount: number; proficiencyScore: number }>`
  - `evidenceSources: string[]` (e.g. `['github', 'ezone_auc', 'leetcode']`)

#### [MODIFY] [SkillEvidence.ts](file:///c:/github/academicuniverse.com/academicuniverse/backend/src/models/SkillEvidence.ts)
- Add file breakdown metrics:
  - `fileCount?: number`
  - `commitCount?: number`
  - `languageDominanceRatio?: number`
  - `detectedFrameworks?: string[]`

#### [MODIFY] [analyticsService.ts](file:///c:/github/academicuniverse.com/academicuniverse/backend/src/services/analyticsService.ts)
- Delegate skill processing to `skillsIntelligenceEngine` and `evidenceNormalizationLayer` to ensure research-grade scoring.

#### [MODIFY] [skillsController.ts](file:///c:/github/academicuniverse.com/academicuniverse/backend/src/controllers/skillsController.ts)
- Update endpoints to return confidence scores, timeline evolution data, skill relationship graphs, and recruiter explanation payloads.

---

### Student Frontend UI Components

---

#### [MODIFY] [skills.types.ts](file:///c:/github/academicuniverse.com/academicuniverse/app/dashboard/student/skills/types/skills.types.ts)
- Add `confidenceScore`, `recruiterExplanation`, `timelineData`, `relatedSkills`, and `multiSourceBreakdown` interfaces.

#### [MODIFY] [SkillCard.tsx](file:///c:/github/academicuniverse.com/academicuniverse/app/dashboard/student/skills/components/SkillCard.tsx)
- Render dual metric badges: **Proficiency Score (%)** and **Confidence Score (%)** with distinct color-coded indicators.
- Render category sub-badges according to the 10-category taxonomy.
- Add quick action button to open **Evidence Explorer** and **Recruiter View**.

#### [MODIFY] [EvidenceExplorer.tsx](file:///c:/github/academicuniverse.com/academicuniverse/app/dashboard/student/skills/components/EvidenceExplorer.tsx)
- Render comprehensive evidence breakdown:
  - Contributing Repositories list with commit count & bytes
  - File artifacts & language dominance breakdown (e.g. `82% TypeScript`)
  - Recency badge (e.g. `Active 3 days ago`)
  - Confidence calculation breakdown (Sample size + Recency + Topic consistency)

#### [MODIFY] [SkillTimeline.tsx](file:///c:/github/academicuniverse.com/academicuniverse/app/dashboard/student/skills/components/SkillTimeline.tsx)
- Render annual evolution chart (2023 - 2026) with volume growth bars, first seen date, last activity timestamp, and activity velocity.

#### [MODIFY] [RelatedSkillsPanel.tsx](file:///c:/github/academicuniverse.com/academicuniverse/app/dashboard/student/skills/components/RelatedSkillsPanel.tsx)
- Render inferential skill graph nodes linking related technologies (e.g. `Node.js` <-> `Express` <-> `MongoDB` <-> `TypeScript`).

#### [NEW] [RecruiterViewModal.tsx](file:///c:/github/academicuniverse.com/academicuniverse/app/dashboard/student/skills/components/RecruiterViewModal.tsx)
- Render recruiter-ready proof statement with copyable evidence summary, verified artifact counts, and audit verification badge.

---

## Verification Plan

### Automated Tests
- **Backend Unit Tests**:
  - `npx jest backend/src/services/__tests__/skillsIntelligenceEngine.test.ts` (Validates deterministic scoring, confidence calculation, and recruiter text synthesis).
  - `npx jest backend/src/services/__tests__/skillGraphService.test.ts` (Validates skill relationship graph DAG generation).
- **TypeScript Compilation**:
  - `npx tsc --noEmit` inside `backend/` directory.
- **Frontend Build**:
  - `npm run build` in root workspace.

### Manual & Research Verification
- Open Skills Intelligence dashboard as a student user (`john.doe@sharda.com`).
- Verify that skill cards display both **Proficiency (86%)** and **Confidence (97%)**.
- Click a skill card (e.g., `TypeScript`) to open **Evidence Explorer**:
  - Confirm repository list, commit counts, language dominance ratios, and recency timestamps are displayed accurately.
- Verify **Skill Timeline** (2023 - 2026 evolution bars).
- Verify **Related Skills Graph** (e.g. `Next.js` links to `React` and `TypeScript`).
- Open **Recruiter View Modal** and verify clear, scientific proof synthesis text.
